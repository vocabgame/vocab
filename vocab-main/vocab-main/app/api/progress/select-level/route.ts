import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { userId, level, stage } = body

    if (!userId || !level || !stage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify the user is updating their own progress
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // อัพเดตระดับและด่านที่เลือก
    const client = await clientPromise
    const db = client.db()

    await db.collection("progress").updateOne({ userId }, { $set: { currentLevel: level, currentStage: stage } })

    return NextResponse.json({
      success: true,
      message: `Updated to level ${level} stage ${stage}`,
    })
  } catch (error) {
    console.error("Error selecting level and stage:", error)
    return NextResponse.json(
      {
        error: "Failed to select level and stage",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
