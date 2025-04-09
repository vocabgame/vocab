import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { updateUserProgress } from "@/lib/user-progress"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, wordId, correct, revealed = false } = body

    if (!userId || !wordId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the user is updating their own progress
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const progress = await updateUserProgress(userId, wordId, correct, revealed)

    return NextResponse.json({ success: true, progress })
  } catch (error) {
    console.error("Error updating progress:", error)
    return NextResponse.json(
      {
        error: "Failed to update progress",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
