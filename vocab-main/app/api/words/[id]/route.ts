import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("Server API: PUT /api/words/[id] called with id:", params.id)
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

    const id = params.id
    const body = await request.json()
    const { english, thai, level } = body

    if (!english || !thai || !level) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const dbClient = await clientPromise
    const db2 = dbClient.db()

    // Update word
    await db2.collection("words").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          english,
          thai,
          level,
          updatedAt: new Date(),
        },
      },
    )

    return NextResponse.json({
      _id: id,
      english,
      thai,
      level,
    })
  } catch (error) {
    console.error("Server API: Error updating word:", error)
    return NextResponse.json({ error: "Failed to update word" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("Server API: DELETE /api/words/[id] called with id:", params.id)
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

    const id = params.id

    // Delete word
    await db.collection("words").deleteOne({ _id: new ObjectId(id) })

    // Also remove from user progress
    await db.collection("progress").updateMany({ completedWords: id }, { $pull: { completedWords: id } })

    console.log("Server API: Word deleted successfully:", id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Server API: Error deleting word:", error)
    return NextResponse.json({ error: "Failed to delete word" }, { status: 500 })
  }
}
