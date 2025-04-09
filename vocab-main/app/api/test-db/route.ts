import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    console.log("Testing MongoDB connection...")
    const client = await clientPromise
    const db = client.db()

    // ทดสอบการเชื่อมต่อโดยการดึงข้อมูลคอลเลกชัน
    const collections = await db.listCollections().toArray()
    console.log(
      "MongoDB collections:",
      collections.map((c) => c.name),
    )

    return NextResponse.json({
      status: "success",
      message: "MongoDB connection successful",
      collections: collections.map((c) => c.name),
    })
  } catch (error) {
    console.error("MongoDB connection test failed:", error)
    return NextResponse.json(
      {
        status: "error",
        message: "MongoDB connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
