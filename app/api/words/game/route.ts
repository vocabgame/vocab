import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getUserProgress } from "@/lib/user-progress"

// ปิด static caching ของ Next.js
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    // ตรวจสอบว่า user ขอข้อมูลของตัวเองเท่านั้น
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ดึงความคืบหน้าของผู้ใช้
    const progress = await getUserProgress(userId)
    const completedWordIds = progress.completedWords.map((id: string) => {
      try {
        return id.length === 24 ? new ObjectId(id) : id
      } catch (e) {
        return id
      }
    })

    const client = await clientPromise
    const db = client.db()

    // ดึงคำศัพท์ที่ยังไม่ได้เรียนในระดับปัจจุบัน
    let words = await db.collection("words")
      .find({ 
        level: progress.currentLevel,
        _id: { $nin: completedWordIds }
      })
      .sort({ _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    // ถ้าไม่มีคำศัพท์ในระดับปัจจุบัน ให้ลองดูระดับถัดไป
    if (words.length === 0) {
      const levels = ["a1", "a2", "b1", "b2", "c1", "c2"]
      const currentIndex = levels.indexOf(progress.currentLevel)

      if (currentIndex < levels.length - 1) {
        const nextLevel = levels[currentIndex + 1]
        
        // ดึงคำศัพท์จากระดับถัดไป
        words = await db.collection("words")
          .find({ 
            level: nextLevel,
            _id: { $nin: completedWordIds }
          })
          .sort({ _id: 1 })
          .limit(limit)
          .toArray()
          
        // อัพเดตระดับและด่านปัจจุบันของผู้ใช้
        if (words.length > 0) {
          await db.collection("progress").updateOne(
            { userId }, 
            { $set: { currentLevel: nextLevel, currentStage: 1 } }
          )
          
          // อัพเดตความคืบหน้า
          progress.currentLevel = nextLevel
          progress.currentStage = 1
        }
      }
    }

    // ถ้ายังไม่มีคำศัพท์ ให้ลองดึงคำศัพท์ที่เคยเรียนไปแล้ว (เพื่อทบทวน)
    if (words.length === 0 && completedWordIds.length > 0) {
      words = await db.collection("words")
        .aggregate([
          { $match: { _id: { $in: completedWordIds.slice(0, 50) } } },
          { $sample: { size: Math.min(limit, 20) } }
        ])
        .toArray()
    }

    // สร้างตัวเลือกสำหรับแต่ละคำ
    const wordsWithChoices = []
    for (const word of words) {
      const choices = await generateChoicesForWord(word, db)
      wordsWithChoices.push({ 
        word, 
        choices,
        completed: completedWordIds.some(id => 
          id.toString() === word._id.toString() || 
          id === word._id.toString()
        )
      })
    }

    // นับจำนวนคำศัพท์ทั้งหมดที่ยังไม่ได้เรียนในระดับปัจจุบัน
    const totalUncompletedWords = await db.collection("words").countDocuments({
      level: progress.currentLevel,
      _id: { $nin: completedWordIds }
    })

    // แปลง ObjectId เป็น string สำหรับ client
    const serializedWords = JSON.parse(JSON.stringify(wordsWithChoices))

    return NextResponse.json({
      words: serializedWords,
      page,
      totalUncompletedWords,
      progress,
      hasMore: words.length === limit,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0',
      }
    })
  } catch (error) {
    console.error("Error fetching game words:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch game words",
        details: error instanceof Error ? error.message : "Unknown error",
      }, 
      { status: 500 }
    )
  }
}

// ฟังก์ชันสร้างตัวเลือกสำหรับคำศัพท์
async function generateChoicesForWord(word: any, db: any) {
  // ดึงตัวเลือกอื่นๆ สำหรับคำนี้
  const otherChoices = await db
    .collection("words")
    .aggregate([
      { $match: { _id: { $ne: word._id }, thai: { $ne: word.thai } } },
      { $project: { thai: 1 } },
      { $sample: { size: 5 } },
    ])
    .toArray()

  // กรองเอาเฉพาะคำที่ไม่ซ้ำกัน
  const uniqueChoices = []
  const usedTranslations = new Set([word.thai])

  // เลือกคำที่ไม่ซ้ำกันมา 3 คำ
  for (const otherWord of otherChoices) {
    if (!usedTranslations.has(otherWord.thai)) {
      uniqueChoices.push(otherWord.thai)
      usedTranslations.add(otherWord.thai)
      if (uniqueChoices.length >= 3) break
    }
  }

  // ถ้าไม่ครบ 3 คำ ให้สร้างคำแปลสุ่มเพิ่ม
  while (uniqueChoices.length < 3) {
    const fakeTranslation = `ตัวเลือก ${uniqueChoices.length + 1}`
    if (!usedTranslations.has(fakeTranslation)) {
      uniqueChoices.push(fakeTranslation)
      usedTranslations.add(fakeTranslation)
    }
  }

  // สร้างตัวเลือกและสับเปลี่ยน
  const choices = [word.thai, ...uniqueChoices]

  // สับเปลี่ยนตัวเลือก
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}
