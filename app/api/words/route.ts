import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"

export async function GET(request: Request) {
  try {
    console.log("Server API: GET /api/words called")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ยกเลิกการตรวจสอบสิทธิ์แอดมิน - ทุกคนที่ล็อกอินแล้วสามารถเข้าถึงได้
    const client = await clientPromise
    const db = client.db()

    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const search = searchParams.get("search") || ""
    const level = searchParams.get("level") || ""

    const limit = 50 // เพิ่มจำนวนคำศัพท์ที่แสดงต่อหน้า
    const skip = (page - 1) * limit

    // Build query
    const query: any = {}

    if (search) {
      query.$or = [{ english: { $regex: search, $options: "i" } }, { thai: { $regex: search, $options: "i" } }]
    }

    if (level) {
      query.level = level
    }

    console.log("Server API: Fetching words with query:", JSON.stringify(query))

    // Get words with pagination
    const words = await db.collection("words").find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray()

    // Get total count for pagination
    const total = await db.collection("words").countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    console.log(`Server API: Found ${words.length} words, total: ${total}, pages: ${totalPages}`)

    // Convert ObjectId to string for client components
    const serializedWords = JSON.parse(JSON.stringify(words))

    return NextResponse.json({
      words: serializedWords,
      page,
      totalPages,
      total,
    })
  } catch (error) {
    console.error("Server API: Error fetching words:", error)
    return NextResponse.json({ error: "Failed to fetch words" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("Server API: POST /api/words called")
    const session = await getServerSession(authOptions)

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ยกเลิกการตรวจสอบสิทธิ์แอดมิน - ทุกคนที่ล็อกอินแล้วสามารถเข้าถึงได้
    const client = await clientPromise
    const db = client.db()

    const body = await request.json()
    console.log("Server API: Request body:", body)

    const { english, thai, level, sequence } = body

    if (!english || !thai || !level) {
      console.log("Server API: Missing required fields")
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // ถ้าไม่มี sequence ให้คำนวณจากระดับ
    let calculatedSequence = sequence;
    if (!calculatedSequence) {
      // คำนวณ sequence ตามระดับ
      switch(level) {
        case 'a1': calculatedSequence = 1; break; // เริ่มที่ 1
        case 'a2': calculatedSequence = 101; break; // เริ่มที่ 101
        case 'b1': calculatedSequence = 201; break; // เริ่มที่ 201
        case 'b2': calculatedSequence = 301; break; // เริ่มที่ 301
        case 'c1': calculatedSequence = 401; break; // เริ่มที่ 401
        case 'c2': calculatedSequence = 501; break; // เริ่มที่ 501
        default: calculatedSequence = 1;
      }

      // หาค่า sequence สูงสุดในระดับนี้
      const maxSequenceWord = await db.collection("words")
        .find({ level })
        .sort({ sequence: -1 })
        .limit(1)
        .toArray()

      if (maxSequenceWord.length > 0 && maxSequenceWord[0].sequence) {
        calculatedSequence = Math.max(calculatedSequence, maxSequenceWord[0].sequence + 1);
      }
    }

    // Check if word already exists
    const existingWord = await db.collection("words").findOne({ english })

    if (existingWord) {
      console.log("Server API: Word already exists:", english)

      // อัปเดตคำศัพท์ที่มีอยู่แล้ว
      const result = await db.collection("words").updateOne(
        { english },
        {
          $set: {
            thai,
            level,
            sequence: calculatedSequence,
            updatedAt: new Date(),
          },
        },
      )

      console.log("Server API: Word updated:", result.modifiedCount)

      return NextResponse.json({
        _id: existingWord._id.toString(),
        english,
        thai,
        level,
        updated: true,
      })
    }

    // Insert new word
    const result = await db.collection("words").insertOne({
      english,
      thai,
      level,
      sequence: calculatedSequence,
      createdAt: new Date(),
    })

    console.log("Server API: Word added successfully:", english)

    // Convert ObjectId to string for client components
    return NextResponse.json({
      _id: result.insertedId.toString(),
      english,
      thai,
      level,
    })
  } catch (error) {
    console.error("Server API: Error adding word:", error)
    return NextResponse.json({ error: "Failed to add word" }, { status: 500 })
  }
}
