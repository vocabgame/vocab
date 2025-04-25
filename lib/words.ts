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
    // แปลง ObjectId เฉพาะ = จำเป็น
    const completedWordIds = progress.completedWords.map((id: string) => {
      try {
        return id.length === 24 ? new ObjectId(id) : id
      } catch (e) {
        return id
      }
    })

    // ตรวจสอบว่า ระดับและด่าน ไม่
    if (!progress.currentLevel || !progress.currentStage) {
      console.error(`Missing level or stage in progress: level=${progress.currentLevel}, stage=${progress.currentStage}`);
      // ใช้ค่าเริ่มต้นถ้าไม่
      progress.currentLevel = progress.currentLevel || "a1";
      progress.currentStage = progress.currentStage || 1;
    }

    let currentLevel = progress.currentLevel
    const currentStage = progress.currentStage

    // ลดการ log ที่ไม่จำเป็น
    // console.log(`Fetching words for level ${currentLevel}, stage ${currentStage}`)

    // คำนวณช่วง sequence ในด่าน
    const startSequence = (currentStage - 1) * WORDS_PER_STAGE + 1
    const endSequence = currentStage * WORDS_PER_STAGE

    console.log(`Getting words for level: ${currentLevel}, stage: ${currentStage}, startSequence: ${startSequence}, endSequence: ${endSequence}`)

    // ตรวจสอบว่า ระดับ ไม่
    if (!currentLevel) {
      console.error(`Missing level parameter. Using default level: a1`);
      currentLevel = "a1";
    }

    console.log(`Fetching words with strict level filter: ${currentLevel}`);

    // คำศัพท์ทั้งหมดในด่าน โดยใช้ sequence
    const wordsInStage = await db.collection("words")
      .find({
        level: currentLevel,
        sequence: { $gte: startSequence, $lte: endSequence }
      })
      .sort({ sequence: 1 })
      .toArray()

    // ตรวจสอบว่า ผู้ใช้ได้เล่นครบคำในด่านหรือไม่
    // โดยใช้ playedWords ที่เก็บคำที่เล่นแล้วทั้งหมด (ทั้งตอบถูกและผิด)
    const playedWords = progress.playedWords || [];
    // ถ้าไม่มี playedWords ให้ใช้การรวม completedWords และ wrongWords แทน
    const allPlayedWords = playedWords.length > 0 ?
      playedWords :
      [...progress.completedWords, ...(progress.wrongWords || [])];

    // ตรวจสอบว่าเล่นครบทุกคำในด่านหรือยัง
    const allWordsPlayed = wordsInStage.every(word => {
      const wordId = word._id.toString();
      return allPlayedWords.some(id => {
        const playedId = typeof id === 'string' ? id : id.toString();
        return playedId === wordId;
      });
    });

    // ถ้าเล่นครบคำแล้ว
    if (allWordsPlayed) {
      console.log(`All words in stage ${currentStage} of level ${currentLevel} have been played`);
      return {
        word: null,
        choices: [],
        stageComplete: true,
        message: "ได้เล่นครบคำในด่านแล้ว ไปเล่นด่านถัดไปทบทวนคำศัพท์"
      };
    }

    console.log(`Found ${wordsInStage.length} words in stage ${currentStage} of level ${currentLevel}`)

    // ใช้ allPlayedWords ที่ได้จากด้านบนเพื่อกรองคำศัพท์ที่ยังไม่ได้เล่น
    // แปลง allPlayedWords เป็น ID เพื่อใช้ในการกรอง
    const allPlayedWordIds = allPlayedWords;

    // กรองคำศัพท์ที่ยังไม่ได้เล่น
    const uncompletedWords = wordsInStage.filter(word => {
      const wordId = word._id.toString();
      return !allPlayedWordIds.some(id => {
        const playedId = typeof id === 'string' ? id : id.toString();
        return playedId === wordId;
      });
    })

    console.log(`Found ${uncompletedWords.length} uncompleted words in stage ${currentStage} of level ${currentLevel}`)

    // ถ้า คำศัพท์ที่ยังไม่ได้ ในด่าน ให้ใช้คำเหล่าแรก
    if (uncompletedWords.length > 0) {
      // Convert ObjectId to string for client components
      const serializedWords = JSON.parse(JSON.stringify(uncompletedWords))
      return generateWordWithChoices(serializedWords, db)
    }

    // ถ้าไม่ คำศัพท์ที่ยังไม่ได้ ในด่าน ให้ลองด่านถัดไป
    console.log(`No uncompleted words in level ${currentLevel}, stage ${currentStage}. Checking next stage.`)

    // ลองด่านถัดไปในระดับเดียวกัน
    const nextStage = currentStage + 1
    const nextStageStartIndex = nextStage * WORDS_PER_STAGE
    const nextStageEndIndex = (nextStage + 1) * WORDS_PER_STAGE

    // กรองเฉพาะคำศัพท์ในด่านถัดไป
    // คำศัพท์ทั้งหมดในระดับ
    const allWordsInLevel = await db.collection("words")
      .find({ level: currentLevel })
      .sort({ sequence: 1 })
      .toArray()

    const wordsInNextStage = allWordsInLevel.slice(nextStageStartIndex, nextStageEndIndex)

    if (wordsInNextStage.length > 0) {
      console.log(`Found ${wordsInNextStage.length} words in next stage ${nextStage} of level ${currentLevel}`)

      // กรองคำศัพท์ที่ยังไม่ได้เล่น โดยใช้ playedWords
      const uncompletedWordsInNextStage = wordsInNextStage.filter(word => {
        const wordId = word._id.toString();
        return !allPlayedWordIds.some(id => {
          const playedId = typeof id === 'string' ? id : id.toString();
          return playedId === wordId;
        });
      })

      console.log(`Found ${uncompletedWordsInNextStage.length} uncompleted words in next stage ${nextStage} of level ${currentLevel}`)

      if (uncompletedWordsInNextStage.length > 0) {
        // เดตด่านของผู้ใช้
        await db.collection("progress").updateOne({ userId }, { $set: { currentStage: nextStage } })

        // แปลงเป็น JSON สำหรับ client
        const serializedWords = JSON.parse(JSON.stringify(uncompletedWordsInNextStage))
        return generateWordWithChoices(serializedWords, db)
      }
    }

    // ถ้าไม่ คำศัพท์ในด่านถัดไป ให้ลองระดับถัดไป
    const levels = ["a1", "a2", "b1", "b2", "c1", "c2"]
    const currentIndex = levels.indexOf(currentLevel)

    if (currentIndex < levels.length - 1) {
      const nextLevel = levels[currentIndex + 1]
      console.log(`No more words in current level ${currentLevel}, trying next level: ${nextLevel}`)

      // เดตระดับและด่านของผู้ใช้
      await db.collection("progress").updateOne({ userId }, { $set: { currentLevel: nextLevel, currentStage: 1 } })

      // คำนวณช่วงคำศัพท์ในด่านแรกของระดับใหม่
      const newStageStartIndex = 0
      const newStageEndIndex = WORDS_PER_STAGE

      // คำศัพท์ทั้งหมดในระดับใหม่
      const allWordsInNextLevel = await db.collection("words")
        .find({ level: nextLevel })
        .sort({ _id: 1 })
        .toArray()

      // กรองเฉพาะคำศัพท์ในด่านแรก
      const wordsInFirstStage = allWordsInNextLevel.slice(newStageStartIndex, newStageEndIndex)

      if (wordsInFirstStage.length > 0) {
        console.log(`Found ${wordsInFirstStage.length} words in first stage of level ${nextLevel}`)

        // กรองคำศัพท์ที่ยังไม่ได้เล่น โดยใช้ playedWords
        const uncompletedWordsInFirstStage = wordsInFirstStage.filter(word => {
          const wordId = word._id.toString();
          return !allPlayedWordIds.some(id => {
            const playedId = typeof id === 'string' ? id : id.toString();
            return playedId === wordId;
          });
        })

        console.log(`Found ${uncompletedWordsInFirstStage.length} uncompleted words in first stage of level ${nextLevel}`)

        if (uncompletedWordsInFirstStage.length > 0) {
          // แปลงเป็น JSON สำหรับ client
          const serializedWords = JSON.parse(JSON.stringify(uncompletedWordsInFirstStage))
          return generateWordWithChoices(serializedWords, db)
        }
      }
    }

    // ถ้าไม่ คำศัพท์ในระดับใดๆ ให้ลอง คำศัพท์ที่เคยไปแล้ว (เพื่อทบทวน)
    // console.log("No more uncompleted words in any level, trying to get completed words for review")

    if (completedWordIds.length > 0) {
      // ใช้ $sample เลือกคำศัพท์ที่เคยไปแล้ว
      const randomCompletedWords = await db
        .collection("words")
        .aggregate([
          { $match: { _id: { $in: completedWordIds.slice(0, 50) } } }, // ลดจำนวนคำที่จะเลือกจาก 100 เป็น 50
          { $sample: { size: 5 } } // ลดจำนวนคำที่จะเลือกจาก 10 เป็น 5
        ])
        .toArray()

      if (randomCompletedWords.length > 0) {
        // console.log(`Found ${randomCompletedWords.length} completed words for review`)
        const serializedRandomWords = JSON.parse(JSON.stringify(randomCompletedWords))
        return generateWordWithChoices(serializedRandomWords, db)
      }
    }

    // ถ้าไม่ คำศัพท์เลย ให้ลอง คำศัพท์จากระดับใดๆ
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
    // เลือกคำศัพท์ที่มี sequence น้อยที่สุด (เรียงตามลำดับ)
    // เรียงคำศัพท์ตาม sequence ก่อน
    words.sort((a, b) => {
      // ถ้าไม่มี sequence ให้ใช้ _id แทน
      if (!a.sequence && !b.sequence) return a._id.toString().localeCompare(b._id.toString());
      if (!a.sequence) return 1;
      if (!b.sequence) return -1;
      return a.sequence - b.sequence;
    });

    // เลือกคำแรกหลังจากเรียงแล้ว
    const selectedWord = words[0]

    // ใช้ projection เลือดึงเฉพาะฟิลด์ที่ต้องการ
    const otherChoices = await db
      .collection("words")
      .aggregate([
        { $match: { _id: { $ne: selectedWord._id }, thai: { $ne: selectedWord.thai } } },
        { $project: { thai: 1 } }, // เลือกเฉพาะฟิลด์ thai เพื่อลดขนาดข้อมูล
        { $sample: { size: 5 } }, // ลดจำนวนคำที่จะเลือกจาก 10 เป็น 5
      ])
      .toArray()

    // กรองเอาเฉพาะคำที่ไม่ซ้ำ
    const uniqueChoices = []
    const usedTranslations = new Set([selectedWord.thai])

    // เลือกคำที่ไม่ซ้ำมา 3 คำ
    for (const word of otherChoices) {
      if (!usedTranslations.has(word.thai)) {
        uniqueChoices.push(word.thai)
        usedTranslations.add(word.thai)
        if (uniqueChoices.length >= 3) break
      }
    }

    // ถ้าไม่ครบ 3 คำ ให้สร้างคำแปลที่ไม่ซ้ำ
    while (uniqueChoices.length < 3) {
      const fakeTranslation: string = `คำที่ ${uniqueChoices.length + 1}`
      if (!usedTranslations.has(fakeTranslation)) {
        uniqueChoices.push(fakeTranslation)
        usedTranslations.add(fakeTranslation)
      }
    }

    // Create choices array with the correct answer and 3 wrong answers
    const choices = [selectedWord.thai, ...uniqueChoices]

    // Shuffle the choices - ใช้ Fisher-Yates ซึ่งมากกว่า sort
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

