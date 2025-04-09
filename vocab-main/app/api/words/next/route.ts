import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getNextWord, getNextWords, getAllWordsInStage } from "@/lib/words"
import { getUserProgress } from "@/lib/user-progress"

// เพิ่ม cache headers เพื่อให้การตอบสนองเร็วขึ้น
export const dynamic = 'force-dynamic'; // ไม่ใช้ static cache ของ Next.js

export async function POST(request: Request) {
  try {
    // ใช้ AbortSignal เพื่อกำหนดเวลาหมดเวลาสำหรับการร้องขอ
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 วินาที

    try {
      const session = await getServerSession(authOptions)

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const body = await request.json()
      const { userId, currentWordId, prefetchCount = 1 } = body

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

      // ถ้าต้องการโหลดคำศัพท์หลายคำ
      let result;

      // ถ้าต้องการโหลดคำศัพท์ทั้งหมดในด่าน (100 คำ)
      if (prefetchCount >= 100) {
        console.log(`Loading all words in stage for user ${userId}`);
        // ดึงข้อมูลความคืบหน้าของผู้ใช้
        const progress = await getUserProgress(userId);
        // โหลดคำศัพท์ทั้งหมดในด่าน
        result = await getAllWordsInStage(userId, progress.currentLevel, progress.currentStage);
        console.log(`Loaded ${result.totalWords} words (${result.uncompletedCount} uncompleted, ${result.completedCount} completed)`);
      } else if (prefetchCount > 1) {
        // โหลดคำศัพท์หลายคำพร้อมกัน
        result = await getNextWords(userId, currentWordId, prefetchCount);
      } else {
        // โหลดคำศัพท์เดียว
        result = await getNextWord(userId, currentWordId);
      }

      // ดึงข้อมูลความคืบหน้าหลังเรียกใช้ getNextWord
      const newProgress = await getUserProgress(userId)
      const newLevel = newProgress.currentLevel
      const newStage = newProgress.currentStage || 1

      // ตรวจสอบว่ามีการเปลี่ยนระดับหรือด่านหรือไม่
      const levelComplete = oldLevel !== newLevel
      const stageComplete = !levelComplete && oldStage !== newStage

      // ยกเลิกการตั้งเวลา
      clearTimeout(timeoutId);

      // ส่งข้อมูลกลับไปยังไคลเอนต์ พร้อมกับ headers ที่เหมาะสม
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
      // ยกเลิกการตั้งเวลาถ้ายังไม่ถูกยกเลิก
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // ตรวจสอบว่าเป็นการยกเลิกโดย AbortController หรือไม่
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
