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

    // Only allow users to check their own progress unless they're an admin
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

    // Check for duplicates in completedWords
    const completedWords = progress.completedWords || []
    const wordCounts: Record<string, number> = {}
    const duplicates: string[] = []

    // Count occurrences of each word ID
    completedWords.forEach((wordId: string) => {
      wordCounts[wordId] = (wordCounts[wordId] || 0) + 1
      if (wordCounts[wordId] > 1 && !duplicates.includes(wordId)) {
        duplicates.push(wordId)
      }
    })

    // Get details for duplicate words
    const duplicateDetails = []
    if (duplicates.length > 0) {
      for (const wordId of duplicates) {
        try {
          const wordDetails = await db.collection("words").findOne({ _id: wordId })
          duplicateDetails.push({
            wordId,
            count: wordCounts[wordId],
            details: wordDetails || { error: "Word not found" }
          })
        } catch (error) {
          duplicateDetails.push({
            wordId,
            count: wordCounts[wordId],
            details: { error: "Failed to fetch word details" }
          })
        }
      }
    }

    // Return results
    return NextResponse.json({
      totalWords: completedWords.length,
      uniqueWords: Object.keys(wordCounts).length,
      duplicatesFound: duplicates.length,
      duplicates: duplicateDetails
    })
  } catch (error) {
    console.error("Error in debug duplicates API:", error)
    return NextResponse.json(
      {
        error: "Failed to check for duplicates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
