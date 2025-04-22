import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getNextWord, getNextWords, getAllWordsInStage } from "@/lib/words"
import { getUserProgress } from "@/lib/user-progress"

// ปิด static caching ของ Next.js
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // timeout 5 วินาที

    try {
      const session = await getServerSession(authOptions)

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const body = await request.json()
      const { userId, currentWordId, prefetchCount = 1, level, stage } = body

      if (!userId || !currentWordId) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      // ตรวจสอบว่า user ขอข้อมูลของตัวเองเท่านั้น
      if (userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      // ดึงข้อมูลความคืบหน้าก่อนโหลดคำ
      const oldProgress = await getUserProgress(userId)

      // ใช้ค่าจาก parameters ถ้ามี ไม่เช่นนั้นใช้จาก progress
      const oldLevel = level || oldProgress.currentLevel
      const oldStage = stage ? parseInt(String(stage)) : (oldProgress.currentStage || 1)

      console.log(`Loading next words for level: ${oldLevel}, stage: ${oldStage}`)

      let result;

      // ถ้าขอโหลดคำศัพท์ทั้งด่าน (100 คำ)
      if (prefetchCount >= 100) {
        console.log(`Loading all words in stage for user ${userId}`);
        result = await getAllWordsInStage(userId, oldLevel, oldStage);
        console.log(`Loaded ${result.totalWords} words (${result.uncompletedCount} uncompleted, ${result.completedCount} completed)`);
      } else if (prefetchCount > 1) {
        result = await getNextWords(userId, currentWordId, prefetchCount, oldLevel, oldStage)
      } else {
        result = await getNextWord(userId, currentWordId, oldLevel, oldStage)
      }

      const newProgress = await getUserProgress(userId)
      const newLevel = newProgress.currentLevel
      const newStage = newProgress.currentStage || 1

      const levelComplete = oldLevel !== newLevel
      const stageComplete = !levelComplete && oldStage !== newStage

      clearTimeout(timeoutId)

      return new NextResponse(JSON.stringify({
        ...result,
        progress: newProgress,
        levelComplete,
        stageComplete,
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0',
        }
      })
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Request was aborted due to timeout');
      return NextResponse.json({ error: "Request timeout" }, { status: 408 })
    }

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
