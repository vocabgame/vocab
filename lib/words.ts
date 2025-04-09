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
    const completedWordIds = progress.completedWords.map((id: string) => {
      try {
        return id.length === 24 ? new ObjectId(id) : id
      } catch (e) {
        return id
      }
    })

    const currentLevel = progress.currentLevel
    const currentStage = progress.currentStage || 1

    console.log(`Fetching words for level ${currentLevel}, stage ${currentStage}`)

    // ดึงคำศัพท์ทั้งหมดในระดับปัจจุบัน
    const allWordsInLevel = await db.collection("words").find({ level: currentLevel }).toArray()

    console.log(`Total words in level ${currentLevel}: ${allWordsInLevel.length}`)

    // ถ้าไม่มีคำศัพท์ในระดับปัจจุบัน ให้ลองดึงคำศัพท์จากระดับอื่น
    if (allWordsInLevel.length === 0) {
      console.log(`No words found in level ${currentLevel}, trying to find words in any level`)

      // ดึงคำศัพท์จากทุกระดับ
      const anyWords = await db.collection("words").find({}).limit(20).toArray()

      if (anyWords.length > 0) {
        console.log(`Found ${anyWords.length} words in other levels`)

        // กรองคำที่ยังไม่ได้เรียน
        const uncompletedWords = anyWords.filter(
          (word) => !completedWordIds.some((id) => id.toString() === word._id.toString()),
        )

        if (uncompletedWords.length > 0) {
          console.log(`Found ${uncompletedWords.length} uncompleted words in other levels`)
          const serializedWords = JSON.parse(JSON.stringify(uncompletedWords))
          return generateWordWithChoices(serializedWords, db)
        }
      }

      console.log("No words found in any level")
      return { word: null, choices: [] }
    }

    // กรองคำที่ยังไม่ได้เรียน
    const uncompletedWords = allWordsInLevel.filter(
      (word) => !completedWordIds.some((id) => id.toString() === word._id.toString()),
    )

    console.log(`Uncompleted words in level ${currentLevel}: ${uncompletedWords.length}`)

    // ถ้าไม่มีคำศัพท์ที่ยังไม่ได้เรียนในระดับปัจจุบัน
    if (uncompletedWords.length === 0) {
      console.log(`No uncompleted words in level ${currentLevel}, trying next level`)

      // ลองดูระดับถัดไป
      const levels = ["a1", "a2", "b1", "b2", "c1", "c2"]
      const currentIndex = levels.indexOf(currentLevel)

      if (currentIndex < levels.length - 1) {
        const nextLevel = levels[currentIndex + 1]
        console.log(`Moving to next level: ${nextLevel}`)

        // อัพเดตระดับและด่านปัจจุบันของผู้ใช้
        await db.collection("progress").updateOne({ userId }, { $set: { currentLevel: nextLevel, currentStage: 1 } })

        // ดึงคำศัพท์จากระดับถัดไป
        const nextLevelWords = await db.collection("words").find({ level: nextLevel }).toArray()

        // กรองคำที่ยังไม่ได้เรียน
        const uncompletedNextLevelWords = nextLevelWords.filter(
          (word) => !completedWordIds.some((id) => id.toString() === word._id.toString()),
        )

        if (uncompletedNextLevelWords.length > 0) {
          console.log(`Found ${uncompletedNextLevelWords.length} uncompleted words in level ${nextLevel}`)
          const serializedNextLevelWords = JSON.parse(JSON.stringify(uncompletedNextLevelWords))
          return generateWordWithChoices(serializedNextLevelWords, db)
        }
      }

      // ถ้าไม่มีคำศัพท์เหลือในทุกระดับ ให้ลองดึงคำศัพท์ที่เคยเรียนไปแล้ว (เพื่อทบทวน)
      console.log("No more uncompleted words in any level, trying to get completed words for review")

      if (completedWordIds.length > 0) {
        const randomCompletedWords = await db
          .collection("words")
          .aggregate([{ $match: { _id: { $in: completedWordIds.slice(0, 100) } } }, { $sample: { size: 10 } }])
          .toArray()

        if (randomCompletedWords.length > 0) {
          console.log(`Found ${randomCompletedWords.length} completed words for review`)
          const serializedRandomWords = JSON.parse(JSON.stringify(randomCompletedWords))
          return generateWordWithChoices(serializedRandomWords, db)
        }
      }

      console.log("No words available at all")
      return { word: null, choices: [] }
    }

    // Convert ObjectId to string for client components
    const serializedWords = JSON.parse(JSON.stringify(uncompletedWords))
    return generateWordWithChoices(serializedWords, db)
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

    // Get other random Thai translations for choices (ดึงมาเยอะๆ เพื่อกรองคำที่ซ้ำกัน)
    const otherChoices = await db
      .collection("words")
      .aggregate([
        { $match: { _id: { $ne: selectedWord._id }, thai: { $ne: selectedWord.thai } } },
        { $sample: { size: 10 } },
      ])
      .toArray()

    // Convert ObjectId to string for client components
    const serializedOtherChoices = JSON.parse(JSON.stringify(otherChoices))

    // กรองเอาเฉพาะคำที่ไม่ซ้ำกัน
    const uniqueChoices = []
    const usedTranslations = new Set([selectedWord.thai])

    // เลือกคำที่ไม่ซ้ำกันมา 3 คำ
    for (const word of serializedOtherChoices) {
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

    // Shuffle the choices
    const shuffledChoices = choices.sort(() => Math.random() - 0.5)

    return {
      word: selectedWord,
      choices: shuffledChoices,
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
    const result = await getWordForUser(userId, tempProgress)

    // ดึงข้อมูลความคืบหน้าล่าสุดหลังจากเรียก getWordForUser
    const updatedProgress = await getUserProgress(userId)

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
