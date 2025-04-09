import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

console.log("NextAuth route handler initializing")

const handler = NextAuth(authOptions)

console.log("NextAuth route handler initialized")

export { handler as GET, handler as POST }
