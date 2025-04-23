import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    console.log("Server API: POST /api/words/bulk called")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    const body = await request.json()
    const { words } = body

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: "Invalid or empty words array" }, { status: 400 })
    }

    console.log(`Server API: Processing ${words.length} words in bulk`)

    let addedCount = 0
    let updatedCount = 0

    // ประมวลผลทีละคำ เพื่อตรวจสอบว่ามีคำซ้ำหรือไม่
    for (const word of words) {
      const { english, thai, level, sequence } = word

      if (!english || !thai || !level) {
        console.log(`Server API: Skipping invalid word: ${JSON.stringify(word)}`)
        continue
      }

      // ตรวจสอบว่ามีคำนี้อยู่แล้วหรือไม่
      const existingWord = await db.collection("words").findOne({ english })

      if (existingWord) {
        // อัปเดตคำที่มีอยู่แล้ว
        await db.collection("words").updateOne(
          { english },
          {
            $set: {
              thai,
              level,
              sequence: sequence || existingWord.sequence, // ใช้ลำดับใหม่ถ้ามี หรือใช้ลำดับเดิมถ้าไม่มี
              updatedAt: new Date(),
            },
          },
        )
        updatedCount++
      } else {
        // เพิ่มคำใหม่
        await db.collection("words").insertOne({
          english,
          thai,
          level,
          sequence, // เพิ่มลำดับเลขที่
          createdAt: new Date(),
        })
        addedCount++
      }
    }

    console.log(`Server API: Bulk processing complete. Added: ${addedCount}, Updated: ${updatedCount}`)

    return NextResponse.json({
      success: true,
      addedCount,
      updatedCount,
      totalProcessed: addedCount + updatedCount,
    })
  } catch (error) {
    console.error("Server API: Error processing bulk words:", error)
    return NextResponse.json({ error: "Failed to process bulk words" }, { status: 500 })
  }
}
