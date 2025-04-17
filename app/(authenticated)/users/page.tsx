import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import clientPromise from "@/lib/mongodb"
import { UserManager } from "@/components/user-manager"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    console.log("Server No session, redirecting to home page")
    redirect("/")
  }

  // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่โดยตรงจากฐานข้อมูล
  const client = await clientPromise
  const db = client.db()
  const userEmail = session.user.email

  console.log("Server Users page - checking admin status for email:", userEmail)

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

  console.log("Server Rendering users management page for admin user")

  // ดึงข้อมูลผู้ใช้ทั้งหมด
  const users = await db.collection("users").find({}).toArray()

  // แปลง ObjectId เป็น string
  const serializedUsers = JSON.parse(JSON.stringify(users))

  return (
    <div className="container py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">จัดการผู้ใช้งานระบบ</h1>
      <UserManager users={serializedUsers} />
    </div>
  )
}
