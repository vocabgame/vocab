import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function DELETE(request: Request) {
  try {
    console.log("Server API: DELETE /api/words/clear-all called")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const client = await clientPromise
    const db = client.db()

    // ลบคำศัพท์ทั้งหมด
    const result = await db.collection("words").deleteMany({})

    console.log(`Server API: Deleted ${result.deletedCount} words`)

    return NextResponse.json({
      success: true,
      message: `ลบคำศัพท์ทั้งหมด ${result.deletedCount} คำเรียบร้อยแล้ว`,
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    console.error("Server API: Error clearing all words:", error)
    return NextResponse.json({ error: "Failed to clear all words" }, { status: 500 })
  }
}
