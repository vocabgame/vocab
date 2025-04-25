"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, ChevronRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface WrongWordsProps {
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
  wrongWords: {
    word: {
      english: string
      thai: string
      level: string
      sequence?: number
    }
    wordId: string
    wrongCount: number
    lastWrongAt: string
  }[]
}

export function WrongWordsSelector({ userId, progress, stats, wrongWords }: WrongWordsProps) {
  const [activeTab, setActiveTab] = useState(progress.currentLevel)
  const [selectedStage, setSelectedStage] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const levels = ["a1", "a2", "b1", "b2", "c1", "c2"]

  // กรองคำศัพท์ที่ตอบผิดตามระดับและด่าน
  const getWrongWordsByLevel = (level: string) => {
    return wrongWords.filter(item => item.word.level === level)
  }

  // คำนวณจำนวนคำที่ตอบผิดในแต่ละระดับ
  const getWrongWordsCountByLevel = (level: string) => {
    return getWrongWordsByLevel(level).length
  }

  // คำนวณเปอร์เซ็นต์ความคืบหน้าของแต่ละระดับ
  const getLevelProgress = (level: string) => {
    const levelStats = stats.levels.find(l => l.level === level)
    if (!levelStats || levelStats.total === 0) return 0
    return Math.round((levelStats.completed / levelStats.total) * 100)
  }

  // จัดการเมื่อคลิกที่ด่าน
  const handleSelectStage = (level: string, stage: number) => {
    setSelectedStage(stage)
  }

  // ไปที่หน้าเล่นเกม
  const handlePlayGame = (level: string, stage: number) => {
    router.push(`/game?level=${level}&stage=${stage}`)
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6">
          {levels.map((level) => (
            <TabsTrigger key={level} value={level} className="relative">
              {level.toUpperCase()}
              {getWrongWordsCountByLevel(level) > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 text-xs">
                  {getWrongWordsCountByLevel(level)}
                </Badge>
              )}
            </TabsTrigger>
          ))}
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

          const levelProgress = getLevelProgress(level)
          const wrongWordsInLevel = getWrongWordsByLevel(level)

          return (
            <TabsContent key={level} value={level} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>ระดับ {level.toUpperCase()}</CardTitle>
                  <CardDescription>
                    คำศัพท์ที่ตอบผิดในระดับนี้: {wrongWordsInLevel.length} คำ
                  </CardDescription>
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

                  {wrongWordsInLevel.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>คำศัพท์</TableHead>
                            <TableHead>คำแปล</TableHead>
                            <TableHead>ด่าน</TableHead>
                            <TableHead>ตอบผิด</TableHead>
                            <TableHead>ครั้งล่าสุด</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {wrongWordsInLevel.map((item) => {
                            // คำนวณด่านจากคำศัพท์ (ถ้ามี sequence)
                            let stage = "ไม่ระบุ";
                            if (item.word.sequence) {
                              const calculatedStage = Math.ceil(item.word.sequence / 100);
                              stage = calculatedStage.toString();
                            }

                            return (
                              <TableRow key={item.wordId}>
                                <TableCell className="font-medium">{item.word.english}</TableCell>
                                <TableCell>{item.word.thai}</TableCell>
                                <TableCell>ด่าน {stage}</TableCell>
                                <TableCell>{item.wrongCount} ครั้ง</TableCell>
                                <TableCell>
                                  {new Date(item.lastWrongAt).toLocaleDateString('th-TH')}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      ไม่พบคำศัพท์ที่ตอบผิดในระดับนี้
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      <div className="flex justify-center">
        <Button
          onClick={() => router.push(`/review`)}
          className="w-full max-w-xs"
        >
          ไปหน้าทบทวนคำศัพท์
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
