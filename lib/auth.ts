import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  callbacks: {
    session: async ({ session, token, user }) => {
      if (session?.user) {
        // ใช้ token.sub สำหรับ JWT strategy
        if (token?.sub) {
          session.user.id = token.sub
        }
        // ใช้ user.id สำหรับ database strategy
        else if (user?.id) {
          session.user.id = user.id
        }

        try {
          // Check if user is admin
          const client = await clientPromise
          const db = client.db()
          const userId = token?.sub || user?.id

          console.log("Server Checking admin status for user:", userId)

          // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
          // ถ้าไม่มีผู้ใช้ที่เป็น admin ให้กำหนดผู้ใช้แรกเป็น admin
          const adminCount = await db.collection("users").countDocuments({ role: "admin" })
          console.log("Server Admin count:", adminCount)

          if (adminCount === 0) {
            // ถ้าไม่มี admin ให้กำหนดผู้ใช้นี้เป็น admin
            console.log("Server No admin found, setting current user as admin")

            // ตรวจสอบว่า userId เป็น ObjectId หรือไม่
            const userIdForQuery = userId

            // ทำการอัปเดตผู้ใช้เป็น admin
            const updateResult = await db
              .collection("users")
              .updateOne({ _id: userIdForQuery }, { $set: { role: "admin" } })

            console.log(
              "Server Update result:",
              updateResult.matchedCount,
              "documents matched,",
              updateResult.modifiedCount,
              "documents modified",
            )

            if (updateResult.modifiedCount > 0) {
              session.user.role = "admin"
              console.log("Server User set as admin:", userId)
            } else {
              console.log("Server Failed to set user as admin. No documents were modified.")

              // ลองใช้วิธีอื่นในการค้นหาผู้ใช้
              const user = await db.collection("users").findOne({ email: session.user.email })
              if (user) {
                console.log("Server Found user by email:", user._id)
                const updateByEmailResult = await db
                  .collection("users")
                  .updateOne({ _id: user._id }, { $set: { role: "admin" } })
                console.log(
                  "Server Update by email result:",
                  updateByEmailResult.matchedCount,
                  "documents matched,",
                  updateByEmailResult.modifiedCount,
                  "documents modified",
                )

                if (updateByEmailResult.modifiedCount > 0) {
                  session.user.role = "admin"
                  console.log("Server User set as admin by email lookup")
                }
              }
            }
          } else {
            // ตรวจสอบว่าผู้ใช้นี้เป็น admin หรือไม่
            const userDoc = await db.collection("users").findOne({ _id: userId })
            console.log("Server User document:", userDoc)

            if (userDoc?.role === "admin") {
              session.user.role = "admin"
              console.log("Server User is admin:", userId)
            } else {
              console.log("Server User is not admin:", userId)

              // ลองค้นหาด้วย email
              const userByEmail = await db.collection("users").findOne({ email: session.user.email })
              if (userByEmail?.role === "admin") {
                session.user.role = "admin"
                console.log("Server User is admin (found by email):", session.user.email)
              }
            }
          }
        } catch (error) {
          console.error("Server Error checking admin status:", error)
        }
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/", // ใช้หน้าแรกเป็นหน้าล็อกอิน
  },
  session: {
    strategy: "jwt", // ใช้ JWT strategy
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },
}
