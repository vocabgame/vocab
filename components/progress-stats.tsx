"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"
import Link from "next/link"

interface ProgressStatsProps {
  progress: {
    currentLevel: string
    completedWords: string[]
    levelProgress: Record<string, number>
  }
  stats: {
    totalWords: number
    completedWords: number
    levels: {
      level: string
      total: number
      completed: number
    }[]
  }
}

export function ProgressStats({ progress, stats }: ProgressStatsProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const totalProgress = stats.totalWords > 0 ? Math.round((stats.completedWords / stats.totalWords) * 100) : 0

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>ความคืบหน้าโดยรวม</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">
                {stats.completedWords} จาก {stats.totalWords} คำ
              </span>
              <span className="text-sm font-medium">{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="overview">ภาพรวมระดับ</TabsTrigger>
          <TabsTrigger value="details">รายละเอียดความคืบหน้า</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          {stats.levels.map((level) => {
            const levelProgress = level.total > 0 ? Math.round((level.completed / level.total) * 100) : 0
            const isCurrentLevel = level.level === progress.currentLevel

            return (
              <Card key={level.level} className={isCurrentLevel ? "border-primary" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      ระดับ {level.level.toUpperCase()}
                      {isCurrentLevel && (
                        <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">ปัจจุบัน</span>
                      )}
                    </CardTitle>
                    <Link href="/game">
                      <Button variant="ghost" size="sm" className="h-8 gap-1">
                        {level.completed === 0 ? "เริ่ม" : "เล่นต่อ"}
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {level.completed} จาก {level.total} คำ
                      </span>
                      <span className="text-sm font-medium">{levelProgress}%</span>
                    </div>
                    <Progress value={levelProgress} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        <TabsContent value="details" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>สถิติการเรียนรู้</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium text-muted-foreground">คำศัพท์ทั้งหมด</div>
                    <div className="mt-1 text-2xl font-bold">{stats.totalWords}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium text-muted-foreground">เรียนรู้แล้ว</div>
                    <div className="mt-1 text-2xl font-bold">{stats.completedWords}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium text-muted-foreground">ระดับปัจจุบัน</div>
                    <div className="mt-1 text-2xl font-bold">{progress.currentLevel.toUpperCase()}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs font-medium text-muted-foreground">ความสำเร็จ</div>
                    <div className="mt-1 text-2xl font-bold">{totalProgress}%</div>
                  </div>
                </div>

                <div>
                  <h3 className="mb-4 text-lg font-medium">กิจกรรมล่าสุด</h3>
                  <div className="rounded-md border">
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      การติดตามกิจกรรมจะเปิดให้ใช้งานเร็วๆ นี้
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
