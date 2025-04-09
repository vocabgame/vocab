import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getWordsForStage } from "@/lib/words"
import { getUserProgress } from "@/lib/user-progress"

// เพิ่ม cache headers เพื่อให้การตอบสนองเร็วขึ้น
export const dynamic = 'force-dynamic'; // ไม่ใช้ static cache ของ Next.js

export async function POST(request: Request) {
  try {
    // ใช้ AbortSignal เพื่อกำหนดเวลาหมดเวลาสำหรับการร้องขอ
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 วินาที

    try {
      const session = await getServerSession(authOptions)

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      const body = await request.json()
      const { userId, level, stage } = body

      if (!userId || !level || !stage) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
      }

      // Verify the user is requesting their own data
      if (userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      // ดึงข้อมูลความคืบหน้าของผู้ใช้
      const progress = await getUserProgress(userId)
      
      // ดึงคำศัพท์ทั้งหมดของด่าน
      const words = await getWordsForStage(level, parseInt(stage), progress.completedWords)

      // ยกเลิกการตั้งเวลา
      clearTimeout(timeoutId);

      // ส่งข้อมูลกลับไปยังไคลเอนต์ พร้อมกับ headers ที่เหมาะสม
      return new NextResponse(JSON.stringify({
        success: true,
        words,
        progress,
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
    
    console.error("Error getting words for stage:", error)
    return NextResponse.json(
      {
        error: "Failed to get words for stage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
