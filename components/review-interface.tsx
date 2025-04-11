"use client"

// @ts-ignore - Suppress TypeScript warnings for unused variables
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Volume2, SkipForward, ArrowRight, Eye, RefreshCw, Settings, Trash } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
// import { useRouter } from "next/navigation"
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
import { clearAllWrongWords } from "@/lib/client/wrong-words-client"

interface ReviewInterfaceProps {
  userId: string
}

// @ts-ignore - Suppress TypeScript warnings for unused variables
export function ReviewInterface({ userId }: ReviewInterfaceProps) {
  // userId is used in API calls through session cookies
  const isMobile = useIsMobile()
  const [word, setWord] = useState<any>(null)
  // We still need currentWordItem for the UI to work properly
  const [currentWordItem, setCurrentWordItem] = useState<any>(null)
  const [choices, setChoices] = useState<string[]>([])
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // isLoadingNext is still used in the UI conditions
  const [isLoadingNext, setIsLoadingNext] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [wrongWords, setWrongWords] = useState<any[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0)
  const [totalWrongWords, setTotalWrongWords] = useState<number>(0)
  const [reviewProgress, setReviewProgress] = useState<any>(null)
  // We'll keep completedWords for tracking progress in the current session
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [completedWords, setCompletedWords] = useState<string[]>([])
  const [noWordsFound, setNoWordsFound] = useState<boolean>(false)

  const { toast } = useToast()
  // const router = useRouter()

  // โหลดคำศัพท์ที่ตอบผิด
  const loadWrongWords = useCallback(async () => {
    try {
      setIsLoading(true)

      // โหลดคำศัพท์ที่ตอบผิด
      const response = await fetch("/api/words/wrong")

      if (!response.ok) {
        throw new Error("Failed to load wrong words")
      }

      const data = await response.json()

      // โหลดข้อมูลความคืบหน้าของการทบทวนคำศัพท์
      const progressResponse = await fetch("/api/review/progress")

      if (progressResponse.ok) {
        const progressData = await progressResponse.json()
        setReviewProgress(progressData)
      }

      if (data && data.length > 0) {
        // กรองคำศัพท์ที่มีข้อมูลไม่ครบถ้วนออก
        const validWords = data.filter((item: {
          word?: {
            english?: string;
            thai?: string;
          };
          choices?: string[];
        }) =>
          item.word && item.word.english && item.word.thai && item.choices && item.choices.length > 0
        )

        if (validWords.length > 0) {
          setWrongWords(validWords)
          setTotalWrongWords(validWords.length)
          setWord(validWords[0].word)
          setCurrentWordItem(validWords[0]) // เก็บข้อมูลคำศัพท์ทั้งหมดไว้
          setChoices(validWords[0].choices)
          setCurrentWordIndex(0)
        } else {
          console.error("No valid words found in data:", data)
          setNoWordsFound(true)
        }
      } else {
        setNoWordsFound(true)
      }
    } catch (error) {
      console.error("Error loading wrong words:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดคำศัพท์ที่ตอบผิดได้",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  // รีเซ็ตการทบทวนคำศัพท์ที่ตอบผิด
  const resetAllWrongWords = async () => {
    try {
      setIsLoading(true)

      // ล้างรายการคำที่ทำเสร็จแล้ว
      setCompletedWords([])

      // เริ่มต้นจากคำแรก
      setCurrentWordIndex(0)

      if (wrongWords.length > 0) {
        setWord(wrongWords[0].word)
        setCurrentWordItem(wrongWords[0])
        setChoices(wrongWords[0].choices)
        setSelectedAnswer(null)
        setIsCorrect(null)
        setIsRevealed(false)
      }

      toast({
        title: "เริ่มต้นใหม่",
        description: "เริ่มการทบทวนคำศัพท์ที่ตอบผิดใหม่",
        duration: 3000,
      })
    } catch (error) {
      console.error("Error resetting review:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถเริ่มต้นการทบทวนใหม่ได้",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ลบข้อมูลคำศัพท์ที่ตอบผิดทั้งหมด
  const handleClearAllWrongWords = async () => {
    try {
      setIsLoading(true)

      // ลบข้อมูลคำศัพท์ที่ตอบผิดทั้งหมด
      const result = await clearAllWrongWords()

      toast({
        title: "ลบข้อมูลสำเร็จ",
        description: `ลบข้อมูลคำศัพท์ที่ตอบผิดแล้ว ${result.deletedCount || 0} คำ`,
        duration: 3000,
      })

      // โหลดคำศัพท์ใหม่
      loadWrongWords()
    } catch (error) {
      console.error("Error clearing wrong words:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถลบข้อมูลคำศัพท์ที่ตอบผิดได้",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ตรวจสอบว่าเบราว์เซอร์รองรับการออกเสียงหรือไม่
  const isSpeechSupported = () => {
    return typeof window !== 'undefined' && window.speechSynthesis !== undefined
  }

  // ตรวจสอบว่าอยู่บนมือถือหรือไม่
  const isMobileDevice = () => {
    return typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  // เล่นเสียงออกเสียงคำศัพท์
  const playPronunciation = () => {
    if (isSpeaking || !word || !word.english) return

    // ตรวจสอบว่า speechSynthesis พร้อมใช้งานหรือไม่
    if (!isSpeechSupported()) {
      console.error("Speech synthesis not supported")
      toast({
        title: "ไม่สามารถเล่นได้",
        description: "เบราว์เซอร์ไม่รองรับการออกเสียง",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // แสดงข้อความ
    const isOnMobile = isMobileDevice()
    if (isOnMobile) {
      console.log("Playing on mobile device")
    }

    setIsSpeaking(true)

    // เคลียร์ค้างอยู่ก่อน (cancel)
    window.speechSynthesis.cancel()

    // สร้าง utterance ใหม่
    const utterance = new SpeechSynthesisUtterance(word.english)

    // ตั้งค่าเหมาะสม
    utterance.lang = "en-US"
    utterance.rate = isOnMobile ? 0.7 : 0.8 // ลดความเร็วลงมากกว่าบนมือถือ
    utterance.pitch = 1.0 // ตั้งค่าเสียง
    utterance.volume = 1.0 // ตั้งค่าความดัง

    // เล่นเมื่อเล่นเสร็จ
    utterance.onend = () => {
      console.log("Speech synthesis finished")
      setIsSpeaking(false)
    }

    // เล่นเมื่อมีข้อผิดพลาด
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event)
      setIsSpeaking(false)

      // แสดงข้อความ
      if (isOnMobile) {
        toast({
          title: "ไม่สามารถเล่นบนมือถือได้",
          description: "การออกเสียงบนมือถืออาจไม่ทำงานในบางเบราว์เซอร์",
          variant: "destructive",
          duration: 3000,
        })
      } else {
        toast({
          title: "ไม่สามารถเล่นได้",
          description: "โปรดตรวจสอบว่าเบราว์เซอร์รองรับการออกเสียง",
          variant: "destructive",
          duration: 3000,
        })
      }
    }

    // ใช้ timeout รอให้แน่ใจว่า speechSynthesis พร้อมใช้งาน
    setTimeout(() => {
      try {
        // เล่น
        window.speechSynthesis.speak(utterance)

        // ให้ใช้ workaround แก้การทำงานของ speechSynthesis
        if (isOnMobile) {
          // ใช้ interval รอ speechSynthesis ให้ทำงานต่อเนื่อง
          const intervalId = setInterval(() => {
            if (!window.speechSynthesis.speaking) {
              clearInterval(intervalId)
              setIsSpeaking(false)
              return
            }
            // การกระทำชั่วคราวและเริ่มใหม่จะช่วยให้ speechSynthesis ทำงานต่อเนื่องบนมือถือ
            window.speechSynthesis.pause()
            window.speechSynthesis.resume()
          }, 300)
        }

        // ตั้งเวลาเพื่อเซ็ตสถานะหากไม่ได้รับ onend หรือ onerror
        setTimeout(() => {
          if (isSpeaking) {
            console.log("Resetting speaking state after timeout")
            setIsSpeaking(false)
          }
        }, isOnMobile ? 10000 : 5000) // รอนานขึ้นบนมือถือ
      } catch (error) {
        console.error("Error speaking:", error)
        setIsSpeaking(false)
        toast({
          title: "ไม่สามารถเล่นได้",
          description: "ข้อผิดพลาดขณะพยายามเล่น",
          variant: "destructive",
          duration: 3000,
        })
      }
    }, isOnMobile ? 200 : 100) // รอนานขึ้นบนมือถือ
  }

  // เลือกคำตอบ
  const handleAnswerSelect = async (answer: string) => {
    if (isLoading || !word) return

    setSelectedAnswer(answer)
    const correct = answer === word.thai
    setIsCorrect(correct)

    // ถ้าตอบผิด ให้แสดงข้อความและสามารถตอบใหม่ได้
    if (!correct) {
      toast({
        title: "ไม่ถูกต้อง",
        description: "ลองตอบใหม่อีกครั้ง",
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

    // ถ้าตอบถูก ให้ไปยังคำถัดไป
    try {
      setIsLoading(true)

      toast({
        title: "ถูกต้อง!",
        description: "ตอบถูกต้อง กำลังไปยังคำถัดไป",
        duration: 1500,
      })

      // ไปยังคำถัดไป
      handleNext()
    } catch (error) {
      console.error("Error handling correct answer:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถดำเนินการต่อได้",
        variant: "destructive",
        duration: 3000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // แสดงคำตอบ
  const handleReveal = () => {
    if (!word) return

    setIsRevealed(true)
    setSelectedAnswer(word.thai)

    toast({
      title: "เฉลย",
      description: `"${word.english}" แปลว่า "${word.thai}"`,
      duration: 1500,
    })
  }

  // ข้ามคำนี้
  const handleSkip = () => {
    if (!word || isLoadingNext) return
    handleNext()
  }

  // ไปยังคำถัดไป
  const handleNext = () => {
    if (!word || isLoadingNext) return

    // ถ้ายังมีคำถัดไป
    if (currentWordIndex < wrongWords.length - 1) {
      const nextIndex = currentWordIndex + 1
      setCurrentWordIndex(nextIndex)

      const nextWordData = wrongWords[nextIndex]
      if (nextWordData && nextWordData.word) {
        setWord(nextWordData.word)
        setCurrentWordItem(nextWordData) // เก็บข้อมูลคำศัพท์ทั้งหมดไว้
        setChoices(nextWordData.choices)
        setSelectedAnswer(null)
        setIsCorrect(null)
        setIsRevealed(false)
      } else {
        console.error("Invalid next word data:", nextWordData)
        toast({
          title: "ข้อผิดพลาด",
          description: "ไม่สามารถโหลดคำถัดไปได้",
          variant: "destructive",
          duration: 3000,
        })
      }
    } else {
      // ถ้าไม่มีคำถัดไป ให้แสดงข้อความว่าทบทวนครบรอบแล้ว
      toast({
        title: "ทบทวนครบรอบแล้ว",
        description: "คุณได้ทบทวนครบรอบแล้ว กำลังเริ่มต้นรอบใหม่",
        duration: 3000,
      })

      // ล้างรายการคำที่ทำเสร็จแล้ว
      setCompletedWords([])

      // เริ่มต้นจากคำแรก
      setCurrentWordIndex(0)

      if (wrongWords.length > 0) {
        setWord(wrongWords[0].word)
        setCurrentWordItem(wrongWords[0])
        setChoices(wrongWords[0].choices)
        setSelectedAnswer(null)
        setIsCorrect(null)
        setIsRevealed(false)
      } else {
        // ถ้าไม่มีคำเหลือแล้ว ให้โหลดใหม่ทั้งหมด
        loadWrongWords()
      }
    }
  }

  // ลองตอบใหม่
  const handleTryAgain = () => {
    setSelectedAnswer(null)
    setIsCorrect(null)
  }

  // โหลดคำศัพท์เมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    loadWrongWords()
  }, [loadWrongWords])

  // เล่นเสียงออกเสียงเมื่อคำเปลี่ยน
  useEffect(() => {
    if (word && word.english) {
      const timer = setTimeout(() => {
        playPronunciation()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [word])

  // ถ้าไม่มีคำศัพท์ที่ตอบผิด
  if (noWordsFound) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">ไม่พบคำศัพท์ที่ตอบผิด</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">คุณยังไม่มีคำศัพท์ที่ตอบผิด หรือได้ทบทวนคำศัพท์ทั้งหมดแล้ว</p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Link href="/game">
              <Button>กลับไปเล่นเกม</Button>
            </Link>
            <Link href="/level-select">
              <Button variant="outline">เลือกระดับ</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // ถ้ากำลังโหลด
  if (isLoading && !word) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">กำลังโหลด...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">กรุณารอสักครู่...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ถ้าไม่มีคำศัพท์
  if (!word) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">ไม่พบคำศัพท์</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">ไม่พบคำศัพท์ที่ตอบผิด</p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Link href="/game">
              <Button>กลับไปเล่นเกม</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // คำนวณความคืบหน้า
  const progress = (currentWordIndex / (totalWrongWords || 1)) * 100

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md mb-4 sm:mb-8 px-4">
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs sm:text-sm font-medium text-primary">
              ทบทวนคำศัพท์
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href="/game">
              <Button variant="outline" size={isMobile ? "sm" : "default"} className="flex items-center gap-1 text-xs sm:text-sm">
                <Settings className="h-3 w-3" />
                กลับไปเล่นเกม
              </Button>
            </Link>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size={isMobile ? "sm" : "default"} className="flex items-center gap-1 text-xs sm:text-sm">
                  <RefreshCw className="h-3 w-3" />
                  เริ่มใหม่
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>แน่ใจหรือไม่?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การกระทำนี้จะเริ่มต้นการทบทวนคำศัพท์ที่ตอบผิดใหม่
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAllWrongWords}>
                    เริ่มใหม่
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size={isMobile ? "sm" : "default"} className="flex items-center gap-1 text-xs sm:text-sm">
                  <Trash className="h-3 w-3" />
                  ลบข้อมูล
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>แน่ใจหรือไม่?</AlertDialogTitle>
                  <AlertDialogDescription>
                    การกระทำนี้จะลบข้อมูลคำศัพท์ที่ตอบผิดทั้งหมดออกจากฐานข้อมูล
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAllWrongWords} className="bg-destructive text-destructive-foreground">
                    ลบข้อมูล
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>



        {/* ความคืบหน้าของคำปัจจุบัน */}
        <div className="mb-2">
          <div className="flex justify-between text-xs">
            <span>ความคืบหน้า</span>
            <span>
              {currentWordIndex + 1} / {totalWrongWords} คำ
            </span>
          </div>
          <Progress value={progress} className="h-1.5 sm:h-2" />
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
            {isSpeaking ? "กำลังเล่น..." : "ฟังการออกเสียง"}
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
                disabled={Boolean(isLoading)}
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
              disabled={Boolean((!Boolean(selectedAnswer) && !Boolean(isRevealed)) || Boolean(isLoadingNext) || (Boolean(selectedAnswer) && !Boolean(isCorrect)))}
            >
              {isLoadingNext ? "กำลังโหลด..." : "คำถัดไป"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
