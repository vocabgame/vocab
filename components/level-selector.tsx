"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ChevronRight, Lock, CheckCircle } from "lucide-react"

interface LevelSelectorProps {
  userId: string
  progress: {
    currentLevel: string
    currentStage: number
    completedWords: string[]
    levelProgress: Record<string, number>
    stageProgress: Record<string, Record<string, number>>
  }
  stats: {
    totalWords: number
    completedWords: number
    levels: {
      level: string
      total: number
      completed: number
      stages: {
        stage: number
        total: number
        completed: number
      }[]
    }[]
    currentLevel: string
    currentStage: number
  }
}

export function LevelSelector({ userId, progress, stats }: LevelSelectorProps) {
  const [activeTab, setActiveTab] = useState(progress.currentLevel)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSelectStage = async (level: string, stage: number) => {
    try {
      setIsLoading(true)

      // อัพเดตระดับและด่านที่เลือก
      const response = await fetch("/api/progress/select-level", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          level,
          stage,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to select level and stage")
      }

      toast({
        title: "เลือกระดับและด่านสำเร็จ",
        description: `เลือกระดับ ${level.toUpperCase()} ด่าน ${stage} เรียบร้อยแล้ว`,
      })

      // ไปที่หน้าเล่นเกม พร้อมกับพารามิเตอร์ระดับและด่าน
      router.push(`/game?level=${level}&stage=${stage}`)
    } catch (error) {
      console.error("Error selecting level and stage:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเลือกระดับและด่านได้ โปรดลองอีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ไม่ต้องล็อคระดับและด่าน ให้เลือกได้ทุกระดับ
  const levels = ["a1", "a2", "b1", "b2", "c1", "c2"]

  // ทุกระดับถูกปลดล็อคแล้ว
  const unlockedLevels = [...levels]

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6">
          {levels.map((level) => {
            const isUnlocked = unlockedLevels.includes(level)
            return (
              <TabsTrigger key={level} value={level} className="relative">
                {level.toUpperCase()}
              </TabsTrigger>
            )
          })}
        </TabsList>

        {levels.map((level) => {
          // ดึงข้อมูลของระดับ
          const levelStats = stats.levels.find((l) => l.level === level) || {
            level,
            total: 0,
            completed: 0,
            stages: [],
          }

          // ถ้าไม่มีด่าน ให้สร้างด่านขึ้นมา 10 ด่าน
          if (levelStats.stages.length === 0) {
            for (let i = 1; i <= 10; i++) {
              levelStats.stages.push({
                stage: i,
                total: 100,
                completed: 0
              });
            }
          }

          const levelProgress = levelStats.total > 0 ? Math.round((levelStats.completed / levelStats.total) * 100) : 0

          return (
            <TabsContent key={level} value={level} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>ระดับ {level.toUpperCase()}</CardTitle>
                  <CardDescription>เลือกด่านที่ต้องการเล่น</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">
                        {levelStats.completed} จาก {levelStats.total} คำ
                      </span>
                      <span className="text-sm font-medium">{levelProgress}%</span>
                    </div>
                    <Progress value={levelProgress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {levelStats.stages.map((stage) => {
                      const stageProgress = stage.total > 0 ? Math.round((stage.completed / stage.total) * 100) : 0
                      const isCompleted = stageProgress >= 100
                      const isCurrent = level === progress.currentLevel && stage.stage === progress.currentStage

                      return (
                        <Button
                          key={stage.stage}
                          variant={isCurrent ? "default" : isCompleted ? "outline" : "secondary"}
                          className="h-20 relative"
                          onClick={() => handleSelectStage(level, stage.stage)}
                          disabled={isLoading}
                        >
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-bold">ด่าน {stage.stage}</span>
                            <span className="text-xs">{stageProgress}%</span>
                          </div>
                          {isCompleted && <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-green-500" />}
                          {isCurrent && (
                            <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              •
                            </div>
                          )}
                        </Button>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      <div className="flex justify-center">
        <Button onClick={() => router.push(`/game?level=${progress.currentLevel}&stage=${progress.currentStage}`)} className="w-full max-w-xs">
          เล่นต่อจากด่านปัจจุบัน
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
