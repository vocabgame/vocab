import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import { getUserProgress } from "./user-progress"

// จำนวนคำต่อด่าน
const WORDS_PER_STAGE = 100

export async function getWordForUser(userId: string, progress: any) {
  const client = await clientPromise
  const db = client.db()

  try {
    // Get words from the user's current level that they haven't completed yet
    // แปลง ObjectId เฉพาะที่จำเป็น
    const completedWordIds = progress.completedWords.map((id: string) => {
      try {
        return id.length === 24 ? new ObjectId(id) : id
      } catch (e) {
        return id
      }
    })

    const currentLevel = progress.currentLevel
    const currentStage = progress.currentStage || 1

    // ลดการ log ที่ไม่จำเป็น
    // console.log(`Fetching words for level ${currentLevel}, stage ${currentStage}`)

    // ใช้ aggregation แทนการดึงข้อมูลทั้งหมดแล้วค่อยกรอง
    // ดึงคำศัพท์ที่ยังไม่ได้เรียนในระดับปัจจุบันโดยตรง
    const uncompletedWords = await db.collection("words").aggregate([
      { $match: { level: currentLevel } },
      { $match: { _id: { $nin: completedWordIds } } },
      { $sample: { size: 20 } } // สุ่มคำศัพท์มาเลยเพื่อให้เร็วขึ้น
    ]).toArray()

    // ถ้ามีคำศัพท์ที่ยังไม่ได้เรียนในระดับปัจจุบัน ให้ใช้คำเหล่านั้น
    if (uncompletedWords.length > 0) {
      // Convert ObjectId to string for client components
      const serializedWords = JSON.parse(JSON.stringify(uncompletedWords))
      return generateWordWithChoices(serializedWords, db)
    }

    // ถ้าไม่มีคำศัพท์ที่ยังไม่ได้เรียนในระดับปัจจุบัน ให้ลองดูระดับถัดไป
    // console.log(`No uncompleted words in level ${currentLevel}, trying next level`)

    // ลองดูระดับถัดไป
    const levels = ["a1", "a2", "b1", "b2", "c1", "c2"]
    const currentIndex = levels.indexOf(currentLevel)

    if (currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1]
      // console.log(`Moving to next level: ${nextLevel}`)

      // อัพเดตระดับและด่านปัจจุบันของผู้ใช้
      await db.collection("progress").updateOne({ userId }, { $set: { currentLevel: nextLevel, currentStage: 1 } })

      // ดึงคำศัพท์จากระดับถัดไปโดยตรง
      const uncompletedNextLevelWords = await db.collection("words").aggregate([
        { $match: { level: nextLevel } },
        { $match: { _id: { $nin: completedWordIds } } },
        { $sample: { size: 20 } }
      ]).toArray()

      if (uncompletedNextLevelWords.length > 0) {
        // console.log(`Found ${uncompletedNextLevelWords.length} uncompleted words in level ${nextLevel}`)
        const serializedNextLevelWords = JSON.parse(JSON.stringify(uncompletedNextLevelWords))
        return generateWordWithChoices(serializedNextLevelWords, db)
      }
    }

    // ถ้าไม่มีคำศัพท์เหลือในทุกระดับ ให้ลองดึงคำศัพท์ที่เคยเรียนไปแล้ว (เพื่อทบทวน)
    // console.log("No more uncompleted words in any level, trying to get completed words for review")

    if (completedWordIds.length > 0) {
      // ใช้ $sample เพื่อสุ่มคำศัพท์ที่เคยเรียนไปแล้ว
      const randomCompletedWords = await db
        .collection("words")
        .aggregate([
          { $match: { _id: { $in: completedWordIds.slice(0, 50) } } }, // ลดจำนวนคำที่จะสุ่มจาก 100 เป็น 50
          { $sample: { size: 5 } } // ลดจำนวนคำที่จะสุ่มจาก 10 เป็น 5
        ])
        .toArray()

      if (randomCompletedWords.length > 0) {
        // console.log(`Found ${randomCompletedWords.length} completed words for review`)
        const serializedRandomWords = JSON.parse(JSON.stringify(randomCompletedWords))
        return generateWordWithChoices(serializedRandomWords, db)
      }
    }

    // ถ้าไม่มีคำศัพท์เลย ให้ลองดึงคำศัพท์จากทุกระดับ
    const anyWords = await db.collection("words").aggregate([
      { $sample: { size: 10 } }
    ]).toArray()

    if (anyWords.length > 0) {
      // console.log(`Found ${anyWords.length} words in any level`)
      const serializedAnyWords = JSON.parse(JSON.stringify(anyWords))
      return generateWordWithChoices(serializedAnyWords, db)
    }

    // console.log("No words available at all")
    return { word: null, choices: [] }
  } catch (error) {
    console.error("Error getting word for user:", error)
    throw error
  }
}

