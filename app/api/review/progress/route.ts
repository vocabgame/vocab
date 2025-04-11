import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Session } from "next-auth"
import { getReviewProgress } from "@/lib/wrong-words"

export async function GET() {
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

    const progress = await getReviewProgress(session.user.id)
    
    return NextResponse.json(progress)
  } catch (error) {
    console.error("Error getting review progress:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
