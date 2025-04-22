import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateUserProgress } from "@/lib/user-progress"

export async function POST(request: Request) {
  try {
    console.log("API: Progress update request received")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("API: Unauthorized - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error("API: Error parsing request body:", parseError)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { userId, wordId, correct, revealed = false, selectedLevel, selectedStage } = body
    console.log(`API: Progress update for user ${userId}, word ${wordId}, correct: ${correct}, revealed: ${revealed}, selectedLevel: ${selectedLevel}, selectedStage: ${selectedStage}`)

    if (!userId || !wordId) {
      console.log("API: Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the user is updating their own progress
    if (userId !== session.user.id) {
      console.log(`API: Unauthorized - user ID mismatch (${userId} vs ${session.user.id})`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    try {
      const progress = await updateUserProgress(userId, wordId, correct, revealed, selectedLevel, selectedStage ? parseInt(String(selectedStage)) : undefined)
      console.log(`API: Progress updated successfully for word ${wordId}`)
      return NextResponse.json({ success: true, progress })
    } catch (progressError) {
      console.error("API: Error in updateUserProgress:", progressError)
      return NextResponse.json(
        {
          error: "Failed to update progress",
          details: progressError instanceof Error ? progressError.message : "Unknown error in updateUserProgress",
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("API: Unhandled error in progress update:", error)
    return NextResponse.json(
      {
        error: "Failed to update progress",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
