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

    console.log("Server Making admin for user:", userId, "email:", userEmail)

    const client = await clientPromise
    const db = client.db()

    // ค้นหาผู้ใช้ด้วย email (วิธีที่น่าจะเชื่อถือได้มากกว่า)
    const user = await db.collection("users").findOne({ email: userEmail })

    if (!user) {
      console.log("Server User not found by email")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("Server Found user:", user._id)

    // ทำให้ผู้ใช้ปัจจุบันเป็น admin
    const result = await db.collection("users").updateOne({ _id: user._id }, { $set: { role: "admin" } })

    console.log(
      "Server Update result:",
      result.matchedCount,
      "documents matched,",
      result.modifiedCount,
      "documents modified",
    )

    if (result.modifiedCount === 0) {
      return NextResponse.json({
        warning: "No changes made. User might already be an admin or user not found.",
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      })
    }

    return NextResponse.json({
      success: true,
      message: "User has been made admin",
      userId: userId,
      userEmail: userEmail,
    })
  } catch (error) {
    console.error("Server Error making user admin:", error)
    return NextResponse.json(
      {
        error: "Failed to make user admin",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
