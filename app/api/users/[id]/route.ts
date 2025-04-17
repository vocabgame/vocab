import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { Session } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    // รอให้ params พร้อมใช้งานก่อน
    const { id } = await params
    console.log("Server API: PUT /api/users/[id] called with id:", id)
    const session = await getServerSession(authOptions) as Session & {
      user: {
        id: string;
        email?: string;
        name?: string;
        image?: string;
      }
    }

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ตรวจสอบ ระบบ
    const client = await clientPromise
    const db = client.db()
    const userEmail = session.user?.email
    const currentUser = await db.collection("users").findOne({ email: userEmail })

    if (!currentUser || currentUser.role !== "admin") {
      console.log("Server API: Unauthorized access attempt - not admin", userEmail)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ข้อมูล ต้องการ รับ
    const data = await request.json()
    console.log("Server API: Update data:", data)

    // ตรวจสอบว่า ข้อมูล ต้องการ รับ ไม่
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No data to update" }, { status: 400 })
    }

    // สร้าง object ต้องการ รับ
    const updateData: Record<string, any> = {}

    // ตรวจสอบและ นำข้อมูล ต้องการ รับ
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.role !== undefined) updateData.role = data.role

    // ข้อมูล
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // ข้อมูล ต้องการ รับ แล้ว
    const updatedUser = await db.collection("users").findOne({ _id: new ObjectId(id) })

    // แปลง ObjectId เป็น string
    const serializedUser = JSON.parse(JSON.stringify(updatedUser))

    return NextResponse.json(serializedUser)
  } catch (error) {
    console.error("Server API: Error updating user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    console.log("Server API: DELETE /api/users/[id] called with id:", id)
    const session = await getServerSession(authOptions) as Session & {
      user: {
        id: string;
        email?: string;
        name?: string;
        image?: string;
      }
    }

    if (!session) {
      console.log("Server API: Unauthorized access attempt - no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ตรวจสอบ ระบบ
    const client = await clientPromise
    const db = client.db()
    const userEmail = session.user?.email
    const currentUser = await db.collection("users").findOne({ email: userEmail })

    if (!currentUser || currentUser.role !== "admin") {
      console.log("Server API: Unauthorized access attempt - not admin", userEmail)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ตรวจสอบว่าไม่ได้ลบ
    if (currentUser._id.toString() === id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
    }

    // ดึงข้อมูลผู้ใช้ที่จะลบเพื่อใช้ในการลบข้อมูลที่เกี่ยวข้อง
    const userToDelete = await db.collection("users").findOne({ _id: new ObjectId(id) })

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // ลบข้อมูลความคืบหน้าของผู้ใช้ (progress collection)
    const progressResult = await db.collection("progress").deleteMany({ userId: id })
    console.log(`Server API: Deleted ${progressResult.deletedCount} progress records for user ${id}`)

    // ลบข้อมูลคำศัพท์ที่ตอบผิดของผู้ใช้ (wrong_words collection)
    const wrongWordsResult = await db.collection("wrong_words").deleteMany({ userId: id })
    console.log(`Server API: Deleted ${wrongWordsResult.deletedCount} wrong words records for user ${id}`)

    // ลบข้อมูลความคืบหน้าการทบทวนของผู้ใช้ (review_progress collection)
    const reviewProgressResult = await db.collection("review_progress").deleteMany({ userId: id })
    console.log(`Server API: Deleted ${reviewProgressResult.deletedCount} review progress records for user ${id}`)

    // ลบผู้ใช้
    const result = await db.collection("users").deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "User and all related data deleted successfully",
      deletedData: {
        user: result.deletedCount,
        progress: progressResult.deletedCount,
        wrongWords: wrongWordsResult.deletedCount,
        reviewProgress: reviewProgressResult.deletedCount
      }
    })
  } catch (error) {
    console.error("Server API: Error deleting user:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}




