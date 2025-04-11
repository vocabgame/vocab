import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Session } from "next-auth"
import { clearAllWrongWords } from "@/lib/wrong-words"

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

    const result = await clearAllWrongWords(session.user.id)
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error clearing wrong words:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
