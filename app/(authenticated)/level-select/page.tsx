import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LevelSelector } from "@/components/level-selector"
import { getUserProgress } from "@/lib/user-progress"
import { getLevelStats } from "@/lib/words"

export default async function LevelSelectPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const userId = session.user.id
  const progress = await getUserProgress(userId)
  const stats = await getLevelStats(userId)

  return (
    <div className="flex justify-center min-h-[calc(100vh-4rem)]">
      <div className="container max-w-4xl py-10 px-4">
        <h1 className="text-3xl font-bold mb-6">เลือกระดับและด่าน</h1>
        <LevelSelector userId={userId} progress={progress} stats={stats} />
      </div>
    </div>
  )
}
