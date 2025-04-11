import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Session } from "next-auth"
import { resetAllWrongWords } from "@/lib/wrong-words"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as Session & {
      user: {
        id: string;
        email?: string;
        name?: string;
        image?: string;
      }
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId } = await request.json()

    // Verify the user is updating their own data
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Reset all wrong words by marking them as mastered
    await resetAllWrongWords(userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error resetting wrong words:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
