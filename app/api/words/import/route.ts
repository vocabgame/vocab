import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { isAdmin } from "@/lib/auth-utils"
import clientPromise from "@/lib/mongodb"
import { parse } from "csv-parse/sync"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read file content
    const fileContent = await file.text()

    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    // Validate records
    const validLevels = ["a1", "a2", "b1", "b2", "c1", "c2"]
    const validRecords = records.filter((record: any) => {
      return record.english && record.thai && record.level && validLevels.includes(record.level.toLowerCase())
    })

    if (validRecords.length === 0) {
      return NextResponse.json({ error: "No valid records found in CSV" }, { status: 400 })
    }

    // Prepare records for insertion
    const wordsToInsert = validRecords.map((record: any) => ({
      english: record.english.trim(),
      thai: record.thai.trim(),
      level: record.level.toLowerCase(),
      createdAt: new Date(),
    }))

    // Insert into database
    const client = await clientPromise
    const db = client.db()

    const result = await db.collection("words").insertMany(wordsToInsert)

    return NextResponse.json({
      success: true,
      imported: result.insertedCount,
    })
  } catch (error) {
    console.error("Error importing words:", error)
    return NextResponse.json(
      {
        error: "Failed to import words",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
