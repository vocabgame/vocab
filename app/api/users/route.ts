import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    console.log("Server API: GET /api/users called")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ตรวจสอบสิทธิ์ admin
    const client = await clientPromise
    const db = client.db()
    const userEmail = session.user?.email
    const user = await db.collection("users").findOne({ email: userEmail })

    if (!user || user.role !== "admin") {
      console.log("Server API: Unauthorized access attempt - not admin", userEmail)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ดึงข้อมูลผู้ใช้ทั้งหมด
    const users = await db.collection("users").find({}).toArray()

    // แปลง ObjectId เป็น string
    const serializedUsers = JSON.parse(JSON.stringify(users))

    return NextResponse.json(serializedUsers)
  } catch (error) {
    console.error("Server API: Error fetching users:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
