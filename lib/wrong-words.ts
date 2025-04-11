import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

interface WrongWord {
  userId: string;
  wordId: ObjectId;
  word: {
    english: string;
    thai: string;
    level: string;
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
            level: fullWordData.level
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
        level: fullWordData.level
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
      userId,
      mastered: false
    })
    .sort({ lastWrongAt: -1 })
    .toArray()
}

export async function markWordAsMastered(userId: string, wordId: string) {
  const client = await clientPromise
  const db = client.db()

  await db.collection("wrong_words").updateOne(
    {
      userId,
      wordId: new ObjectId(wordId)
    },
    {
      $set: { mastered: true }
    }
  )
}

export async function resetAllWrongWords(userId: string) {
  const client = await clientPromise
  const db = client.db()

  await db.collection("wrong_words").updateMany(
    { userId },
    { $set: { mastered: true } }
  )
}