async function generateWordWithChoices(words: any[], db: any) {
  try {
    // Select a random word from the available words
    const randomIndex = Math.floor(Math.random() * words.length)
    const selectedWord = words[randomIndex]

    // ใช้วิธีการที่เร็วขึ้นในการดึงตัวเลือก
    // ใช้ projection เพื่อดึงเฉพาะฟิลด์ที่ต้องการ
    const otherChoices = await db
      .collection("words")
      .aggregate([
        { $match: { _id: { $ne: selectedWord._id }, thai: { $ne: selectedWord.thai } } },
        { $project: { thai: 1 } }, // ดึงเฉพาะฟิลด์ thai เพื่อลดขนาดข้อมูล
        { $sample: { size: 5 } }, // ลดจำนวนตัวเลือกที่ดึงมาจาก 10 เป็น 5
      ])
      .toArray()

    // กรองเอาเฉพาะคำที่ไม่ซ้ำกัน
    const uniqueChoices = []
    const usedTranslations = new Set([selectedWord.thai])

    // เลือกคำที่ไม่ซ้ำกันมา 3 คำ
    for (const word of otherChoices) {
      if (!usedTranslations.has(word.thai)) {
        uniqueChoices.push(word.thai)
        usedTranslations.add(word.thai)
        if (uniqueChoices.length >= 3) break
      }
    }

    // ถ้าไม่ครบ 3 คำ ให้สร้างคำแปลสุ่มเพิ่ม
    while (uniqueChoices.length < 3) {
      const fakeTranslation = `ตัวเลือก ${uniqueChoices.length + 1}`
      if (!usedTranslations.has(fakeTranslation)) {
        uniqueChoices.push(fakeTranslation)
        usedTranslations.add(fakeTranslation)
      }
    }

    // Create choices array with the correct answer and 3 wrong answers
    const choices = [selectedWord.thai, ...uniqueChoices]

    // Shuffle the choices - ใช้วิธีการ Fisher-Yates ซึ่งมีประสิทธิภาพมากกว่า sort
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    return {
      word: selectedWord,
      choices: choices,
    }
  } catch (error) {
    console.error("Error generating word choices:", error)
    throw error
  }
}

export async function getNextWord(userId: string, currentWordId: string) {
  try {
    const client = await clientPromise
    const db = client.db()

    // ดึงข้อมูลความคืบหน้าของผู้ใช้
    const progress = await getUserProgress(userId)

    // เพิ่มคำปัจจุบันเข้าไปใน completedWords ชั่วคราว เพื่อให้แน่ใจว่าจะไม่ได้คำเดิมซ้ำ
    const tempCompletedWords = [...progress.completedWords]

    // ตรวจสอบว่าคำปัจจุบันอยู่ใน completedWords หรือไม่
    if (!tempCompletedWords.includes(currentWordId)) {
      tempCompletedWords.push(currentWordId)
    }

    // อัพเดต progress ชั่วคราวสำหรับการเรียกใช้ getWordForUser
    const tempProgress = {
      ...progress,
      completedWords: tempCompletedWords,
    }

    // เรียกใช้ getWordForUser เพื่อดึงคำถัดไป
    // ใช้ Promise.all เพื่อทำงานพร้อมกัน
    const [result, updatedProgress] = await Promise.all([
      getWordForUser(userId, tempProgress),
      getUserProgress(userId)
    ])

    // ตรวจสอบว่ามีการเปลี่ยนระดับหรือด่านหรือไม่
    const levelComplete = updatedProgress.currentLevel !== progress.currentLevel
    const stageComplete = !levelComplete && updatedProgress.currentStage !== progress.currentStage

    return {
      ...result,
      progress: updatedProgress,
      levelComplete,
      stageComplete,
    }
  } catch (error) {
    console.error("Error getting next word:", error)
    throw error
  }
}

