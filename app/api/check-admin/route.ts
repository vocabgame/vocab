import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const userEmail = session.user.email

    console.log("Server Checking admin status for user:", userId, "email:", userEmail)

    const client = await clientPromise
    const db = client.db()

    // ตรวจสอบจำนวน admin ในระบบ
    const adminCount = await db.collection("users").countDocuments({ role: "admin" })
    console.log("Server Admin count:", adminCount)

    // ค้นหาผู้ใช้ด้วย email
    const user = await db.collection("users").findOne({ email: userEmail })

    if (!user) {
      console.log("Server User not found by email")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("Server Found user:", user._id, "role:", user.role)

    return NextResponse.json({
      isAdmin: user.role === "admin",
      adminCount: adminCount,
      userId: userId,
      userEmail: userEmail,
      userRole: user.role || "none",
    })
  } catch (error) {
    console.error("Server Error checking admin status:", error)
    return NextResponse.json(
      {
        error: "Failed to check admin status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
