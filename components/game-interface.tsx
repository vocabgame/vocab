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

  // เพิ่มสถานะสำหรับการเล่นแบบดึงคำศัพท์ทั้งหมดของด่าน
  const [stageWords, setStageWords] = useState<any[]>([]); // เก็บคำศัพท์ทั้งหมดของด่าน
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0); // เก็บ index ของคำปัจจุบัน
  const [isStageMode, setIsStageMode] = useState<boolean>(false); // โหมดการเล่นแบบดึงคำศัพท์ทั้งหมดของด่าน
  const [isLoadingStage, setIsLoadingStage] = useState<boolean>(false); // สถานะการโหลดคำศัพท์ทั้งหมดของด่าน

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

  // โหลดคำศัพท์ทั้งหมดของด่าน
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
    // ถ้ามีคำศัพท์ที่โหลดมาแล้วใน nextWordData ให้ใช้คำศัพท์นั้น
    if (nextWordData && nextWordData.nextWords && nextWordData.nextWords.length > 0) {
      // ใช้คำถัดไปจาก nextWords
      setWord(nextWordData.nextWords[0].word);
      setChoices(nextWordData.nextWords[0].choices);

      // อัพเดต nextWordData ให้เก็บคำที่เหลือ
      setNextWordData({
        ...nextWordData,
        word: nextWordData.nextWords[0].word,
        choices: nextWordData.nextWords[0].choices,
        nextWords: nextWordData.nextWords.slice(1)
      });

      // รีเซ็ตสถานะ
      setSelectedAnswer(null);
      setIsCorrect(null);
      setIsRevealed(false);

      console.log("Using next word from prefetched data");
      return;
    }

    // ถ้าอยู่ในโหมดใช้คำศัพท์ที่โหลดมาแล้ว
    if (isStageMode && stageWords.length > 0) {
      // เพิ่ม index และเปลี่ยนไปคำถัดไป
      const nextIndex = (currentWordIndex + 1) % stageWords.length;
      setCurrentWordIndex(nextIndex);

      // เปลี่ยนไปคำถัดไป
      const nextWord = stageWords[nextIndex];
      setWord(nextWord.word);
      setChoices(nextWord.choices);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setIsRevealed(false);

      console.log(`Skipped to word ${nextIndex + 1}/${stageWords.length}`);
      return;
    }

    console.log("No words available to skip to");
  }, [isStageMode, stageWords, currentWordIndex, nextWordData]);

  // ผ่านคำนี้ไป (ไม่บันทึกว่าเรียนแล้ว)
  const handlePassWord = useCallback(() => {
    // ทำเหมือนกับ handleSkipWord แต่ไม่บันทึกว่าเรียนแล้ว
    handleSkipWord();
  }, [handleSkipWord])

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

  // ก์ข้อมูลคำถัดไปแต่ไม่แสดงผล (โหลดคำศัพท์หลายคำล่วงหน้า)
  const prefetchNextWord = async (currentWordId: string, batchSize = 10) => {
    try {
      // ลองดึงข้อมูลจาก cache ก่อน
      const cacheKey = `vocab_cache_${userId}_${currentProgress.currentLevel}_${currentProgress.currentStage}`;
      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData && parsedData.nextWords && parsedData.nextWords.length > 0) {
            console.log(`Using ${parsedData.nextWords.length} words from cache`);
            setNextWordData(parsedData);
            return parsedData;
          }
        }
      } catch (cacheError) {
        console.error("Error reading from cache:", cacheError);
      }

      console.log(`Prefetching next words for word ID: ${currentWordId} (batch size: ${batchSize})`);

      // ใช้ AbortController เพื่อให้สามารถยกเลิกการร้องขอได้ถ้าจำเป็น
      const controller = new AbortController();
      const signal = controller.signal;

      // ตั้งเวลาหมดเวลาสำหรับการร้องขอ
      const timeoutId = setTimeout(() => controller.abort(), 8000); // ลดเวลาลงเป็น 8 วินาทีเพื่อให้ทำงานได้บน Vercel

      // เพิ่ม cache-control เพื่อให้แน่ใจว่าไม่ใช้ข้อมูลจาก cache
      console.log(`Sending request to fetch next words...`);

      // ใช้ fetch แบบมี timeout และมีการจัดการข้อผิดพลาด
      try {
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
            prefetchCount: batchSize, // ใช้ขนาด batch ที่กำหนด
          }),
          signal, // ใช้ signal จาก AbortController
        });

        // ยกเลิกการตั้งเวลา
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to get next word: ${response.status} ${response.statusText}`);
        }

        console.log(`Response received, parsing JSON...`);
        const data = await response.json();
        console.log(`Successfully fetched ${data.nextWords ? data.nextWords.length : 0} next words`);

        // เก็บข้อมูลใน cache
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
          console.log(`Saved words to cache with key: ${cacheKey}`);
        } catch (cacheError) {
          console.error("Error saving to cache:", cacheError);
        }

        // เก็บข้อมูลคำศัพท์ที่โหลดล่วงหน้า
        setNextWordData(data);
        return data;
      } catch (fetchError) {
        // ยกเลิกการตั้งเวลาถ้ายังไม่ถูกยกเลิก
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      // ถ้าเป็นการยกเลิกโดย AbortController ไม่ต้องแสดงข้อผิดพลาด
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Prefetch request was aborted due to timeout');
      } else {
        console.error("Error prefetching next word:", error);
      }

      // ลองโหลดคำศัพท์น้อยลง
      if (batchSize > 3) {
        console.log(`Retrying with smaller batch size: ${Math.floor(batchSize / 2)}`);
        return prefetchNextWord(currentWordId, Math.floor(batchSize / 2));
      } else {
        try {
          console.log("Retrying with minimum batch size...");
          const retryResponse = await fetch("/api/words/next", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              currentWordId,
              prefetchCount: 1, // โหลดแค่ 1 คำเพื่อให้เร็วที่สุด
            }),
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            console.log(`Retry successful, fetched ${retryData.nextWords ? retryData.nextWords.length : 0} words`);
            setNextWordData(retryData);
            return retryData;
          }
        } catch (retryError) {
          console.error("Error in retry attempt:", retryError);
        }
      }

      return null;
    }
  }

  const fetchNextWord = async (currentWordId: string) => {
    try {
      setIsLoadingNext(true)

      // ลองดึงข้อมูลจาก cache ก่อน
      const cacheKey = `vocab_cache_${userId}_${currentProgress.currentLevel}_${currentProgress.currentStage}`;
      let data = null;

      try {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          if (parsedData && parsedData.word) {
            console.log(`Using data from cache with key: ${cacheKey}`);
            data = parsedData;
          }
        }
      } catch (cacheError) {
        console.error("Error reading from cache:", cacheError);
      }

      // ถ้าไม่มีข้อมูลใน cache ให้ใช้ข้อมูลจาก nextWordData
      if (!data && nextWordData) {
        console.log("Using data from nextWordData");
        data = nextWordData;
      }

      // ถ้าไม่มีข้อมูลคำถัดไป ให้ขอข้อมูลใหม่
      if (!data) {
        console.log("No cached data available, fetching from server...");
        // แสดงสถานะการโหลดคำศัพท์
        toast({
          title: "กำลังโหลดคำศัพท์",
          description: "กำลังโหลดคำศัพท์ กรุณารอสักครู่...",
          duration: 3000,
        });

        // ใช้ AbortController เพื่อให้สามารถยกเลิกการร้องขอได้ถ้าจำเป็น
        const controller = new AbortController();
        const signal = controller.signal;

        // ตั้งเวลาหมดเวลาสำหรับการร้องขอ
        const timeoutId = setTimeout(() => controller.abort(), 8000); // ลดเวลาลงเป็น 8 วินาทีเพื่อให้ทำงานได้บน Vercel

        try {
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
              prefetchCount: 10, // ลดจำนวนคำศัพท์ที่โหลดลงเพื่อให้เร็วขึ้น
            }),
            signal, // ใช้ signal จาก AbortController
          });

          // ยกเลิกการตั้งเวลา
          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Failed to get next word: ${response.status} ${response.statusText}`);
          }

          data = await response.json();

          // เก็บข้อมูลใน cache
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data));
            console.log(`Saved data to cache with key: ${cacheKey}`);
          } catch (cacheError) {
            console.error("Error saving to cache:", cacheError);
          }
        } catch (fetchError) {
          // ยกเลิกการตั้งเวลาถ้ายังไม่ถูกยกเลิก
          clearTimeout(timeoutId);

          // ลองโหลดคำศัพท์น้อยลง
          console.log("Retrying with fewer words...");
          const retryResponse = await fetch("/api/words/next", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              currentWordId,
              prefetchCount: 1, // โหลดแค่ 1 คำเพื่อให้เร็วที่สุด
            }),
          });

          if (retryResponse.ok) {
            data = await retryResponse.json();
            console.log("Retry successful");
          } else {
            throw new Error("Failed to get next word even with retry");
          }
        }
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

      // ทำการอัพเดตความคืบหน้าแบบ non-blocking
      fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          wordId: word._id,
          correct: true,
        }),
      }).then(response => {
        if (response.ok) {
          return response.json();
        }
      }).then(data => {
        if (data) {
          // อัพเดตความคืบหน้าในส่วนของ client-side
          setCurrentProgress(data.progress);

          // อัพเดตสถิติแบบ optimistic update
          if (currentStats) {
            const updatedStats = { ...currentStats };
            updatedStats.completedWords += 1;

            const levelIndex = updatedStats.levels.findIndex((l) => l.level === word.level);
            if (levelIndex !== -1) {
              updatedStats.levels[levelIndex].completed += 1;

              const stageIndex = updatedStats.levels[levelIndex].stages.findIndex(
                (s) => s.stage === currentProgress.currentStage,
              );
              if (stageIndex !== -1) {
                updatedStats.levels[levelIndex].stages[stageIndex].completed += 1;
              }
            }

            setCurrentStats(updatedStats);
          }
        }
      }).catch(error => {
        console.error("Background progress update error:", error);
      });

      // ถ้าอยู่ในโหมดใช้คำศัพท์ที่โหลดมาแล้ว
      if (isStageMode && stageWords.length > 0) {
        console.log("Using words from stage mode");
        // เปลี่ยนไปคำถัดไปโดยใช้ handleSkipWord
        handleSkipWord();
        setIsLoading(false);
        return;
      }
      // ถ้ามีข้อมูลคำถัดไปแล้ว ให้เปลี่ยนไปคำถัดไปทันที
      else if (nextWordData && nextWordData.nextWords && nextWordData.nextWords.length > 0) {
        console.log("Using prefetched next word");
        // เปลี่ยนไปคำถัดไปทันที
        handleSkipWord();
        setIsLoading(false);
        return;
      } else {
        // ถ้ายังไม่มีข้อมูลคำถัดไป ให้ลองดึงจาก cache ก่อน
        console.log("No prefetched words, checking cache...");

        // ลองดึงข้อมูลจาก cache
        const cacheKey = `vocab_cache_${userId}_${currentProgress.currentLevel}_${currentProgress.currentStage}`;
        let cachedData = null;

        try {
          const cachedString = localStorage.getItem(cacheKey);
          if (cachedString) {
            cachedData = JSON.parse(cachedString);
            if (cachedData && cachedData.word) {
              console.log(`Using cached data for next word`);
              // เปลี่ยนไปคำถัดไปทันทีโดยใช้ข้อมูลจาก cache
              setNextWordData(cachedData);
              handleNext();
              return;
            }
          }
        } catch (cacheError) {
          console.error("Error reading from cache:", cacheError);
        }

        // ถ้าไม่มีข้อมูลใน cache ให้ prefetch คำถัดไป
        console.log("No cached data, fetching new word");
        prefetchNextWord(word._id);

        // อัพเดตความคืบหน้าแบบ blocking เพื่อให้แน่ใจว่าข้อมูลถูกบันทึก
        try {
          const controller = new AbortController();
          const signal = controller.signal;
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 วินาที

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
            signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error("Failed to update progress");
          }

          // ปรับปรุงความคืบหน้า
          const updatedProgress = await response.json();
          setCurrentProgress(updatedProgress.progress);

          // ปรับปรุงสถิติ
          if (currentStats) {
            const updatedStats = { ...currentStats };
            updatedStats.completedWords += 1;

            const levelIndex = updatedStats.levels.findIndex((l) => l.level === word.level);
            if (levelIndex !== -1) {
              updatedStats.levels[levelIndex].completed += 1;

              const stageIndex = updatedStats.levels[levelIndex].stages.findIndex(
                (s) => s.stage === currentProgress.currentStage,
              );
              if (stageIndex !== -1) {
                updatedStats.levels[levelIndex].stages[stageIndex].completed += 1;
              }
            }

            setCurrentStats(updatedStats);
          }
        } catch (progressError) {
          if (progressError instanceof DOMException && progressError.name === 'AbortError') {
            console.log('Progress update was aborted due to timeout');
          } else {
            console.error("Error updating progress:", progressError);
            throw progressError;
          }
        }

        // เปลี่ยนไปคำถัดไปทันที
        handleNext();
      }
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

    // ถ้ามีคำศัพท์ที่โหลดมาแล้ว ให้ใช้ handleSkipWord แทน
    if (nextWordData && nextWordData.nextWords && nextWordData.nextWords.length > 0) {
      handleSkipWord();
      return;
    }

    // ถ้าอยู่ในโหมดใช้คำศัพท์ที่โหลดมาแล้ว
    if (isStageMode && stageWords.length > 0) {
      handleSkipWord();
      return;
    }

    // ถ้าไม่มีคำศัพท์ที่โหลดมาแล้ว ให้เรียกใช้ fetchNextWord โดยตรง
    await fetchNextWord(word._id)
  }

  const handleNext = async () => {
    if (!word || isLoadingNext) return

    // ยกเลิก timer ถ้ามีอยู่
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer)
      setAutoAdvanceTimer(null)
    }

    // ถ้ามีคำศัพท์ที่โหลดมาแล้ว ให้ใช้ handleSkipWord แทน
    if (nextWordData && nextWordData.nextWords && nextWordData.nextWords.length > 0) {
      handleSkipWord();
      return;
    }

    // ถ้าอยู่ในโหมดใช้คำศัพท์ที่โหลดมาแล้ว
    if (isStageMode && stageWords.length > 0) {
      handleSkipWord();
      return;
    }

    // ถ้าไม่มีคำศัพท์ที่โหลดมาแล้ว ให้เรียกใช้ fetchNextWord โดยตรง
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
              {isLoadingNext ? "โหลด..." : "คำถัดไป"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

