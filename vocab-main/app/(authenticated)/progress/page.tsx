import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { ProgressStats } from "@/components/progress-stats"
import { getUserProgress } from "@/lib/user-progress"
import { getLevelStats } from "@/lib/words"
import { redirect } from "next/navigation"

export default async function ProgressPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/")
  }

  const userId = session.user.id

  try {
    const progress = await getUserProgress(userId)
    const stats = await getLevelStats(userId)

    return (
      <div className="flex justify-center min-h-[calc(100vh-4rem)]">
        <div className="container max-w-4xl py-10 px-4">
          <h1 className="text-3xl font-bold mb-6">ความคืบหน้าของคุณ</h1>
          <ProgressStats progress={progress} stats={stats} />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error loading progress:", error)

    return (
      <div className="flex justify-center min-h-[calc(100vh-4rem)]">
        <div className="container max-w-4xl py-10 px-4">
          <h1 className="text-3xl font-bold mb-6">ความคืบหน้าของคุณ</h1>
          <div className="rounded-md border p-8 text-center">
            <p className="text-muted-foreground">เกิดข้อผิดพลาดในการโหลดข้อมูลความคืบหน้า โปรดลองอีกครั้งในภายหลัง</p>
          </div>
        </div>
      </div>
    )
  }
}
