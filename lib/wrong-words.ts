import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

interface WrongWord {
  userId: string;
  wordId: ObjectId;
  word: {
    english: string;
    thai: string;
    level: string;
    sequence?: number;
  };
  wrongCount: number;
  lastWrongAt: Date;
  mastered: boolean;
}

export async function addWrongWord(userId: string, word: any) {
  const client = await clientPromise
  const db = client.db()

  // ตรวจสอบว่าคำนี้มีในคำที่ตอบผิดหรือไม่
  const existingWord = await db.collection("wrong_words").findOne({
    userId,
    wordId: new ObjectId(word._id)
  })

  // ดึงข้อมูลคำศัพท์เต็มๆ จากฐานข้อมูล
  const fullWordData = await db.collection("words").findOne({
    _id: new ObjectId(word._id)
  })

  if (!fullWordData) {
    console.error("Word not found in database:", word._id)
    return
  }

  if (existingWord) {
    // ถ้ามีอยู่แล้วให้อัพเดต wrongCount และ lastWrongAt
    await db.collection("wrong_words").updateOne(
      { userId, wordId: new ObjectId(word._id) },
      {
        $inc: { wrongCount: 1 },
        $set: {
          lastWrongAt: new Date(),
          // อัพเดตข้อมูลคำศัพท์ด้วย
          word: {
            english: fullWordData.english,
            thai: fullWordData.thai,
            level: fullWordData.level,
            sequence: fullWordData.sequence
          }
        }
      }
    )
  } else {
    // ถ้ายังไม่มีให้เพิ่มใหม่
    await db.collection("wrong_words").insertOne({
      userId,
      wordId: new ObjectId(word._id),
      word: {
        english: fullWordData.english,
        thai: fullWordData.thai,
        level: fullWordData.level,
        sequence: fullWordData.sequence
      },
      wrongCount: 1,
      lastWrongAt: new Date(),
      mastered: false
    })
  }
}

export async function getWrongWords(userId: string) {
  const client = await clientPromise
  const db = client.db()

  return await db.collection("wrong_words")
    .find({
      userId
      // Removed mastered: false filter to allow continuous review of all words
    })
    .sort({ lastWrongAt: -1 })
    .toArray()
}

export async function markWordAsMastered(userId: string, wordId: string) {
  const client = await clientPromise
  const db = client.db()

  // อัพเดตสถานะคำศัพท์เป็น mastered
  await db.collection("wrong_words").updateOne(
    {
      userId,
      wordId: new ObjectId(wordId)
    },
    {
      $set: {
        mastered: true,
        masteredAt: new Date() // เพิ่มเวลาที่ทำการ mastered
      }
    }
  )

  // อัพเดตความคืบหน้าของการทบทวนคำศัพท์
  await updateReviewProgress(userId)

  return { success: true }
}

/**
 * อัพเดตความคืบหน้าของการทบทวนคำศัพท์
 * @param userId ID ของผู้ใช้
 */
async function updateReviewProgress(userId: string) {
  const client = await clientPromise
  const db = client.db()

  // นับจำนวนคำศัพท์ที่ตอบผิดทั้งหมด
  const totalWrongWords = await db.collection("wrong_words").countDocuments({ userId })

  // นับจำนวนคำศัพท์ที่ mastered แล้ว
  const masteredWords = await db.collection("wrong_words").countDocuments({
    userId,
    mastered: true
  })

  // นับจำนวนคำศัพท์ที่ยังไม่ได้ mastered
  const remainingWords = await db.collection("wrong_words").countDocuments({
    userId,
    mastered: false
  })

  // ตรวจสอบว่ามีข้อมูลความคืบหน้าอยู่แล้วหรือไม่
  const existingProgress = await db.collection("review_progress").findOne({ userId })

  if (existingProgress) {
    // อัพเดตข้อมูลความคืบหน้าที่มีอยู่แล้ว
    await db.collection("review_progress").updateOne(
      { userId },
      {
        $set: {
          totalWords: totalWrongWords,
          masteredWords,
          remainingWords,
          lastUpdated: new Date()
        }
      }
    )
  } else {
    // สร้างข้อมูลความคืบหน้าใหม่
    await db.collection("review_progress").insertOne({
      userId,
      totalWords: totalWrongWords,
      masteredWords,
      remainingWords,
      createdAt: new Date(),
      lastUpdated: new Date()
    })
  }

  return {
    totalWords: totalWrongWords,
    masteredWords,
    remainingWords
  }
}

/**
 * ดึงข้อมูลความคืบหน้าของการทบทวนคำศัพท์
 * @param userId ID ของผู้ใช้
 */
export async function getReviewProgress(userId: string) {
  const client = await clientPromise
  const db = client.db()

  // ดึงข้อมูลความคืบหน้า
  const progress = await db.collection("review_progress").findOne({ userId })

  if (!progress) {
    // ถ้ายังไม่มีข้อมูลความคืบหน้า ให้สร้างใหม่
    return await updateReviewProgress(userId)
  }

  return progress
}

export async function resetAllWrongWords(userId: string) {
  const client = await clientPromise
  const db = client.db()

  // ทำเครื่องหมายว่าคำศัพท์ที่ตอบผิดทั้งหมดเป็น mastered
  await db.collection("wrong_words").updateMany(
    { userId },
    {
      $set: {
        mastered: true,
        masteredAt: new Date()
      }
    }
  )

  // อัพเดตความคืบหน้าของการทบทวนคำศัพท์
  await updateReviewProgress(userId)

  return { success: true }
}

/**
 * ลบข้อมูลคำศัพท์ที่ตอบผิดทั้งหมดของผู้ใช้
 * @param userId ID ของผู้ใช้
 */
export async function clearAllWrongWords(userId: string) {
  const client = await clientPromise
  const db = client.db()

  // ลบข้อมูลคำศัพท์ที่ตอบผิดทั้งหมด
  const result = await db.collection("wrong_words").deleteMany({ userId })

  // อัพเดตความคืบหน้าของการทบทวนคำศัพท์
  await updateReviewProgress(userId)

  return {
    success: true,
    deletedCount: result.deletedCount
  }
}
