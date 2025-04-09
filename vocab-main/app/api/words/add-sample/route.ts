import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

// คำศัพท์ตัวอย่าง
const sampleWords = [
  { english: "book", thai: "หนังสือ", level: "a1" },
  { english: "house", thai: "บ้าน", level: "a1" },
  { english: "car", thai: "รถยนต์", level: "a1" },
  { english: "water", thai: "น้ำ", level: "a1" },
  { english: "food", thai: "อาหาร", level: "a1" },
  { english: "computer", thai: "คอมพิวเตอร์", level: "a2" },
  { english: "telephone", thai: "โทรศัพท์", level: "a1" },
  { english: "school", thai: "โรงเรียน", level: "a1" },
  { english: "friend", thai: "เพื่อน", level: "a1" },
  { english: "family", thai: "ครอบครัว", level: "a1" },
]

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ตรวจสอบสิทธิ์ admin
    const client = await clientPromise
    const db = client.db()
    const userEmail = session.user.email
    const user = await db.collection("users").findOne({ email: userEmail })

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // เพิ่มคำศัพท์ตัวอย่าง
    const result = await db.collection("words").insertMany(
      sampleWords.map((word) => ({
        ...word,
        createdAt: new Date(),
      })),
    )

    console.log("Server API: Added sample words:", result.insertedCount)

    return NextResponse.json({
      success: true,
      message: `เพิ่มคำศัพท์ตัวอย่าง ${result.insertedCount} คำเรียบร้อยแล้ว`,
      insertedCount: result.insertedCount,
    })
  } catch (error) {
    console.error("Server API: Error adding sample words:", error)
    return NextResponse.json(
      {
        error: "Failed to add sample words",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
