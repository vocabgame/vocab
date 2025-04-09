import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    console.log("Server API: POST /api/progress/reset called")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const client = await clientPromise
    const db = client.db()

    // ลบข้อมูลความคืบหน้าเดิม
    await db.collection("progress").deleteOne({ userId })

    // สร้างข้อมูลความคืบหน้าใหม่
    const newProgress = {
      userId,
      currentLevel: "a1", // เริ่มต้นที่ระดับ A1
      completedWords: [],
      levelProgress: {
        a1: 0,
        a2: 0,
        b1: 0,
        b2: 0,
        c1: 0,
        c2: 0,
      },
    }

    await db.collection("progress").insertOne(newProgress)

    console.log(`Server API: Reset progress for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: "รีเซตความคืบหน้าเรียบร้อยแล้ว",
    })
  } catch (error) {
    console.error("Server API: Error resetting progress:", error)
    return NextResponse.json({ error: "Failed to reset progress" }, { status: 500 })
  }
}
