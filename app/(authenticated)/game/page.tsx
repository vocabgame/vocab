import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GameInterface } from "@/components/game-interface"
import { getUserProgress } from "@/lib/user-progress"
import { getWordForUser, getLevelStats } from "@/lib/words"
import { redirect } from "next/navigation"

export default async function GamePage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  // Get level and stage from URL parameters if provided
  const levelParam = searchParams?.level ? String(searchParams.level) : undefined
  const stageParam = searchParams?.stage ? parseInt(String(searchParams.stage)) : undefined

  console.log(`Game page - URL parameters: level=${levelParam}, stage=${stageParam}`)

  const userId = session.user.id
  const progress = await getUserProgress(userId)
  const stats = await getLevelStats(userId)

  // If level and stage are provided in URL, override the progress
  if (levelParam && stageParam) {
    console.log(`Game page - Overriding progress with level=${levelParam}, stage=${stageParam}`)
    progress.currentLevel = levelParam
    progress.currentStage = stageParam
  }

  try {
    console.log(`Game page - Getting word for user with level=${progress.currentLevel}, stage=${progress.currentStage}`)
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
