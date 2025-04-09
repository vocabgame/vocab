import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb"

// ถ้าไม่มี NEXTAUTH_SECRET ให้แจ้งเตือนและใช้ค่าเริ่มต้น (ควรกำหนดใน production)
const secret = process.env.NEXTAUTH_SECRET
if (!secret || secret === "generate_a_random_secret_here") {
  console.warn("WARNING: NEXTAUTH_SECRET is not set or using default value. This is insecure in production.")
}

// กำหนดวิธีตรวจสอบว่าเป็น production หรือไม่
const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1"
console.log(`Server Auth config: Running in ${isProduction ? "production" : "development"} mode`)

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  debug: !isProduction,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        }
      },
    }),
  ],
  callbacks: {
    // JWT callback ทำงานเมื่อมีการสร้าง token
    jwt: async ({ token, user, account }) => {
      console.log("Server JWT callback called with token:", !!token, "user:", !!user)

      // เมื่อมีการล็อกอินครั้งแรก ให้เพิ่มข้อมูลจาก user เข้าไปใน token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        if ((user as any).role) {
          token.role = (user as any).role
        }
      }

      return token
    },

    // Session callback ทำงานเมื่อมีการดึงข้อมูล session จาก token
    session: async ({ session, token, user }) => {
      console.log("Server Session callback called with token:", !!token, "user:", !!user)

      if (session?.user) {
        // ถ้ามี token ให้นำข้อมูลจาก token มาใส่ใน session
        if (token) {
          session.user.id = token.sub as string
          if (token.role) {
            session.user.role = token.role as string
          }
          session.user.image = token.picture as string || session.user.image
        }
        // ในกรณีที่ใช้ adapter ข้อมูลจะมาจาก user
        else if (user) {
          session.user.id = user.id
          session.user.image = user.image || session.user.image
          if ((user as any).role) {
            session.user.role = (user as any).role
          }
        }

        try {
          const client = await clientPromise
          const db = client.db()
          const userId = token?.sub || user?.id

          // หากไม่มี userId ให้ออกจากฟังก์ชัน
          if (!userId) {
            console.warn("Server Session callback: No userId found")
            return session
          }

          console.log("Server Checking admin status for user:", userId)

          // ตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
          // ถ้าไม่มีผู้ใช้ที่เป็น admin ให้กำหนดผู้ใช้แรกเป็น admin
          const adminCount = await db.collection("users").countDocuments({ role: "admin" })
          console.log("Server Admin count:", adminCount)

          if (adminCount === 0) {
            // ถ้าไม่มี admin ให้กำหนดผู้ใช้นี้เป็น admin
            console.log("Server No admin found, setting current user as admin")

            const updateResult = await db
              .collection("users")
              .updateOne({ _id: userId }, { $set: { role: "admin" } })

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
    // เพิ่ม redirect callback เพื่อจัดการการเปลี่ยนเส้นทางหลังล็อกอิน
    redirect({ url, baseUrl }) {
      console.log("Server Redirect callback called with url:", url, "baseUrl:", baseUrl)

      // ถ้า URL เริ่มต้นด้วย baseUrl หรือเป็น relative URL ให้ใช้ URL นั้น
      if (url.startsWith(baseUrl) || url.startsWith("/")) {
        return url
      }
      // ถ้าไม่ใช่ ให้ไปที่ baseUrl (ป้องกันการ redirect ไปยังเว็บไซต์อื่น)
      return baseUrl
    }
  },
  pages: {
    signIn: "/", // ใช้หน้าแรกเป็นหน้าล็อกอิน
    signOut: "/",
    error: "/", // เมื่อเกิดข้อผิดพลาดให้ไปที่หน้าแรก
  },
  session: {
    strategy: "jwt", // ใช้ JWT strategy
    maxAge: 30 * 24 * 60 * 60, // 30 วัน
  },
  secret: secret,
  cookies: {
    sessionToken: {
      name: `${isProduction ? "__Secure-" : ""}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: isProduction ? ".vercel.app" : undefined, // ใช้ domain ของ Vercel ใน production
      }
    },
    callbackUrl: {
      name: `${isProduction ? "__Secure-" : ""}next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: isProduction ? ".vercel.app" : undefined,
      }
    },
    csrfToken: {
      name: `${isProduction ? "__Secure-" : ""}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
        domain: isProduction ? ".vercel.app" : undefined,
      }
    }
  },
  logger: {
    error(code, metadata) {
      console.error(`Server NextAuth Error [${code}]:`, metadata)
    },
    warn(code) {
      console.warn(`Server NextAuth Warning [${code}]`)
    },
    debug(code, metadata) {
      console.log(`Server NextAuth Debug [${code}]:`, metadata)
    }
  }
}
