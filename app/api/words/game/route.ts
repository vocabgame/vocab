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
    // Get level and stage from query parameters if provided
    const requestedLevel = searchParams.get("level")
    const requestedStage = searchParams.get("stage") ? Number.parseInt(searchParams.get("stage") || "1") : null

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    // ตรวจสอบว่า user ขอข้อมูลของตัวเองเท่านั้น
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ดึงความคืบหน้าของผู้ใช้
    const progress = await getUserProgress(userId)

    // Use requested level and stage if provided, otherwise use user's current progress
    const currentLevel = requestedLevel || progress.currentLevel
    const currentStage = requestedStage || progress.currentStage

    const client = await clientPromise
    const db = client.db()

    // ถ้ามีการระบุระดับหรือด่านใน URL ให้บันทึกลงใน progress ของผู้ใช้
    if (requestedLevel || requestedStage) {
      console.log(`Updating user progress with requested level: ${requestedLevel}, stage: ${requestedStage}`)
      await db.collection("progress").updateOne(
        { userId },
        { $set: {
          currentLevel: requestedLevel || progress.currentLevel,
          currentStage: requestedStage || progress.currentStage
        }}
      )

      // อัพเดต progress ในหน่วยความจำด้วย
      if (requestedLevel) progress.currentLevel = requestedLevel;
      if (requestedStage) progress.currentStage = requestedStage;
    }

    console.log(`Fetching words for level: ${currentLevel}, stage: ${currentStage}, page: ${page}`)

    const completedWordIds = progress.completedWords.map((id: string) => {
      try {
        return id.length === 24 ? new ObjectId(id) : id
      } catch (e) {
        return id
      }
    })

    // ไม่ต้องสร้าง client และ db ใหม่ เพราะสร้างไปแล้วด้านบน

    // คำนวณช่วง sequence ในด่านที่เลือก
    const WORDS_PER_STAGE = 100
    const startSequence = (currentStage - 1) * WORDS_PER_STAGE + 1
    const endSequence = currentStage * WORDS_PER_STAGE

    console.log(`Calculating word range for level: ${currentLevel}, stage: ${currentStage}`);
    console.log(`Sequence range: startSequence=${startSequence}, endSequence=${endSequence}`);

    // ตรวจสอบว่ามีการระบุระดับหรือไม่
    if (!currentLevel) {
      console.error(`Missing level parameter. Using default level: a1`);
      currentLevel = "a1";
    }

    console.log(`Fetching words with strict level filter: ${currentLevel}`);

    // ดึงคำศัพท์ทั้งหมดในระดับและด่านที่ต้องการโดยใช้ sequence
    const wordsInStage = await db.collection("words")
      .find({
        level: currentLevel,
        sequence: { $gte: startSequence, $lte: endSequence }
      })
      .sort({ sequence: 1 })
      .toArray()

    console.log(`Found ${wordsInStage.length} words in stage ${currentStage} of level ${currentLevel}`);

    // ตรวจสอบว่ามีคำศัพท์ในด่านที่เลือกหรือไม่
    if (wordsInStage.length === 0) {
      console.warn(`No words found in stage ${currentStage} of level ${currentLevel}. Please check the database.`);
      return NextResponse.json({
        words: [],
        page,
        totalUncompletedWords: 0,
        progress,
        level: currentLevel,
        stage: currentStage,
        hasMore: false,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        }
      });
    }

    // กรองคำศัพท์ที่ยังไม่ได้เรียน
    const uncompletedWordsInStage = wordsInStage.filter(word =>
      !completedWordIds.some(id =>
        id.toString() === word._id.toString() ||
        id === word._id.toString()
      )
    )

    console.log(`Found ${uncompletedWordsInStage.length} uncompleted words in stage ${currentStage} of level ${currentLevel}`);

    // แสดงข้อมูลคำศัพท์ที่พบ
    if (uncompletedWordsInStage.length > 0) {
      console.log(`First 3 uncompleted words in stage ${currentStage} of level ${currentLevel}:`);
      uncompletedWordsInStage.slice(0, 3).forEach((word, index) => {
        console.log(`Word ${index + 1}: ${word.english}, level: ${word.level}`);
      });
    }

    // ดึงคำศัพท์ตามจำนวนที่ต้องการ (pagination)
    let words = uncompletedWordsInStage
      .slice((page - 1) * limit, page * limit)

    // ถ้าไม่มีคำศัพท์ในด่านปัจจุบัน ให้ลองดูด่านถัดไปในระดับเดียวกัน
    if (words.length === 0 && !requestedStage) {
      const nextStage = currentStage + 1

      // ตรวจสอบว่ามีคำศัพท์ในด่านถัดไปหรือไม่
      const nextStageStartSequence = (nextStage - 1) * WORDS_PER_STAGE + 1
      const nextStageEndSequence = nextStage * WORDS_PER_STAGE

      // ดึงคำศัพท์ในด่านถัดไปโดยใช้ sequence
      const wordsInNextStage = await db.collection("words")
        .find({
          level: currentLevel,
          sequence: { $gte: nextStageStartSequence, $lte: nextStageEndSequence }
        })
        .sort({ sequence: 1 })
        .toArray()

      if (wordsInNextStage.length > 0) {
        console.log(`No words in current stage, trying next stage ${nextStage}`)

        // กรองคำศัพท์ที่ยังไม่ได้เรียนในด่านถัดไป
        const uncompletedWordsInNextStage = wordsInNextStage.filter(word =>
          !completedWordIds.some(id =>
            id.toString() === word._id.toString() ||
            id === word._id.toString()
          )
        )

        words = uncompletedWordsInNextStage.slice(0, limit)

        // อัพเดตด่านปัจจุบันของผู้ใช้ (เฉพาะเมื่อไม่ได้ระบุด่านเฉพาะเจาะจง)
        if (words.length > 0) {
          await db.collection("progress").updateOne(
            { userId },
            { $set: { currentStage: nextStage } }
          )

          // อัพเดตความคืบหน้า
          progress.currentStage = nextStage
        }
      } else {
        // ถ้าไม่มีคำศัพท์ในด่านถัดไป ให้ลองดูระดับถัดไป
        const levels = ["a1", "a2", "b1", "b2", "c1", "c2"]
        const levelIndex = levels.indexOf(currentLevel)

        if (levelIndex < levels.length - 1) {
          const nextLevel = levels[levelIndex + 1]
          console.log(`No words in current level, trying next level ${nextLevel}`)

          // ดึงคำศัพท์จากระดับถัดไป (ด่าน 1) โดยใช้ sequence
          const nextLevelStartSequence = 1
          const nextLevelEndSequence = WORDS_PER_STAGE

          const nextLevelWords = await db.collection("words")
            .find({
              level: nextLevel,
              sequence: { $gte: nextLevelStartSequence, $lte: nextLevelEndSequence },
              _id: { $nin: completedWordIds }
            })
            .sort({ sequence: 1 })
            .limit(limit)
            .toArray()

          // อัพเดตระดับและด่านปัจจุบันของผู้ใช้
          if (nextLevelWords.length > 0) {
            await db.collection("progress").updateOne(
              { userId },
              { $set: { currentLevel: nextLevel, currentStage: 1 } }
            )

            // อัพเดตความคืบหน้า
            progress.currentLevel = nextLevel
            progress.currentStage = 1

            words = nextLevelWords
          }
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

    // นับจำนวนคำศัพท์ทั้งหมดที่ยังไม่ได้เรียนในด่านปัจจุบัน
    const totalUncompletedWords = uncompletedWordsInStage.length

    // แปลง ObjectId เป็น string สำหรับ client
    const serializedWords = JSON.parse(JSON.stringify(wordsWithChoices))

    return NextResponse.json({
      words: serializedWords,
      page,
      totalUncompletedWords,
      progress,
      level: currentLevel,
      stage: currentStage,
      hasMore: (page * limit) < uncompletedWordsInStage.length,
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
