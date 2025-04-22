"use client"

import { useState, useEffect, useCallback } from "react"
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
import { addWrongWord } from "@/lib/client/wrong-words-client"

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
  // สถานะสำหรับการเล่นเกมแบบใหม่
  const [gameWords, setGameWords] = useState<any[]>([]); // เก็บคำศัพท์ทั้งหมดที่โหลดมา
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0); // เก็บ index ของคำปัจจุบัน
  const [currentPage, setCurrentPage] = useState<number>(1); // หน้าปัจจุบันสำหรับ pagination
  const [hasMoreWords, setHasMoreWords] = useState<boolean>(true); // มีคำศัพท์เพิ่มเติมให้โหลดหรือไม่
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false); // กำลังโหลดคำศัพท์เพิ่มหรือไม่

  // เก็บสถานะเดิมไว้เพื่อความเข้ากันได้กับโค้ดเดิม
  // สถานะเหล่านี้ไม่ได้ใช้ในโค้ดใหม่ แต่เก็บไว้เพื่อความเข้ากันได้กับโค้ดเดิม
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [nextWordData, setNextWordData] = useState<any>(null); // เล่มสถานะเพื่อเก็บข้อมูลคำถัดไป
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [stageWords, setStageWords] = useState<any[]>([]); // เก็บคำศัพท์ทั้งหมดของด่าน
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isStageMode, setIsStageMode] = useState<boolean>(false); // โหมดการเล่นแบบดึงคำศัพท์ทั้งหมดของด่าน
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingStage, setIsLoadingStage] = useState<boolean>(false); // สถานะการโหลดคำศัพท์ทั้งหมดของด่าน

  const { toast } = useToast()
  const router = useRouter()

  // ตรวจสอบการสนับสนุนการออกเสียงเมื่อ component โหลด
  useEffect(() => {
    // ตรวจสอบว่า speechSynthesis พร้อมใช้งานหรือไม่
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      // เคลียร์เสียงที่ค้างอยู่ก่อน (สำคัญสำหรับมือถือ)
      window.speechSynthesis.cancel()

      // ทดสอบการออกเสียงโดยไม่มีเสียงจริง (เพื่อกระตุ้นให้เบราว์เซอร์เตรียมพร้อม)
      const testUtterance = new SpeechSynthesisUtterance('')
      testUtterance.volume = 0 // ตั้งค่าความดังเป็น 0 เพื่อไม่ให้มีเสียง
      window.speechSynthesis.speak(testUtterance)

      console.log('Speech synthesis initialized')
    } else {
      console.warn('Speech synthesis not supported in this browser')
    }

    // ล้าง timer เมื่อ component unmount
    return () => {
      if (autoAdvanceTimer) {
        clearTimeout(autoAdvanceTimer)
      }

      // เคลียร์เสียงที่ค้างอยู่เมื่อ component unmount
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
    }
  }, [autoAdvanceTimer])

  // โหลดคำศัพท์แบบใหม่โดยใช้ API /api/words/game
  const loadGameWords = useCallback(async (page = 1, append = false) => {
    try {
      // ตั้งค่าสถานะการโหลด
      if (page === 1) {
        setIsLoading(true);
        // รีเซ็ตสถานะการตอบคำถามเพื่อให้แน่ใจว่าไม่มีสถานะค้าง
        setSelectedAnswer(null);
        setIsCorrect(null);
        setIsRevealed(false);
      } else {
        setIsLoadingMore(true);
      }

      console.log(`Loading game words: page=${page}, append=${append}`);

      // แสดงสถานะการโหลด
      if (page === 1) {
        toast({
          title: "กำลังโหลดคำศัพท์",
          description: "กรุณารอสักครู่...",
          duration: 2000,
        });
      }

      // เรียกใช้ API ใหม่ โดยส่งระดับและด่านปัจจุบันไปด้วย
      // ตรวจสอบ URL parameters ก่อนเพื่อใช้ค่าจาก URL ถ้ามี
      const urlParams = new URLSearchParams(window.location.search);
      const levelParam = urlParams.get('level');
      const stageParam = urlParams.get('stage');

      console.log(`URL parameters: level=${levelParam}, stage=${stageParam}`);

      // ใช้ค่าจาก URL ถ้ามี ไม่เช่นนั้นใช้ค่าจาก progress
      const level = levelParam || currentProgress.currentLevel;
      const stage = stageParam ? parseInt(stageParam) : currentProgress.currentStage;

      console.log(`Using level=${level}, stage=${stage} for API call`);

      let data;
      try {
        const response = await fetch(`/api/words/game?userId=${userId}&page=${page}&limit=20&level=${level}&stage=${stage}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        data = await response.json();
      } catch (fetchError) {
        console.error("Error fetching from API:", fetchError);
        throw new Error(fetchError instanceof Error ? fetchError.message : "Failed to load game words");
      }
      console.log(`Loaded ${data.words?.length || 0} words from API`);

      // ถ้ามีคำศัพท์
      if (data.words && data.words.length > 0) {
        // ตรวจสอบระดับของคำศัพท์ที่ได้รับ
        const requestedLevel = levelParam || currentProgress.currentLevel;
        const requestedStage = stageParam ? parseInt(stageParam) : currentProgress.currentStage;

        // แสดงข้อมูลระดับของคำศัพท์ที่ได้รับ
        console.log(`Received ${data.words.length} words. Checking levels...`);
        console.log(`Requested level: ${requestedLevel}, stage: ${requestedStage}`);

        // แสดงข้อมูลคำศัพท์ที่ได้รับ
        data.words.forEach((wordData: any, index: number) => {
          if (index < 5) { // แสดงแค่ 5 คำแรกเพื่อไม่ให้ log ยาวเกินไป
            console.log(`Word ${index + 1}: ${wordData.word.english}, level: ${wordData.word.level}`);
          }
        });

        // ตรวจสอบว่าคำศัพท์ที่ได้รับตรงกับระดับที่ร้องขอหรือไม่
        const wrongLevelWords = data.words.filter((wordData: any) => wordData.word.level !== requestedLevel);
        if (wrongLevelWords.length > 0) {
          console.warn(`WARNING: Received ${wrongLevelWords.length} words with incorrect level!`);
          console.warn(`Requested level: ${requestedLevel}, but received words from levels: ${[...new Set(wrongLevelWords.map((w: any) => w.word.level))].join(', ')}`);

          // แสดงข้อความแจ้งเตือนผู้ใช้
          toast({
            title: "คำเตือน",
            description: `ได้รับคำศัพท์จากระดับที่ไม่ตรงกับที่เลือก (เลือก ${requestedLevel.toUpperCase()}, ด่าน ${requestedStage})`,
            variant: "destructive",
            duration: 5000,
          });
        }

        // ถ้าเป็นหน้าแรกหรือไม่ได้ต่อท้าย ให้แทนที่คำศัพท์ทั้งหมด
        if (page === 1 || !append) {
          // กรองเฉพาะคำศัพท์ที่ตรงกับระดับที่ร้องขอ
          const filteredWords = data.words.filter((wordData: any) => wordData.word.level === requestedLevel);

          if (filteredWords.length > 0) {
            console.log(`Using ${filteredWords.length} words that match requested level ${requestedLevel}`);
            setGameWords(filteredWords);
            setCurrentWordIndex(0);

            // เซ็ตคำปัจจุบันและตัวเลือก
            setWord(filteredWords[0].word);
            setChoices(filteredWords[0].choices);
            setSelectedAnswer(null);
            setIsCorrect(null);
            setIsRevealed(false);

            console.log(`Set current word to: ${filteredWords[0].word.english}, level: ${filteredWords[0].word.level}`);
          } else {
            // ถ้าไม่มีคำศัพท์ที่ตรงกับระดับที่ร้องขอ ให้ใช้คำศัพท์ทั้งหมด
            console.warn(`No words match requested level ${requestedLevel}. Using all received words.`);
            setGameWords(data.words);
            setCurrentWordIndex(0);

            // เซ็ตคำปัจจุบันและตัวเลือก
            setWord(data.words[0].word);
            setChoices(data.words[0].choices);
            setSelectedAnswer(null);
            setIsCorrect(null);
            setIsRevealed(false);

            console.log(`Set current word to: ${data.words[0].word.english}, level: ${data.words[0].word.level}`);
          }
        } else {
          // ถ้าเป็นการโหลดเพิ่มเติม ให้ต่อท้ายคำศัพท์เดิม
          // กรองเฉพาะคำศัพท์ที่ตรงกับระดับที่ร้องขอ
          const filteredWords = data.words.filter((wordData: any) => wordData.word.level === requestedLevel);

          if (filteredWords.length > 0) {
            console.log(`Appending ${filteredWords.length} words that match requested level ${requestedLevel}`);
            setGameWords(prev => [...prev, ...filteredWords]);
          } else {
            console.warn(`No words match requested level ${requestedLevel} for append. Using all received words.`);
            setGameWords(prev => [...prev, ...data.words]);
          }
          console.log(`Appended ${data.words.length} words to existing list`);
        }

        // อัพเดตหน้าปัจจุบันและสถานะว่ามีคำศัพท์เพิ่มเติมหรือไม่
        setCurrentPage(page);
        setHasMoreWords(data.hasMore);

        // ตรวจสอบว่ามีการส่งข้อมูลระดับและด่านกลับมาด้วย
        if (data.level && data.stage) {
          console.log(`Server returned level: ${data.level}, stage: ${data.stage}`);
        }

        // อัพเดตความคืบหน้า
        if (data.progress) {
          setCurrentProgress(data.progress);
        }

        if (page === 1) {
          toast({
            title: "โหลดคำศัพท์สำเร็จ",
            description: `โหลดคำศัพท์ ${data.words.length} คำสำเร็จแล้ว`,
            duration: 2000,
          });
        }
      } else {
        // ถ้าไม่มีคำศัพท์
        setHasMoreWords(false);
        console.log('No words found or empty response');

        if (page === 1) {
          toast({
            title: "ไม่พบคำศัพท์",
            description: "ไม่พบคำศัพท์ในระดับนี้",
            variant: "destructive",
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error("Error loading game words:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถโหลดคำศัพท์ได้",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      // รีเซ็ตสถานะการโหลดในทุกกรณี
      if (page === 1) {
        setIsLoading(false);
        console.log('Reset loading state after loading words');
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [userId, toast, setWord, setChoices, setSelectedAnswer, setIsCorrect, setIsRevealed, setCurrentProgress]);

  // โหลดคำศัพท์ทั้งหมดของด่าน (เก็บไว้เพื่อความเข้ากันได้กับโค้ดเดิม)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const loadStageWords = useCallback(async () => {
    if (isLoadingStage) return;

    try {
      setIsLoadingStage(true);
      toast({
        title: "กำลังโหลดคำศัพท์ทั้งหมดของด่าน",
        description: "กรุณารอสักครู่...",
        duration: 2000,
      });

      const response = await fetch("/api/words/stage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          level: currentProgress.currentLevel,
          stage: currentProgress.currentStage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load stage words");
      }

      const data = await response.json();

      if (data.words && data.words.length > 0) {
        setStageWords(data.words);
        setCurrentWordIndex(0);
        setIsStageMode(true);

        // เริ่มเล่นด้วยคำแรก
        const firstWordData = data.words[0];
        setWord(firstWordData.word);
        setChoices(firstWordData.choices);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setIsRevealed(false);

        toast({
          title: "โหลดคำศัพท์สำเร็จ",
          description: `โหลดคำศัพท์ทั้งหมด ${data.words.length} คำสำเร็จแล้ว`,
          duration: 2000,
        });
      } else {
        toast({
          title: "ไม่พบคำศัพท์",
          description: "ไม่พบคำศัพท์ในด่านนี้",
          variant: "destructive",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error loading stage words:", error);
      toast({
        title: "ข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถโหลดคำศัพท์ได้",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoadingStage(false);
    }
  }, [userId, currentProgress.currentLevel, currentProgress.currentStage, isLoadingStage, toast]);

  // ข้ามไปคำถัดไปในโหมดด่าน
  const handleSkipWord = useCallback(() => {
    if (!isStageMode || stageWords.length === 0) return;

    // เพิ่ม index และเปลี่ยนไปคำถัดไป
    const nextIndex = (currentWordIndex + 1) % stageWords.length;
    setCurrentWordIndex(nextIndex);

    // เปลี่ยนไปคำถัดไป
    const nextWordData = stageWords[nextIndex];
    setWord(nextWordData.word);
    setChoices(nextWordData.choices);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setIsRevealed(false);
  }, [isStageMode, stageWords, currentWordIndex]);

  // ผ่านคำนี้ไป (ไม่บันทึกว่าเรียนแล้ว)
  const handlePassWord = useCallback(() => {
    // ทำเหมือนกับ handleSkipWord แต่ไม่บันทึกว่าเรียนแล้ว
    handleSkipWord();
  }, [handleSkipWord])

  // ตรวจสอบว่าเบราว์เซอร์รองรับการออกเสียงหรือไม่
  const isSpeechSupported = () => {
    return typeof window !== 'undefined' && window.speechSynthesis !== undefined
  }

  // ตรวจสอบว่าอยู่บนมือถือหรือไม่
  const isMobileDevice = () => {
    return typeof window !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  }

  const playPronunciation = () => {
    if (isSpeaking || !word || !word.english) return

    // ตรวจสอบว่า speechSynthesis พร้อมใช้งานหรือไม่
    if (!isSpeechSupported()) {
      console.error("Speech synthesis not supported")
      toast({
        title: "ไม่สามารถเล่นเสียงได้",
        description: "อุปกรณ์ของคุณไม่รองรับการออกเสียง",
        variant: "destructive",
        duration: 3000,
      })
      return
    }

    // แสดงข้อความเตือนสำหรับมือถือ
    const isOnMobile = isMobileDevice()
    if (isOnMobile) {
      console.log("Playing on mobile device")
    }

    setIsSpeaking(true)

    // เคลียร์เสียงที่ค้างอยู่ก่อน (สำคัญสำหรับมือถือ)
    window.speechSynthesis.cancel()

    // สร้าง utterance ใหม่
    const utterance = new SpeechSynthesisUtterance(word.english)

    // ตั้งค่าที่เหมาะสมกับมือถือ
    utterance.lang = "en-US"
    utterance.rate = isOnMobile ? 0.7 : 0.8 // ลดความเร็วลงมากกว่าบนมือถือ
    utterance.pitch = 1.0 // ตั้งค่าระดับเสียงปกติ
    utterance.volume = 1.0 // ตั้งค่าความดังสูงสุด

    // เพิ่มการจัดการเมื่อเล่นเสียงเสร็จ
    utterance.onend = () => {
      console.log("Speech synthesis finished")
      setIsSpeaking(false)
    }

    // เพิ่มการจัดการเมื่อเกิดข้อผิดพลาด
    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event)
      setIsSpeaking(false)

      // แสดงข้อความเตือนสำหรับมือถือ
      if (isOnMobile) {
        toast({
          title: "ไม่สามารถเล่นเสียงบนมือถือได้",
          description: "การออกเสียงบนมือถืออาจไม่ทำงานในบางเบราว์เซอร์",
          variant: "destructive",
          duration: 3000,
        })
      } else {
        toast({
          title: "ไม่สามารถเล่นเสียงได้",
          description: "โปรดตรวจสอบว่าอุปกรณ์ของคุณรองรับการออกเสียง",
          variant: "destructive",
          duration: 3000,
        })
      }
    }

    // ใช้ timeout เพื่อให้แน่ใจว่า speechSynthesis พร้อมใช้งาน
    setTimeout(() => {
      try {
        // เล่นเสียง
        window.speechSynthesis.speak(utterance)

        // สำหรับมือถือ ให้ใช้ workaround เพื่อแก้ปัญหาการหยุดทำงานของ speechSynthesis
        if (isOnMobile) {
          // ใช้ interval เพื่อกระตุ้น speechSynthesis ให้ทำงานต่อเนื่อง
          const intervalId = setInterval(() => {
            if (!window.speechSynthesis.speaking) {
              clearInterval(intervalId)
              setIsSpeaking(false)
              return
            }
            // การหยุดชั่วคราวและเริ่มใหม่จะช่วยให้ speechSynthesis ทำงานต่อเนื่องบนมือถือ
            window.speechSynthesis.pause()
            window.speechSynthesis.resume()
          }, 300)
        }

        // ตั้งเวลาเพื่อรีเซ็ตสถานะหากไม่มีการเรียก onend หรือ onerror
        setTimeout(() => {
          if (isSpeaking) {
            console.log("Resetting speaking state after timeout")
            setIsSpeaking(false)
          }
        }, isOnMobile ? 10000 : 5000) // รอนานขึ้นสำหรับมือถือ
      } catch (error) {
        console.error("Error speaking:", error)
        setIsSpeaking(false)
        toast({
          title: "ไม่สามารถเล่นเสียงได้",
          description: "เกิดข้อผิดพลาดขณะพยายามเล่นเสียง",
          variant: "destructive",
          duration: 3000,
        })
      }
    }, isOnMobile ? 200 : 100) // รอนานขึ้นสำหรับมือถือ
  }

  // ก์ข้อมูลคำถัดไปแต่ไม่แสดงผล (โหลดคำศัพท์หลายคำล่วงหน้า)
  const prefetchNextWord = async (currentWordId: string) => {
    try {
      // ใช้ AbortController เพื่อให้สามารถยกเลิกการร้องขอได้ถ้าจำเป็น
      const controller = new AbortController();
      const signal = controller.signal;

      // ตั้งเวลาหมดเวลาสำหรับการร้องขอ
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 วินาที

      // ตรวจสอบ URL parameters ก่อนเพื่อใช้ค่าจาก URL ถ้ามี
      const urlParams = new URLSearchParams(window.location.search);
      const levelParam = urlParams.get('level');
      const stageParam = urlParams.get('stage');

      console.log(`URL parameters in prefetchNextWord: level=${levelParam}, stage=${stageParam}`);

      // เพิ่ม cache-control เพื่อให้แน่ใจว่าไม่ใช้ข้อมูลจาก cache
      const response = await fetch("/api/words/next", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache"
        },
        body: JSON.stringify({
          userId,
          currentWordId,
          prefetchCount: 3, // โหลดคำศัพท์ล่วงหน้า 3 คำ
          level: levelParam || undefined,
          stage: stageParam || undefined
        }),
        signal, // ใช้ signal จาก AbortController
      })

      // ยกเลิกการตั้งเวลา
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error("Failed to get next word")
      }

      const data = await response.json()

      // เก็บข้อมูลคำศัพท์ที่โหลดล่วงหน้า
      setNextWordData(data)
      return data
    } catch (error) {
      // ถ้าเป็นการยกเลิกโดย AbortController ไม่ต้องแสดงข้อผิดพลาด
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Prefetch request was aborted due to timeout');
      } else {
        console.error("Error prefetching next word:", error)
      }
      return null
    }
  }

  const fetchNextWord = async (currentWordId: string) => {
    try {
      setIsLoadingNext(true)

      // รีเซ็ตสถานะการตอบคำถาม
      setSelectedAnswer(null)
      setIsCorrect(null)
      setIsRevealed(false)

      console.log(`Fetching next word after: ${currentWordId}`);

      // ถ้าข้อมูลคำถัดไปไว้ล่วงหน้าแล้ว ให้ใช้ข้อมูลนั้นเลย
      let data = nextWordData

      // ถ้าไม่มีข้อมูลคำถัดไป ให้ขอข้อมูลใหม่
      if (!data) {
        // แสดงสถานะการโหลดคำศัพท์ทั้งหมดในด่าน
        toast({
          title: "กำลังโหลดคำศัพท์",
          description: "กำลังโหลดคำศัพท์ทั้งหมดในด่าน กรุณารอสักครู่...",
          duration: 3000,
        });

        try {
          // ใช้ AbortController เพื่อให้สามารถยกเลิกการร้องขอได้ถ้าจำเป็น
          const controller = new AbortController();
          const signal = controller.signal;

          // ตั้งเวลาหมดเวลาสำหรับการร้องขอ
          const timeoutId = setTimeout(() => controller.abort(), 15000); // เพิ่มเวลาเป็น 15 วินาทีเพราะต้องโหลดคำศัพท์หลายคำ

          // ตรวจสอบ URL parameters ก่อนเพื่อใช้ค่าจาก URL ถ้ามี
          const urlParams = new URLSearchParams(window.location.search);
          const levelParam = urlParams.get('level');
          const stageParam = urlParams.get('stage');

          console.log(`URL parameters in fetchNextWord: level=${levelParam}, stage=${stageParam}`);

          const response = await fetch("/api/words/next", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache"
            },
            body: JSON.stringify({
              userId,
              currentWordId,
              prefetchCount: 100, // โหลดคำศัพท์ทั้งหมดในด่าน (100 คำ)
              level: levelParam || undefined,
              stage: stageParam || undefined
            }),
            signal, // ใช้ signal จาก AbortController
          })

          // ยกเลิกการตั้งเวลา
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error("Failed to get next word")
          }

          data = await response.json()
          console.log(`Fetched new word data: ${data.word ? data.word.english : 'no word'}`)
        } catch (fetchError) {
          console.error("Error fetching next word:", fetchError);
          // ในกรณีที่เกิดข้อผิดพลาดในการดึงข้อมูล ให้แน่ใจว่าสถานะการโหลดถูกรีเซ็ต
          setIsLoading(false);
          setIsLoadingNext(false);
          throw fetchError; // โยนข้อผิดพลาดไปยัง catch ด้านนอก
        }
      } else {
        console.log(`Using prefetched word data: ${data.word ? data.word.english : 'no word'}`)
      }

      // เซ็ตข้อมูลคำถัดไปไว้ล่วงหน้า
      // ถ้ามีคำศัพท์ที่โหลดล่วงหน้ามาแล้ว ให้เก็บไว้
      if (data.nextWords && data.nextWords.length > 0) {
        // แสดงข้อความเมื่อโหลดคำศัพท์ทั้งหมดเสร็จ
        if (data.totalWords && data.totalWords > 50) { // ถ้ามีคำศัพท์มากกว่า 50 คำ แสดงว่าโหลดทั้งด่าน
          toast({
            title: "โหลดคำศัพท์สำเร็จ",
            description: `โหลดคำศัพท์ทั้งหมด ${data.totalWords} คำสำเร็จแล้ว (ยังไม่ได้เรียน ${data.uncompletedCount} คำ)`,
            duration: 3000,
          });
        }

        // เก็บคำศัพท์แรกจาก nextWords ไว้ใช้ต่อไป
        setNextWordData({
          word: data.nextWords[0].word,
          choices: data.nextWords[0].choices,
          nextWords: data.nextWords.slice(1), // เก็บคำศัพท์ที่เหลือไว้
          totalWords: data.totalWords,
          uncompletedCount: data.uncompletedCount,
          completedCount: data.completedCount
        });
      } else {
        // ถ้าไม่มีคำศัพท์ที่โหลดล่วงหน้ามา ให้ล้างข้อมูลเดิม
        setNextWordData(null);

        // เริ่ม prefetch คำถัดไปทันทีหลังจากได้คำปัจจุบัน
        if (data.word) {
          setTimeout(() => {
            prefetchNextWord(data.word._id);
          }, 100); // รอ 100ms ก่อน prefetch เพื่อให้คำปัจจุบันโหลดเสร็จก่อน
        }
      }

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
      // รีเซ็ตสถานะการโหลดทั้งหมด
      setIsLoadingNext(false)
      setIsLoading(false)
      console.log('Reset loading states after fetchNextWord')
    }
  }

  const handleAnswerSelect = async (answer: string) => {
    if (isLoading || !word) return

    setSelectedAnswer(answer)
    const correct = answer === word.thai
    setIsCorrect(correct)

    // ถ้าตอบผิด ให้แสดงข้อความและสามารถตอบใหม่ได้
    if (!correct) {
      // บันทึกคำตอบผิดลงในฐานข้อมูล
      try {
        await addWrongWord(userId, word)
      } catch (error) {
        console.error("Error saving wrong word:", error)
      }
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
      console.log(`Updating progress for word: ${word.english}, id: ${word._id}`)

      // สร้างฟังก์ชันสำหรับอัพเดตความคืบหน้าพร้อมระบบ retry
      const updateProgress = async (retryCount = 0, maxRetries = 3) => {
        try {
          // ตรวจสอบ URL parameters เพื่อใช้ค่าจาก URL ถ้ามี
          const urlParams = new URLSearchParams(window.location.search);
          const levelParam = urlParams.get('level');
          const stageParam = urlParams.get('stage');

          console.log(`URL parameters in updateProgress: level=${levelParam}, stage=${stageParam}`);

          const response = await fetch("/api/progress", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              wordId: word._id,
              correct: true,
              selectedLevel: levelParam || undefined,
              selectedStage: stageParam || undefined,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Progress update failed with status ${response.status}: ${errorText}`)
            throw new Error(`Failed to update progress: ${response.status}`)
          }

          const data = await response.json()
          console.log(`Progress update successful for word: ${word.english}`)

          // อัพเดตความคืบหน้าในส่วนของ client-side
          setCurrentProgress(data.progress)

          // อัพเดตสถิติแบบ optimistic update
          if (currentStats) {
            const updatedStats = { ...currentStats }
            updatedStats.completedWords += 1

            const levelIndex = updatedStats.levels.findIndex((l) => l.level === word.level)
            if (levelIndex !== -1) {
              updatedStats.levels[levelIndex].completed += 1

              const stageIndex = updatedStats.levels[levelIndex].stages.findIndex(
                (s) => s.stage === currentProgress.currentStage,
              )
              if (stageIndex !== -1) {
                updatedStats.levels[levelIndex].stages[stageIndex].completed += 1
              }
            }

            setCurrentStats(updatedStats)
          }

          // ถ้าใช้ gameWords ให้อัพเดตสถานะว่าคำนี้เรียนแล้ว
          if (gameWords.length > 0 && currentWordIndex < gameWords.length) {
            const updatedGameWords = [...gameWords]
            updatedGameWords[currentWordIndex] = {
              ...updatedGameWords[currentWordIndex],
              completed: true
            }
            setGameWords(updatedGameWords)
          }

          return true
        } catch (error) {
          console.error(`Progress update attempt ${retryCount + 1} failed:`, error)

          // ถ้ายังไม่เกินจำนวนครั้งที่ retry ให้ลองใหม่
          if (retryCount < maxRetries) {
            console.log(`Retrying progress update (${retryCount + 1}/${maxRetries})...`)
            // รอเวลาก่อน retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000)
            await new Promise(resolve => setTimeout(resolve, delay))
            return updateProgress(retryCount + 1, maxRetries)
          } else {
            console.error(`Failed to update progress after ${maxRetries} attempts`)
            toast({
              title: "ข้อผิดพลาด",
              description: "ไม่สามารถบันทึกความคืบหน้าได้ โปรดตรวจสอบการเชื่อมต่อ",
              variant: "destructive",
              duration: 3000,
            })
            return false
          }
        }
      }

      // เริ่มอัพเดตความคืบหน้าและเปลี่ยนไปคำถัดไป
      updateProgress().then(() => {
        // เปลี่ยนไปคำถัดไปไม่ว่าจะอัพเดตสำเร็จหรือไม่
        handleNext()
        // ต้องแน่ใจว่า isLoading ถูกรีเซ็ตหลังจากเปลี่ยนไปคำถัดไป
        setIsLoading(false)
      }).catch(error => {
        console.error("Error in updateProgress:", error)
        // ต้องแน่ใจว่า isLoading ถูกรีเซ็ตในกรณีที่เกิดข้อผิดพลาด
        setIsLoading(false)
        toast({
          title: "ข้อผิดพลาด",
          description: "เกิดข้อผิดพลาดในการบันทึกความคืบหน้า แต่คุณสามารถเล่นต่อได้",
          variant: "destructive",
          duration: 3000,
        })
      })
    } catch (error) {
      console.error("Error in handleAnswerSelect:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "เกิดข้อผิดพลาดในการประมวลผล โปรดลองอีกครั้ง",
        variant: "destructive",
        duration: 3000,
      })
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
      console.log(`Updating progress for revealed word: ${word.english}, id: ${word._id}`)

      // สร้างฟังก์ชันสำหรับอัพเดตความคืบหน้าพร้อมระบบ retry
      const updateRevealedProgress = async (retryCount = 0, maxRetries = 3) => {
        try {
          // ตรวจสอบ URL parameters เพื่อใช้ค่าจาก URL ถ้ามี
          const urlParams = new URLSearchParams(window.location.search);
          const levelParam = urlParams.get('level');
          const stageParam = urlParams.get('stage');

          console.log(`URL parameters in updateRevealedProgress: level=${levelParam}, stage=${stageParam}`);

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
              selectedLevel: levelParam || undefined,
              selectedStage: stageParam || undefined,
            }),
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.error(`Revealed progress update failed with status ${response.status}: ${errorText}`)
            throw new Error(`Failed to update revealed progress: ${response.status}`)
          }

          const data = await response.json()
          console.log(`Revealed progress update successful for word: ${word.english}`)

          // ปรับปรุงความคืบหน้า
          setCurrentProgress(data.progress)

          // ถ้าใช้ gameWords ให้อัพเดตสถานะว่าคำนี้เห็นแล้ว
          if (gameWords.length > 0 && currentWordIndex < gameWords.length) {
            const updatedGameWords = [...gameWords];
            updatedGameWords[currentWordIndex] = {
              ...updatedGameWords[currentWordIndex],
              revealed: true
            };
            setGameWords(updatedGameWords);
          }

          return true
        } catch (error) {
          console.error(`Revealed progress update attempt ${retryCount + 1} failed:`, error)

          // ถ้ายังไม่เกินจำนวนครั้งที่ retry ให้ลองใหม่
          if (retryCount < maxRetries) {
            console.log(`Retrying revealed progress update (${retryCount + 1}/${maxRetries})...`)
            // รอเวลาก่อน retry (exponential backoff)
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000)
            await new Promise(resolve => setTimeout(resolve, delay))
            return updateRevealedProgress(retryCount + 1, maxRetries)
          } else {
            console.error(`Failed to update revealed progress after ${maxRetries} attempts`)
            // ไม่แสดง toast เพื่อไม่รบกวนผู้ใช้มากเกินไป
            return false
          }
        }
      }

      // เริ่มอัพเดตความคืบหน้า
      updateRevealedProgress()
    } catch (error) {
      console.error("Error in handleReveal:", error)
    }
  }

  const handleSkip = async () => {
    if (!word || isLoadingNext) return

    // ยกเลิก timer ถ้ามีอยู่
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
      setAutoAdvanceTimer(null)
    }

    // รีเซ็ตสถานะการตอบคำถาม
    setSelectedAnswer(null)
    setIsCorrect(null)
    setIsRevealed(false)

    // ใช้วิธีเดียวกับ handleNext
    // ถ้ามีคำศัพท์ใน gameWords และยังไม่ถึงคำสุดท้าย
    if (gameWords.length > 0 && currentWordIndex < gameWords.length - 1) {
      try {
        // ไปยังคำถัดไปใน gameWords
        const nextIndex = currentWordIndex + 1;
        setCurrentWordIndex(nextIndex);

        const nextWordData = gameWords[nextIndex];
        setWord(nextWordData.word);
        setChoices(nextWordData.choices);

        console.log(`Skipping to next word: ${nextWordData.word.english}`);

        // ถ้าเหลือคำศัพท์น้อยกว่า 5 คำ ให้โหลดเพิ่ม
        if (nextIndex >= gameWords.length - 5 && hasMoreWords) {
          loadGameWords(currentPage + 1, true);
        }
      } catch (error) {
        console.error("Error skipping to next word:", error);
        // ในกรณีที่เกิดข้อผิดพลาด ให้แน่ใจว่าสถานะการโหลดถูกรีเซ็ต
        setIsLoading(false);
        setIsLoadingNext(false);
      }
      return;
    }

    // ถ้าไม่มีคำศัพท์ใน gameWords หรือถึงคำสุดท้ายแล้ว ให้โหลดคำศัพท์ใหม่
    try {
      if (hasMoreWords) {
        loadGameWords(currentPage + 1, false);
      } else {
        // ถ้าไม่มีคำศัพท์เหลือแล้ว ให้ใช้วิธีเดิม
        await fetchNextWord(word._id)
      }
    } catch (error) {
      console.error("Error loading more words during skip:", error);
      // ในกรณีที่เกิดข้อผิดพลาด ให้แน่ใจว่าสถานะการโหลดถูกรีเซ็ต
      setIsLoading(false);
      setIsLoadingNext(false);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดคำศัพท์เพิ่มเติมได้ โปรดลองอีกครั้ง",
        variant: "destructive",
        duration: 3000,
      });
    }
  }

  const handleNext = async () => {
    if (!word || isLoadingNext) return

    // ยกเลิก timer ถ้ามีอยู่
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
      setAutoAdvanceTimer(null)
    }

    // รีเซ็ตสถานะการตอบคำถาม
    setSelectedAnswer(null)
    setIsCorrect(null)
    setIsRevealed(false)

    // ถ้ามีคำศัพท์ใน gameWords และยังไม่ถึงคำสุดท้าย
    if (gameWords.length > 0 && currentWordIndex < gameWords.length - 1) {
      try {
        // ไปยังคำถัดไปใน gameWords
        const nextIndex = currentWordIndex + 1;
        setCurrentWordIndex(nextIndex);

        const nextWordData = gameWords[nextIndex];
        setWord(nextWordData.word);
        setChoices(nextWordData.choices);

        console.log(`Moving to next word: ${nextWordData.word.english}`);

        // ถ้าเหลือคำศัพท์น้อยกว่า 5 คำ ให้โหลดเพิ่ม
        if (nextIndex >= gameWords.length - 5 && hasMoreWords) {
          loadGameWords(currentPage + 1, true);
        }
      } catch (error) {
        console.error("Error moving to next word:", error);
        // ในกรณีที่เกิดข้อผิดพลาด ให้แน่ใจว่าสถานะการโหลดถูกรีเซ็ต
        setIsLoading(false);
        setIsLoadingNext(false);
      }
      return;
    }

    // ถ้าไม่มีคำศัพท์ใน gameWords หรือถึงคำสุดท้ายแล้ว ให้โหลดคำศัพท์ใหม่
    try {
      if (hasMoreWords) {
        loadGameWords(currentPage + 1, false);
      } else {
        // ถ้าไม่มีคำศัพท์เหลือแล้ว ให้ใช้วิธีเดิม
        await fetchNextWord(word._id)
      }
    } catch (error) {
      console.error("Error loading more words:", error);
      // ในกรณีที่เกิดข้อผิดพลาด ให้แน่ใจว่าสถานะการโหลดถูกรีเซ็ต
      setIsLoading(false);
      setIsLoadingNext(false);
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดคำศัพท์เพิ่มเติมได้ โปรดลองอีกครั้ง",
        variant: "destructive",
        duration: 3000,
      });
    }
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

      // ดึงข้อมูลสถิติใหม่
      try {
        const statsResponse = await fetch(`/api/stats?userId=${userId}`)
        if (statsResponse.ok) {
          const newStats = await statsResponse.json()
          setCurrentStats(newStats)
        }
      } catch (statsError) {
        console.error("Error fetching updated stats:", statsError)
      }

      toast({
        title: "ปรับปรุงสำเร็จ",
        description: `ปรับปรุงความคืบหน้าของ ${levelToReset.toUpperCase()} เรียบร้อยแล้ว`,
        duration: 2000,
      })

      // ดึงคำศัพท์ใหม่หลังจากรีเซ็ตระดับ
      if (word) {
        try {
          const nextWordResponse = await fetch("/api/words/next", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              currentWordId: word._id,
            }),
          })

          if (nextWordResponse.ok) {
            const nextWordData = await nextWordResponse.json()
            if (nextWordData.word) {
              setWord(nextWordData.word)
              setChoices(nextWordData.choices)
              setSelectedAnswer(null)
              setIsCorrect(null)
              setIsRevealed(false)
            }
          }
        } catch (nextWordError) {
          console.error("Error fetching next word after reset:", nextWordError)
        }
      } else {
        // ถ้าไม่มีคำปัจจุบัน ให้รีเฟรชหน้าเพื่อโหลดคำใหม่
        router.refresh()
      }
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

  // โหลดคำศัพท์เมื่อคอมโพเนนต์โหลด
  useEffect(() => {
    // โหลดคำศัพท์แบบใหม่เมื่อคอมโพเนนต์โหลด
    if (initialWord && initialWord._id) {
      // ใช้คำศัพท์เริ่มต้นที่ส่งมาจาก server ก่อน
      setWord(initialWord);
      setChoices(initialChoices);

      console.log(`Initial word: ${initialWord.english}, level: ${initialWord.level}`);
      console.log(`Current progress - level: ${progress.currentLevel}, stage: ${progress.currentStage}`);

      // ตรวจสอบ URL parameters ก่อนเพื่อใช้ค่าจาก URL ถ้ามี
      const urlParams = new URLSearchParams(window.location.search);
      const levelParam = urlParams.get('level');
      const stageParam = urlParams.get('stage');

      console.log(`URL parameters in useEffect: level=${levelParam}, stage=${stageParam}`);

      // ตรวจสอบว่าระดับของคำเริ่มต้นตรงกับระดับใน progress หรือไม่
      if (initialWord.level !== progress.currentLevel) {
        console.log(`WARNING: Initial word level (${initialWord.level}) does not match progress level (${progress.currentLevel})`);
        console.log(`Using progress level (${progress.currentLevel}) and stage (${progress.currentStage}) for loading words`);
      }

      // โหลดคำศัพท์เพิ่มเติมด้วย API ใหม่ โดยใช้ระดับและด่านจาก URL ถ้ามี ไม่เช่นนั้นใช้จาก progress
      loadGameWords(1, false);
    }
  }, [initialWord, initialChoices, loadGameWords, progress])

  // เก็บไว้เพื่อความเข้ากันได้กับโค้ดเดิม
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
          <CardFooter className="flex justify-center gap-4 flex-wrap">
            <Link href="/level-select">
              <Button>เลือกระดับและด่าน</Button>
            </Link>
            <Link href="/manage-words">
              <Button variant="outline">คำศัพท์</Button>
            </Link>
            <Link href="/review">
              <Button variant="secondary">ทบทวนคำศัพท์ที่ตอบผิด</Button>
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
            <p className="text-center text-muted-foreground mb-6">ได้รับคำศัพท์ครบในด่านนี้แล้ว ไปเล่นด่านถัดไปหรือทบทวนคำศัพท์ที่ตอบผิด</p>
            <div className="flex justify-center gap-4 flex-wrap">
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
              <Link href="/review">
                <Button variant="secondary">ทบทวนคำศัพท์ที่ตอบผิด</Button>
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
            <p className="text-center text-muted-foreground mb-6">ได้รับคำศัพท์ครบในระดับนี้แล้ว ไปเล่นด่านถัดไปหรือทบทวนคำศัพท์ที่ตอบผิด</p>
            <div className="flex justify-center gap-4 flex-wrap">
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
              <Link href="/review">
                <Button variant="secondary">ทบทวนคำศัพท์ที่ตอบผิด</Button>
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
                disabled={Boolean(isLoading) || Boolean(isLoadingNext)}
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
              disabled={!!selectedAnswer || isRevealed || isLoading || isLoadingNext}
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
              {isLoadingNext ? "โหลด..." : "คำถัดไป"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

