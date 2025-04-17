import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { Session } from "next-auth"
import { getWrongWords, markWordAsMastered, addWrongWord } from "@/lib/wrong-words"
import { generateChoicesForWord } from "@/lib/words"
import clientPromise from "@/lib/mongodb"

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

    const wrongWords = await getWrongWords(session.user.id)
    const client = await clientPromise
    const db = client.db()

    // กรองคำที่ข้อมูลครบถ้วน
    const validWrongWords = wrongWords.filter(wrongWord => 
      wrongWord.word && wrongWord.word.english && wrongWord.word.thai
    )

    // สร้าง Promise array สำหรับการสร้าง choices
    const choicesPromises = validWrongWords.map(async (wrongWord) => {
      try {
        const choices = await generateChoicesForWord(wrongWord.word, db)
        return {
          word: wrongWord.word,
          wordId: wrongWord.wordId,
          choices,
          wrongCount: wrongWord.wrongCount,
          lastWrongAt: wrongWord.lastWrongAt
        }
      } catch (error) {
        console.error("Error generating choices for word:", wrongWord, error)
        return null
      }
    })

    // รัน Promises
    const wordsWithChoices = (await Promise.all(choicesPromises))
      .filter(result => result !== null) // กรอง null ออก

    return NextResponse.json(wordsWithChoices)
  } catch (error) {
    console.error("Error getting wrong words:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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

    const { userId, word } = await request.json()

    // Verify the user is updating their own data
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!word || !word._id) {
      return NextResponse.json({ error: "Invalid word data" }, { status: 400 })
    }

    await addWrongWord(userId, word)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error adding wrong word:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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

    const { wordId } = await request.json()
    if (!wordId) {
      return NextResponse.json({ error: "Word ID is required" }, { status: 400 })
    }

    await markWordAsMastered(session.user.id, wordId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error marking word as mastered:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
