import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    console.log("Server API: POST /api/progress/reset-level called")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const body = await request.json()
    const { level } = body

    console.log("Server API: Reset level request for user:", userId, "level:", level)

    if (!level) {
      return NextResponse.json({ error: "Level is required" }, { status: 400 })
    }

    // ดึงข้อมูลความคืบหน้าปัจจุบัน
    const client = await clientPromise
    const db = client.db()

    const currentProgress = await db.collection("progress").findOne({ userId })

    if (!currentProgress) {
      console.log("Server API: No progress found for user:", userId)
      return NextResponse.json({ error: "No progress found for user" }, { status: 404 })
    }

    console.log("Server API: Current progress:", currentProgress)

    // ดึงคำศัพท์ในระดับที่ต้องการรีเซต
    const wordsInLevel = await db.collection("words").find({ level }).toArray()
    const wordIdsInLevel = wordsInLevel.map((word) => word._id.toString())

    console.log("Server API: Found", wordIdsInLevel.length, "words in level", level)

    // ลบคำศัพท์ในระดับนี้ออกจาก completedWords
    const updatedCompletedWords = currentProgress.completedWords.filter(
      (wordId: string) => !wordIdsInLevel.includes(wordId),
    )

    // สร้าง stageProgress ใหม่สำหรับระดับนี้
    const updatedStageProgress = { ...currentProgress.stageProgress }
    updatedStageProgress[level] = {}

    // อัพเดตความคืบหน้า
    const updatedProgress = {
      ...currentProgress,
      completedWords: updatedCompletedWords,
      levelProgress: {
        ...currentProgress.levelProgress,
        [level]: 0, // รีเซตความคืบหน้าของระดับนี้เป็น 0
      },
      stageProgress: updatedStageProgress,
      currentStage: level === currentProgress.currentLevel ? 1 : currentProgress.currentStage, // รีเซตด่านเป็น 1 ถ้าเป็นระดับปัจจุบัน
    }

    console.log("Server API: Updating progress for user:", userId)

    const result = await db.collection("progress").updateOne({ userId }, { $set: updatedProgress })

    console.log("Server API: Update result:", result.matchedCount, "matched,", result.modifiedCount, "modified")

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Failed to update progress - no matching document" }, { status: 500 })
    }

    // ดึงข้อมูลความคืบหน้าล่าสุดหลังจากอัพเดต
    const finalProgress = await db.collection("progress").findOne({ userId })

    console.log("Server API: Reset level completed successfully")

    return NextResponse.json({
      success: true,
      message: `รีเซตความคืบหน้าของระดับ ${level.toUpperCase()} เรียบร้อยแล้ว`,
      progress: finalProgress,
    })
  } catch (error) {
    console.error("Server API: Error resetting level progress:", error)
    return NextResponse.json(
      {
        error: "Failed to reset level progress",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