export async function getWordsForStage(level: string, stage: number, completedWords: string[] = []) {
  const client = await clientPromise
  const db = client.db()

  try {
    // แปลง completedWords เป็น ObjectId
    const completedWordIds = completedWords.map((id: string) => {
      try {
        return id.length === 24 ? new ObjectId(id) : id
      } catch (e) {
        return id
      }
    })

    // คำนวณช่วงคำศัพท์ในด่านนี้
    const startIndex = (stage - 1) * WORDS_PER_STAGE
    const endIndex = stage * WORDS_PER_STAGE

    // ดึงคำศัพท์ทั้งหมดในระดับและด่านที่ต้องการ
    const wordsInStage = await db
      .collection("words")
      .find({ level })
      .sort({ _id: 1 })
      .skip(startIndex)
      .limit(WORDS_PER_STAGE)
      .toArray()

    // แบ่งคำศัพท์เป็นคำที่เรียนแล้วและยังไม่ได้เรียน
    const completedWordsInStage = [];
    const uncompletedWordsInStage = [];

    for (const word of wordsInStage) {
      const wordId = word._id.toString();
      if (completedWords.includes(wordId)) {
        completedWordsInStage.push(word);
      } else {
        uncompletedWordsInStage.push(word);
      }
    }

    // สร้างตัวเลือกสำหรับแต่ละคำศัพท์
    const wordsWithChoices = [];

    // สร้างตัวเลือกสำหรับคำที่ยังไม่ได้เรียน (ให้ความสำคัญกับคำเหล่านี้ก่อน)
    for (const word of uncompletedWordsInStage) {
      const choices = await generateChoicesForWord(word, db);
      wordsWithChoices.push({
        word,
        choices,
        completed: false
      });
    }

    // สร้างตัวเลือกสำหรับคำที่เรียนแล้ว (เพื่อทบทวน)
    for (const word of completedWordsInStage) {
      const choices = await generateChoicesForWord(word, db);
      wordsWithChoices.push({
        word,
        choices,
        completed: true
      });
    }

    // แปลง ObjectId เป็น string สำหรับ client
    return JSON.parse(JSON.stringify(wordsWithChoices));
  } catch (error) {
    console.error("Error getting words for stage:", error);
    throw error;
  }
}

async function generateChoicesForWord(word: any, db: any) {
  // ดึงตัวเลือกอื่นๆ สำหรับคำนี้
  const otherChoices = await db
    .collection("words")
    .aggregate([
      { $match: { _id: { $ne: word._id }, thai: { $ne: word.thai } } },
      { $project: { thai: 1 } },
      { $sample: { size: 5 } },
    ])
    .toArray()

  // กรองเอาเฉพาะคำที่ไม่ซ้ำกัน
  const uniqueChoices = []
  const usedTranslations = new Set([word.thai])

  // เลือกคำที่ไม่ซ้ำกันมา 3 คำ
  for (const otherWord of otherChoices) {
    if (!usedTranslations.has(otherWord.thai)) {
      uniqueChoices.push(otherWord.thai)
      usedTranslations.add(otherWord.thai)
      if (uniqueChoices.length >= 3) break
    }
  }

  // ถ้าไม่ครบ 3 คำ ให้สร้างคำแปลสุ่มเพิ่ม
  while (uniqueChoices.length < 3) {
    const fakeTranslation = `ตัวเลือก ${uniqueChoices.length + 1}`
    if (!usedTranslations.has(fakeTranslation)) {
      uniqueChoices.push(fakeTranslation)
      usedTranslations.add(fakeTranslation)
    }
  }

  // สร้างตัวเลือกและสับเปลี่ยน
  const choices = [word.thai, ...uniqueChoices]

  // สับเปลี่ยนตัวเลือก
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return choices;
}

export async function getLevelStats(userId: string) {
  const client = await clientPromise
  const db = client.db()

  try {
    const progress = await getUserProgress(userId)

    // Get total words count by level
    const wordCounts = await db
      .collection("words")
      .aggregate([{ $group: { _id: "$level", count: { $sum: 1 } } }])
      .toArray()

    // Convert to a more usable format
    const levelCounts: Record<string, number> = {}
    wordCounts.forEach((item: any) => {
      levelCounts[item._id] = item.count
    })

    // Calculate completed words by level
    const levels = ["a1", "a2", "b1", "b2", "c1", "c2"]
    const levelStats = levels.map((level) => ({
      level,
      total: levelCounts[level] || 0,
      completed: progress.levelProgress[level] || 0,
      stages: calculateStageStats(level, levelCounts[level] || 0, progress),
    }))

    // Calculate total stats
    const totalWords = Object.values(levelCounts).reduce((sum: number, count: number) => sum + count, 0)
    const completedWords = progress.completedWords.length

    // Convert to JSON-serializable object
    return JSON.parse(
      JSON.stringify({
        totalWords,
        completedWords,
        levels: levelStats,
        currentLevel: progress.currentLevel,
        currentStage: progress.currentStage || 1,
      }),
    )
  } catch (error) {
    console.error("Error getting level stats:", error)
    throw error
  }
}

// ฟังก์ชันคำนวณสถิติของแต่ละด่าน
function calculateStageStats(level: string, totalWordsInLevel: number, progress: any) {
  const stageStats = []
  const stageProgress = progress.stageProgress?.[level] || {}

  // คำนวณจำนวนด่านทั้งหมดในระดับนี้
  const totalStages = Math.max(1, Math.ceil(totalWordsInLevel / WORDS_PER_STAGE))

  for (let stage = 1; stage <= totalStages; stage++) {
    // คำนวณจำนวนคำในด่านนี้
    const wordsInThisStage =
      stage < totalStages ? WORDS_PER_STAGE : totalWordsInLevel - (totalStages - 1) * WORDS_PER_STAGE

    stageStats.push({
      stage,
      total: Math.max(1, wordsInThisStage),
      completed: stageProgress[stage] || 0,
    })
  }

  return stageStats
}
