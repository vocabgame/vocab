import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getUserProgress } from "@/lib/user-progress"
import { getLevelStats } from "@/lib/words"
import { redirect } from "next/navigation"
import { WrongWordsSelector } from "@/components/wrong-words-selector"
import { getWrongWords } from "@/lib/wrong-words"

export default async function WrongWordsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const userId = session.user.id
  
  try {
    const progress = await getUserProgress(userId)
    const stats = await getLevelStats(userId)
    const wrongWords = await getWrongWords(userId)
    
    // แปลง ObjectId เป็น string สำหรับ client
    const serializedWrongWords = JSON.parse(JSON.stringify(wrongWords))

    return (
      <div className="flex justify-center min-h-[calc(100vh-4rem)]">
        <div className="container max-w-4xl py-10 px-4">
          <h1 className="text-3xl font-bold mb-6">คำศัพท์ที่ตอบผิด</h1>
          <WrongWordsSelector 
            userId={userId} 
            progress={progress} 
            stats={stats} 
            wrongWords={serializedWrongWords}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading wrong words:", error)

    return (
      <div className="flex justify-center min-h-[calc(100vh-4rem)]">
        <div className="container max-w-4xl py-10 px-4">
          <h1 className="text-3xl font-bold mb-6">คำศัพท์ที่ตอบผิด</h1>
          <div className="rounded-md border p-8 text-center">
            <p className="text-muted-foreground">เกิดข้อผิดพลาดในการโหลดข้อมูล โปรดลองอีกครั้งในภายหลัง</p>
          </div>
        </div>
      </div>
    )
  }
}
