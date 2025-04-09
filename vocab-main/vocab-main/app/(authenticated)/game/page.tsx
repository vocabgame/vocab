import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GameInterface } from "@/components/game-interface"
import { getUserProgress } from "@/lib/user-progress"
import { getWordForUser, getLevelStats } from "@/lib/words"
import { redirect } from "next/navigation"

export default async function GamePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const userId = session.user.id
  const progress = await getUserProgress(userId)
  const stats = await getLevelStats(userId)

  try {
    const { word, choices } = await getWordForUser(userId, progress)

    return (
      <div className="flex justify-center min-h-[calc(100vh-4rem)]">
        <div className="container max-w-4xl py-10 px-4">
          <GameInterface
            initialWord={word}
            initialChoices={choices}
            userId={userId}
            progress={progress}
            stats={stats}
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading game:", error)

    return (
      <div className="flex justify-center min-h-[calc(100vh-4rem)]">
        <div className="container max-w-4xl py-10 px-4 text-center">
          <h1 className="text-2xl font-bold mb-4">เกิดข้อผิดพลาดในการโหลดเกม</h1>
          <p className="text-muted-foreground mb-6">ไม่สามารถโหลดคำศัพท์ได้ โปรดลองอีกครั้งในภายหลัง</p>
        </div>
      </div>
    )
  }
}
