"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Volume2, SkipForward, ArrowRight, Eye, RefreshCw, Trophy, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useIsMobile } from "@/hooks/use-mobile"

// จำนวนคำต่อด่าน
const WORDS_PER_STAGE = 100

interface GameInterfaceProps {
  initialWord: {
    _id: string
    english: string
    thai: string
    level: string
  } | null
  initialChoices: string[]
  userId: string
  progress: {
    currentLevel: string
    currentStage: number
    completedWords: string[]
    levelProgress: Record<string, number>
    stageProgress: Record<string, Record<string, number>>
  }
  stats?: {
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

export function GameInterface({ initialWord, initialChoices, userId, progress, stats }: GameInterfaceProps) {
  const isMobile = useIsMobile()
  const [word, setWord] = useState(initialWord)
  const [choices, setChoices] = useState(initialChoices)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentProgress, setCurrentProgress] = useState(progress)
  const [currentStats, setCurrentStats] = useState(stats)
  const [autoAdvanceTimer, setAutoAdvanceTimer] = useState<NodeJS.Timeout | null>(null)
  const [showStageComplete, setShowStageComplete] = useState(false)
  const [showLevelComplete, setShowLevelComplete] = useState(false)
  const [nextWordData, setNextWordData] = useState<any>(null) // เล่มสถานะเพื่อเก็บข้อมูลคำถัดไป
  const { toast } = useToast()
  const router = useRouter()

  // ล้าง timer เมื่อ component unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer)
      }
    }
  }, [autoAdvanceTimer])

  const playPronunciation = () => {
    if (isSpeaking || !word || !word.english) return

    setIsSpeaking(true)
    const utterance = new SpeechSynthesisUtterance(word.english)
    utterance.lang = "en-US"
    utterance.rate = 0.8 // ลดความเร็วลงเล็กน้อยเพื่อให้

    utterance.onend = () => {
      setIsSpeaking(false)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      toast({
        title: "ไม่สามารถเล่นได้",
        description: "โปรดตรวจสอบว่าเบราว์เซอร์สามารถอ่านออกได้",
        variant: "destructive",
        duration: 3000,
      })
    }

    window.speechSynthesis.speak(utterance)
  }

  // ก์ข้อมูลคำถัดไปแต่ไม่แสดงผล
  const prefetchNextWord = async (currentWordId: string) => {
    try {
      const response = await fetch("/api/words/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          currentWordId,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get next word")
      }

      const data = await response.json()
      setNextWordData(data)
      return data
    } catch (error) {
      console.error("Error prefetching next word:", error)
      return null
    }
  }

  const fetchNextWord = async (currentWordId: string) => {
    try {
      setIsLoadingNext(true)

      // ถ้าข้อมูลคำถัดไปไว้ล่วงหน้าแล้ว ให้ใช้ข้อมูลนั้นเลย
      let data = nextWordData

      // ถ้าไม่มีข้อมูลคำถัดไป ให้ขอข้อมูลใหม่
      if (!data) {
        const response = await fetch("/api/words/next", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            currentWordId,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to get next word")
        }

        data = await response.json()
      }

      // เซ็ตข้อมูลคำถัดไปไว้ล่วงหน้า
      setNextWordData(null)

      // ตรวจสอบว่าคำถัดไปไม่
      if (!data.word) {
        // ตรวจสอบว่าจบด่าน
        if (data.levelComplete) {
          setShowLevelComplete(true)
          toast({
            title: `ด้วย! ผ่าน ${currentProgress.currentLevel.toUpperCase()} แล้ว!`,
            description: "ได้รับคำศัพท์ครบในด่านนี้แล้ว ไปเล่นด่านถัดไป",
            duration: 3000,
          })
        } else if (data.stageComplete) {
          setShowStageComplete(true)
          toast({
            title: `ด้วย! ผ่านด่าน ${currentProgress.currentStage} ของ ${currentProgress.currentLevel.toUpperCase()} แล้ว!`,
            description: "ไปเล่นด่านถัดไป",
            duration: 3000,
          })
        } else {
          toast({
            title: "ด้วย!",
            description: "ได้รับคำศัพท์ครบแล้ว",
            duration: 3000,
          })
        }

        // เรียก router.refresh() เพื่อโหลดหน้าใหม่ (ถ้าต้องการ)
        setTimeout(() => {
          router.refresh()
        }, 3000)
        return false
      }

      // ปเดตคำศัพท์และพร้อม
      setWord(data.word)
      setChoices(data.choices)
      setSelectedAnswer(null)
      setIsCorrect(null)
      setIsRevealed(false)

      // ถ้ามีการเปลี่ยนแปลง ปรับปรุงความคืบหน้า
      if (data.progress) {
        setCurrentProgress(data.progress)

        // ถ้ามีการเปลี่ยนแปลงในด่าน ปรับปรุงสถิติ
        if (
          data.progress.currentLevel !== currentProgress.currentLevel ||
          data.progress.currentStage !== currentProgress.currentStage ||
          data.levelComplete ||
          data.stageComplete
        ) {
          // ใหม่
          try {
            const statsResponse = await fetch(`/api/stats?userId=${userId}`)
            if (statsResponse.ok) {
              const newStats = await statsResponse.json()
              setCurrentStats(newStats)
            }
          } catch (error) {
            console.error("Error fetching updated stats:", error)
          }
        }
      }

      // เล่มข้อมูลคำถัดไปไว้ล่วงหน้า
      if (data.word) {
        prefetchNextWord(data.word._id)
      }

      return true
    } catch (error) {
      console.error("Error getting next word:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดคำถัดไปได้ โปรดรีเฟรชหน้านี้",
        variant: "destructive",
        duration: 3000,
      })
      return false
    } finally {
      setIsLoadingNext(false)
    }
  }

  const handleAnswerSelect = async (answer: string) => {
    if (isLoading || !word) return

    setSelectedAnswer(answer)
    const correct = answer === word.thai
    setIsCorrect(correct)

    // ถ้าตอบผิด ให้แสดงข้อความและสามารถตอบใหม่ได้
    if (!correct) {
      toast({
        title: "ไม่ถูกต้อง",
        description: "ลองตอบใหม่ครั้ง",
        variant: "destructive",
        duration: 800,
      })

      // รอ 0.8 วินาทีแล้วเซ็ตคำตอบเพื่อให้ตอบใหม่ได้
      setTimeout(() => {
        setSelectedAnswer(null)
        setIsCorrect(null)
      }, 800)

      return
    }

    // ถ้าตอบถูก ให้ปรับปรุงความคืบหน้า
    try {
      setIsLoading(true)

      // เล่มข้อมูลคำถัดไปไว้ล่วงหน้า
      if (!nextWordData) {
        prefetchNextWord(word._id)
      }

      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          wordId: word._id,
          correct: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update progress")
      }

      // ปรับปรุงความคืบหน้า
      const updatedProgress = await response.json()

      // ปรับปรุงความคืบหน้าในส่วนของ client-side
      setCurrentProgress(updatedProgress.progress)

      // ปรับปรุงสถิติ
      if (currentStats) {
        // ปรับปรุงจำนวนคำที่ได้ในด่าน
        const updatedStats = { ...currentStats }

        // เพิ่มจำนวนคำที่ได้
        updatedStats.completedWords += 1

        // เพิ่มจำนวนคำที่ได้ในระดับ
        const levelIndex = updatedStats.levels.findIndex((l) => l.level === word.level)
        if (levelIndex !== -1) {
          updatedStats.levels[levelIndex].completed += 1

          // เพิ่มจำนวนคำที่ได้ในด่าน
          const stageIndex = updatedStats.levels[levelIndex].stages.findIndex(
            (s) => s.stage === currentProgress.currentStage,
          )
          if (stageIndex !== -1) {
            updatedStats.levels[levelIndex].stages[stageIndex].completed += 1
          }
        }

        setCurrentStats(updatedStats)
      }

      // แสดงข้อความเมื่อตอบถูก
      toast({
        title: "ถูก! 🎉",
        description: `"${word.english}" แปลว่า "${word.thai}"`,
        duration: 800,
      })

      // ตั้งเวลาเปลี่ยนไปคำถัดไป (0.3 วินาที)
      const timer = setTimeout(() => {
        handleNext()
      }, 300)

      setAutoAdvanceTimer(timer)
    } catch (error) {
      console.error("Error updating progress:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถปรับปรุงความคืบหน้าได้ โปรดลองอีกครั้ง",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReveal = async () => {
    if (!word) return

    setIsRevealed(true)
    setSelectedAnswer(word.thai)

    toast({
      title: "เฉลย",
      description: `"${word.english}" แปลว่า "${word.thai}"`,
      duration: 800,
    })

    // ว่าได้เห็นคำแล้ว แต่ไม่นับว่าตอบถูก
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          wordId: word._id,
          correct: false,
          revealed: true,
        }),
      })

      if (response.ok) {
        // ปรับปรุงความคืบหน้า
        const updatedProgress = await response.json()
        setCurrentProgress(updatedProgress.progress)
      }
    } catch (error) {
      console.error("Error updating progress for revealed word:", error)
    }
  }

  const handleSkip = async () => {
    if (!word || isLoadingNext) return

    // ยกเลิก timer ถ้ามีอยู่
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
      setAutoAdvanceTimer(null)
    }

    // เรียกใช้ fetchNextWord โดยตรงเพื่อโหลดคำถัดไป
    await fetchNextWord(word._id)
  }

  const handleNext = async () => {
    if (!word || isLoadingNext) return

    // ยกเลิก timer ถ้ามีอยู่
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
      setAutoAdvanceTimer(null)
    }

    // เรียกใช้ fetchNextWord โดยตรงเพื่อโหลดคำถัดไป
    await fetchNextWord(word._id)
  }

  const handleTryAgain = () => {
    // เซ็ตคำตอบเพื่อให้ตอบใหม่ได้
    setSelectedAnswer(null)
    setIsCorrect(null)
  }

  // ปรับปรุงความคืบหน้าของระดับ
  const resetCurrentLevel = async () => {
    try {
      setIsLoading(true)

      // ตรวจสอบว่า word และ level ไม่
      const levelToReset = word?.level || currentProgress.currentLevel

      console.log("Resetting level:", levelToReset)

      const response = await fetch("/api/progress/reset-level", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          level: levelToReset,
        }),
      })

      const responseText = await response.text()
      console.log("Reset level response:", responseText)

      let data
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        console.error("Failed to parse response:", e)
        throw new Error("Invalid response format")
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset level progress")
      }

      // ปรับปรุงความคืบหน้า
      setCurrentProgress(data.progress)

      toast({
        title: "ปรับปรุงสำเร็จ",
        description: `ปรับปรุงความคืบหน้าของ ${levelToReset.toUpperCase()} เรียบร้อยแล้ว`,
        duration: 2000,
      })

      // เรียก router.refresh() เพื่อโหลดคำใหม่
      router.refresh()
    } catch (error) {
      console.error("Error resetting level progress:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถปรับปรุงความคืบหน้าของระดับได้ โปรดลองอีกครั้ง",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // เล่นเสียงเมื่อคำเปลี่ยน
  useEffect(() => {
    if (word && word.english) {
      const timer = setTimeout(() => {
        playPronunciation()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [word])

  // เล่มข้อมูลคำถัดไปเมื่อโหลดคำแรก
  useEffect(() => {
    if (word && word._id && !nextWordData) {
      prefetchNextWord(word._id)
    }
  }, [word])

  // ตรวจสอบว่าคำให้เล่นไม่
  if (!word || !word._id) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">ไม่พบคำศัพท์</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">ได้รับคำศัพท์ครบในระดับนี้แล้ว ไม่มีคำศัพท์ในฐานข้อมูล</p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Link href="/level-select">
              <Button>เลือกระดับและด่าน</Button>
            </Link>
            <Link href="/manage-words">
              <Button variant="outline">คำศัพท์</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // ถ้าแสดงหน้าจบด่าน จบ
  if (showStageComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-center text-2xl">
              ด้วย! ผ่านด่าน {currentProgress.currentStage - 1} ของ {currentProgress.currentLevel.toUpperCase()} แล้ว!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">ได้รับคำศัพท์ครบในด่านนี้แล้ว ไปเล่นด่านถัดไป</p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => {
                  setShowStageComplete(false)
                  router.refresh()
                }}
              >
                ไปด่านถัดไป
              </Button>
              <Link href="/level-select">
                <Button variant="outline">เลือกระดับและด่าน</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showLevelComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <Trophy className="h-16 w-16 text-yellow-500" />
            </div>
            <CardTitle className="text-center text-2xl">ด้วย! ผ่าน {word.level.toUpperCase()} แล้ว!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-6">ได้รับคำศัพท์ครบในระดับนี้แล้ว ไปเล่นด่านถัดไป</p>
            <div className="flex justify-center gap-4">
              <Button
                onClick={() => {
                  setShowLevelComplete(false)
                  router.refresh()
                }}
              >
                ไปด่านถัดไป
              </Button>
              <Link href="/level-select">
                <Button variant="outline">เลือกระดับและด่าน</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const levelLabel = word.level.toUpperCase()

  // หาข้อมูลของระดับ
  const currentLevelStats = currentStats?.levels?.find((l) => l.level === word.level)

  // หาข้อมูลของด่าน
  const currentStageStats = currentLevelStats?.stages?.find((s) => s.stage === currentProgress.currentStage)

  // คำนวณความคืบหน้าของด่าน
  const stageProgress = currentStageStats ? (currentStageStats.completed / currentStageStats.total) * 100 : 0

  // คำนวณความคืบหน้าของระดับ
  const levelProgress = currentLevelStats ? (currentLevelStats.completed / currentLevelStats.total) * 100 : 0

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md mb-4 sm:mb-8 px-4">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs sm:text-sm font-medium text-primary">
              {levelLabel}
            </span>
            <span className="inline-flex items-center justify-center rounded-full bg-secondary/10 px-2 py-0.5 text-xs sm:text-sm font-medium text-secondary">
              ด่าน {currentProgress.currentStage}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/level-select">
              <Button variant="outline" size={isMobile ? "sm" : "default"} className="flex items-center gap-1 text-xs sm:text-sm">
                <Settings className="h-3 w-3" />
                เลือกระดับ
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size={isMobile ? "sm" : "default"} className="flex items-center gap-1 text-xs sm:text-sm">
                  <RefreshCw className="h-3 w-3" />
                  รีเซตระดับ
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>แน่ใจหรือไม่?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การปรับปรุงจะลบคำศัพท์ที่ได้ในระดับ {levelLabel} และเริ่มใหม่
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={resetCurrentLevel} className="bg-destructive text-destructive-foreground">
                    รีเซตระดับ
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* ความคืบหน้าของด่าน */}
        <div className="mb-2">
          <div className="flex justify-between text-xs">
            <span>ด่าน {currentProgress.currentStage}</span>
            <span>
              {currentStageStats?.completed || 0} / {currentStageStats?.total || WORDS_PER_STAGE} คำ
            </span>
          </div>
          <Progress value={stageProgress} className="h-1.5 sm:h-2" />
        </div>

        {/* ความคืบหน้าของระดับ */}
        <div>
          <div className="flex justify-between text-xs">
            <span>{levelLabel}</span>
            <span>
              {currentLevelStats?.completed || 0} / {currentLevelStats?.total || 0} คำ
            </span>
          </div>
          <Progress value={levelProgress} className="h-1 sm:h-1.5" />
        </div>
      </div>

      <Card className="w-full max-w-md mx-4">
        <CardHeader className="space-y-2 sm:space-y-4">
          <CardTitle className="text-center text-xl sm:text-2xl md:text-3xl break-words">
            {word.english}
          </CardTitle>
          {isRevealed && (
            <div className="text-center text-green-600 font-medium text-sm sm:text-base">
              {word.thai}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            size={isMobile ? "default" : "lg"} 
            className="w-full mb-4 sm:mb-6 text-sm sm:text-base" 
            onClick={playPronunciation} 
            disabled={isSpeaking}
          >
            <Volume2 className={`mr-2 h-4 w-4 ${isSpeaking ? "animate-pulse" : ""}`} />
            {isSpeaking ? "เล่น..." : "การออกเสียง"}
          </Button>

          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {choices.map((choice, index) => (
              <Button
                key={index}
                variant={
                  selectedAnswer === choice
                    ? isCorrect
                      ? "default"
                      : "destructive"
                    : selectedAnswer && choice === word.thai
                      ? "default"
                      : "outline"
                }
                className="h-12 sm:h-16 text-sm sm:text-base break-words"
                onClick={() => handleAnswerSelect(choice)}
                disabled={isLoading}
              >
                {choice}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleSkip} 
              disabled={isLoadingNext}
              size={isMobile ? "sm" : "default"}
              className="text-xs sm:text-sm"
            >
              <SkipForward className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              ข้าม
            </Button>
            <Button 
              variant="outline" 
              onClick={handleReveal} 
              disabled={!!selectedAnswer || isRevealed || isLoading}
              size={isMobile ? "sm" : "default"}
              className="text-xs sm:text-sm"
            >
              <Eye className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              เฉลย
            </Button>
          </div>

          {selectedAnswer && !isCorrect ? (
            <Button onClick={handleTryAgain} variant="secondary">
              ลองใหม่
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={(!selectedAnswer && !isRevealed) || isLoadingNext || (selectedAnswer && !isCorrect)}
            >
              {isLoadingNext ? "โหลด..." : "คำถัดไป"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

