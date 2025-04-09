import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import clientPromise from "@/lib/mongodb"
import { WordManager } from "@/components/word-manager"

export default async function ManageWordsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  // ดึงจำนวนคำศัพท์ในฐานข้อมูล
  const client = await clientPromise
  const db = client.db()
  const wordCount = await db.collection("words").countDocuments()

  // ดึงคำศัพท์ล่าสุด 10 คำ
  const recentWords = await db.collection("words").find({}).sort({ createdAt: -1 }).limit(10).toArray()

  // แปลง ObjectId เป็น string
  const serializedRecentWords = JSON.parse(JSON.stringify(recentWords))

  return (
    <div className="flex justify-center min-h-[calc(100vh-4rem)]">
      <div className="container max-w-4xl py-10 px-4">
        <h1 className="text-3xl font-bold mb-6">จัดการคำศัพท์</h1>
        <WordManager wordCount={wordCount} recentWords={serializedRecentWords} />
      </div>
    </div>
  )
}
