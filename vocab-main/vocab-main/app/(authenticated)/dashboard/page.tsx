import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { SimpleDashboard } from "@/components/simple-dashboard"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    console.log("Server No session, redirecting to home page")
    redirect("/")
  }

  // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่โดยตรงจากฐานข้อมูล
  const client = await clientPromise
  const db = client.db()
  const userEmail = session.user.email

  console.log("Server Dashboard page - checking admin status for email:", userEmail)

  const user = await db.collection("users").findOne({ email: userEmail })

  if (!user) {
    console.log("Server User not found in database")
    redirect("/game")
  }

  console.log("Server User found:", user._id, "role:", user.role)

  if (user.role !== "admin") {
    console.log("Server User is not admin, redirecting to game page")
    redirect("/game")
  }

  console.log("Server Rendering dashboard page for admin user")

  // ตรวจสอบว่ามีคำศัพท์ในฐานข้อมูลหรือไม่
  const wordCount = await db.collection("words").countDocuments()
  console.log("Server Word count in database:", wordCount)

  // ดึงคำศัพท์ล่าสุด 5 คำ
  const recentWords = await db.collection("words").find({}).sort({ createdAt: -1 }).limit(5).toArray()

  // แปลง ObjectId เป็น string
  const serializedRecentWords = JSON.parse(JSON.stringify(recentWords))

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">แดชบอร์ดจัดการคำศัพท์</h1>
      <SimpleDashboard wordCount={wordCount} recentWords={serializedRecentWords} />
    </div>
  )
}
