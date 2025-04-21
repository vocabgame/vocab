import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get request body
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    // Only allow users to fix their own progress unless they're an admin
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

    // Get completedWords and remove duplicates
    const completedWords = progress.completedWords || []
    const uniqueWords = [...new Set(completedWords)]
    
    // Calculate how many duplicates were removed
    const duplicatesRemoved = completedWords.length - uniqueWords.length
    
    // Update progress with unique words
    if (duplicatesRemoved > 0) {
      await db.collection("progress").updateOne(
        { userId },
        { $set: { completedWords: uniqueWords } }
      )
    }

    // Return results
    return NextResponse.json({
      success: true,
      originalCount: completedWords.length,
      newCount: uniqueWords.length,
      duplicatesRemoved
    })
  } catch (error) {
    console.error("Error in fix duplicates API:", error)
    return NextResponse.json(
      {
        error: "Failed to fix duplicates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
