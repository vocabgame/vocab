import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getNextWord } from "@/lib/words"
import { getUserProgress } from "@/lib/user-progress"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, currentWordId } = body

    if (!userId || !currentWordId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the user is requesting their own data
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ดึงข้อมูลความคืบหน้าก่อนเรียกใช้ getNextWord
    const oldProgress = await getUserProgress(userId)
    const oldLevel = oldProgress.currentLevel
    const oldStage = oldProgress.currentStage || 1

    const result = await getNextWord(userId, currentWordId)

    // ดึงข้อมูลความคืบหน้าหลังเรียกใช้ getNextWord
    const newProgress = await getUserProgress(userId)
    const newLevel = newProgress.currentLevel
    const newStage = newProgress.currentStage || 1

    // ตรวจสอบว่ามีการเปลี่ยนระดับหรือด่านหรือไม่
    const levelComplete = oldLevel !== newLevel
    const stageComplete = !levelComplete && oldStage !== newStage

    // ส่งข้อมูลกลับไปยังไคลเอนต์
    return NextResponse.json({
      ...result,
      progress: newProgress,
      levelComplete,
      stageComplete,
    })
  } catch (error) {
    console.error("Error getting next word:", error)
    return NextResponse.json(
      {
        error: "Failed to get next word",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