export async function getNextWord(userId: string, currentWordId: string, selectedLevel?: string, selectedStage?: number) {
  try {
    // ข้อมูลความคืบหน้าของผู้ใช้
    const progress = await getUserProgress(userId)

    // เลือกคำเข้าไปใน playedWords ชั่วคราว เอาไว้แน่ใจว่าจะไม่ได้คำซ้ำ
    const tempPlayedWords = [...(progress.playedWords || [])]
    const tempCompletedWords = [...progress.completedWords]

    // ตรวจสอบว่าคำอยู่ใน playedWords หรือไม่
    if (!tempPlayedWords.includes(currentWordId)) {
      tempPlayedWords.push(currentWordId)
    }

    // ตรวจสอบว่าคำอยู่ใน completedWords หรือไม่
    if (!tempCompletedWords.includes(currentWordId)) {
      tempCompletedWords.push(currentWordId)
    }

    // เดต progress ชั่วคราว ใช้ getWordForUser
    const tempProgress = {
      ...progress,
      completedWords: tempCompletedWords,
      playedWords: tempPlayedWords,
    }

    // เรียกใช้ getWordForUser เลือกคำถัดไป
    // ใช้ Promise.all ทำงานพร้อม

    // ถ้าระดับและด่าน ให้ใช้ค่าที่เลือก
    if (selectedLevel || selectedStage) {
      console.log(`Using selected level: ${selectedLevel}, stage: ${selectedStage} for getNextWord`);

      // เดต tempProgress ด้วยค่าที่เลือก
      if (selectedLevel) tempProgress.currentLevel = selectedLevel;
      if (selectedStage) tempProgress.currentStage = selectedStage;
    }

    const [result, updatedProgress] = await Promise.all([
      getWordForUser(userId, tempProgress),
      getUserProgress(userId)
    ])

    // ตรวจสอบว่า เปลี่ยนระดับหรือด่านหรือไม่
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

// คำศัพท์ทั้งหมดในด่าน
export async function getAllWordsInStage(userId: string, level: string, stage: number) {
  try {
    const client = await clientPromise;
    const db = client.db();

    // คำนวณช่วง sequence ในด่าน
    const startSequence = (stage - 1) * WORDS_PER_STAGE + 1;
    const endSequence = stage * WORDS_PER_STAGE;

    console.log(`Getting all words for level: ${level}, stage: ${stage}, startSequence: ${startSequence}, endSequence: ${endSequence}`);

    // ข้อมูลความคืบหน้าของผู้ใช้
    const progress = await getUserProgress(userId);
    const completedWordIds = progress.completedWords;

    // คำศัพท์ทั้งหมดในระดับและด่านที่ต้องการโดยใช้ sequence
    const wordsInStage = await db
      .collection("words")
      .find({
        level,
        sequence: { $gte: startSequence, $lte: endSequence }
      })
      .sort({ sequence: 1 })
      .toArray();

    // แยกคำที่แล้วและยังไม่ได้
    const uncompletedWords = [];
    const completedWords = [];

    for (const word of wordsInStage) {
      const wordId = word._id.toString();
      if (completedWordIds.includes(wordId)) {
        completedWords.push(word);
      } else {
        uncompletedWords.push(word);
      }
    }

    // สร้างตัวเลือกสำหรับแต่ละคำ
    const wordsWithChoices = [];

    // สร้างตัวเลือกสำหรับคำที่ยังไม่ได้ก่อน
    for (const word of uncompletedWords) {
      const choices = await generateChoicesForWord(word, db);
      wordsWithChoices.push({
        word,
        choices,
        completed: false
      });
    }

    // สร้างตัวเลือกสำหรับคำที่แล้ว
    for (const word of completedWords) {
      const choices = await generateChoicesForWord(word, db);
      wordsWithChoices.push({
        word,
        choices,
        completed: true
      });
    }

    // ส่งคำศัพท์แรกพร้อมคำศัพท์ที่เหลือ
    return {
      word: wordsWithChoices.length > 0 ? wordsWithChoices[0].word : null,
      choices: wordsWithChoices.length > 0 ? wordsWithChoices[0].choices : [],
      nextWords: wordsWithChoices.slice(1), // คำศัพท์ที่เหลือ
      totalWords: wordsWithChoices.length,
      uncompletedCount: uncompletedWords.length,
      completedCount: completedWords.length
    };
  } catch (error) {
    console.error("Error getting all words in stage:", error);
    throw error;
  }
}

// คำศัพท์หลายคำพร้อม
export async function getNextWords(userId: string, currentWordId: string, count: number = 3, selectedLevel?: string, selectedStage?: number) {
  try {
    // ข้อมูลความคืบหน้าของผู้ใช้
    const progress = await getUserProgress(userId)

    // เลือกคำเข้าไปใน playedWords และ completedWords ชั่วคราว
    const tempPlayedWords = [...(progress.playedWords || [])]
    const tempCompletedWords = [...progress.completedWords]

    if (!tempPlayedWords.includes(currentWordId)) {
      tempPlayedWords.push(currentWordId)
    }

    if (!tempCompletedWords.includes(currentWordId)) {
      tempCompletedWords.push(currentWordId)
    }

    // สร้าง progress ชั่วคราว
    const tempProgress = {
      ...progress,
      completedWords: tempCompletedWords,
      playedWords: tempPlayedWords,
    }

    // คำศัพท์หลายคำพร้อม
    const words = [];
    let currentTempProgress = { ...tempProgress };
    let currentTempCompletedWords = [...tempCompletedWords];
    let currentTempPlayedWords = [...tempPlayedWords];

    // คำศัพท์ละคำตามจำนวนที่ต้องการ
    for (let i = 0; i < count; i++) {
      // ถ้าระดับและด่าน ให้ใช้ค่าที่เลือก
      if (selectedLevel || selectedStage) {
        if (i === 0) { // แสดง log เฉพาะครั้งแรก
          console.log(`Using selected level: ${selectedLevel}, stage: ${selectedStage} for getNextWords`);
        }

        // เดต currentTempProgress ด้วยค่าที่เลือก
        if (selectedLevel) currentTempProgress.currentLevel = selectedLevel;
        if (selectedStage) currentTempProgress.currentStage = selectedStage;
      }

      // คำศัพท์ถัดไป
      const wordResult = await getWordForUser(userId, currentTempProgress);

      // ถ้าไม่ คำศัพท์แล้ว ให้
      if (!wordResult.word) break;

      // เลือกคำศัพท์ที่ได้เข้าไปใน array
      words.push(wordResult);

      // เลือกคำศัพท์ที่ได้เข้าไปใน completedWords และ playedWords ชั่วคราว
      if (wordResult.word && wordResult.word._id) {
        const wordId = wordResult.word._id.toString();

        // เพิ่มเข้าไปใน playedWords เสมอ
        if (!currentTempPlayedWords.includes(wordId)) {
          currentTempPlayedWords.push(wordId);
        }

        // เพิ่มเข้าไปใน completedWords ถ้ายังไม่มี
        if (!currentTempCompletedWords.includes(wordId)) {
          currentTempCompletedWords.push(wordId);
        }
      }

      // เดต progress ชั่วคราว คำถัดไป
      currentTempProgress = {
        ...currentTempProgress,
        completedWords: currentTempCompletedWords,
        playedWords: currentTempPlayedWords,
      };
    }

    // ข้อมูลความคืบหน้าล่าสุด
    const updatedProgress = await getUserProgress(userId);

    // ตรวจสอบว่า เปลี่ยนระดับหรือด่านหรือไม่
    const levelComplete = updatedProgress.currentLevel !== progress.currentLevel;
    const stageComplete = !levelComplete && updatedProgress.currentStage !== progress.currentStage;

    // ส่งคำศัพท์แรกพร้อมคำศัพท์ที่เหลือ
    return {
      word: words.length > 0 ? words[0].word : null,
      choices: words.length > 0 ? words[0].choices : [],
      nextWords: words.slice(1), // คำศัพท์ที่เหลือ
      progress: updatedProgress,
      levelComplete,
      stageComplete,
    };
  } catch (error) {
    console.error("Error getting next words:", error);
    throw error;
  }
}

export async function getWordsForStage(level: string, stage: number, completedWords: string[] = []) {
  const client = await clientPromise
  const db = client.db()

  try {
    // ไม่จำเป็นต้องแปลง completedWords เป็น ObjectId เพราะใช้ string เปรียบเทียบโดยตรง

    // คำนวณช่วง sequence ในด่าน
    const startSequence = (stage - 1) * WORDS_PER_STAGE + 1
    const endSequence = stage * WORDS_PER_STAGE

    console.log(`Getting words for level: ${level}, stage: ${stage}, startSequence: ${startSequence}, endSequence: ${endSequence}`)

    // คำศัพท์ทั้งหมดในระดับและด่านที่ต้องการโดยใช้ sequence
    const wordsInStage = await db
      .collection("words")
      .find({
        level,
        sequence: { $gte: startSequence, $lte: endSequence }
      })
      .sort({ sequence: 1 })
      .toArray()

    // แบ่งคำศัพท์เป็นคำที่แล้วและยังไม่ได้
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

    // สร้างตัวเลือกสำหรับคำที่ยังไม่ได้ (ให้ความสำคัญคำเหล่านี้ก่อน)
    for (const word of uncompletedWordsInStage) {
      const choices = await generateChoicesForWord(word, db);
      wordsWithChoices.push({
        word,
        choices,
        completed: false
      });
    }

    // สร้างตัวเลือกสำหรับคำที่แล้ว (เพื่อทบทวน)
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

export async function generateChoicesForWord(word: any, db: any) {
  // อื่นๆ คำ
  const otherChoices = await db
    .collection("words")
    .aggregate([
      { $match: { _id: { $ne: word._id }, thai: { $ne: word.thai } } },
      { $project: { thai: 1 } },
      { $sample: { size: 5 } },
    ])
    .toArray()

  // กรองเอาเฉพาะคำที่ไม่ซ้ำ
  const uniqueChoices = []
  const usedTranslations = new Set([word.thai])

  // เลือกคำที่ไม่ซ้ำมา 3 คำ
  for (const otherWord of otherChoices) {
    if (!usedTranslations.has(otherWord.thai)) {
      uniqueChoices.push(otherWord.thai)
      usedTranslations.add(otherWord.thai)
      if (uniqueChoices.length >= 3) break
    }
  }

  // ถ้าไม่ครบ 3 คำ ให้สร้างคำแปลที่ไม่ซ้ำ
  while (uniqueChoices.length < 3) {
    const fakeTranslation: string = `คำที่ ${uniqueChoices.length + 1}`
    if (!usedTranslations.has(fakeTranslation)) {
      uniqueChoices.push(fakeTranslation)
      usedTranslations.add(fakeTranslation)
    }
  }

  // สร้างตัวเลือกและสับเปลี่ยน
  const choices = [word.thai, ...uniqueChoices]

  // สับเปลี่ยน
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

// คำนวณของแต่ละด่าน
function calculateStageStats(level: string, totalWordsInLevel: number, progress: any) {
  const stageStats = []
  const stageProgress = progress.stageProgress?.[level] || {}

  // คำนวณจำนวนด่านทั้งหมดในระดับ
  // แต่ละด่าน 100 คำ เรียงตามเลข sequence
  const totalStages = Math.max(1, Math.ceil(totalWordsInLevel / WORDS_PER_STAGE))

  console.log(`Calculating stages for level ${level}: ${totalWordsInLevel} words, ${totalStages} stages`)

  for (let stage = 1; stage <= totalStages; stage++) {
    // คำนวณจำนวนคำในด่าน
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
