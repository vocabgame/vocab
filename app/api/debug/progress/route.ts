import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get userId from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    // Only allow users to view their own progress unless they're an admin
    if (userId !== session.user.id) {
      // Check if user is admin
      const client = await clientPromise
      const db = client.db()
      const userEmail = session.user.email
      const user = await db.collection("users").findOne({ email: userEmail })

      if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Get user progress
    const client = await clientPromise
    const db = client.db()
    const progress = await db.collection("progress").findOne({ userId })

    if (!progress) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 })
    }

    // Return progress data
    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error in debug progress API:", error)
    return NextResponse.json(
      {
        error: "Failed to get progress",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
