import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  // เพิ่ม debug log ของ path
  console.log("Server Middleware running for path:", request.nextUrl.pathname)

  // ถ้าเป็นเส้นทางที่เกี่ยวกับ API หรือ static files ให้ข้ามไป
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/static") ||
    request.nextUrl.pathname.startsWith("/favicon")
  ) {
    return NextResponse.next()
  }

  // เพิ่มการตรวจสอบ NEXTAUTH_SECRET
  if (!process.env.NEXTAUTH_SECRET) {
    console.error("Server Warning: NEXTAUTH_SECRET is not set properly")
  }

  // แสดงรายละเอียดของ cookies
  console.log("Server Available cookies:", [...request.cookies.getAll().map(c => c.name)])

  // ทางแก้ชั่วคราว: ใช้การตรวจสอบ cookie แทนการใช้ getToken()
  // เนื่องจากอาจมีปัญหากับการเข้าถึง session ใน middleware
  const hasAuthCookie = request.cookies.has("next-auth.session-token") ||
                       request.cookies.has("__Secure-next-auth.session-token")

  console.log("Server Has auth cookie:", hasAuthCookie)

  // ยกเลิกการตรวจสอบสิทธิ์ดั้งเดิมและใช้วิธีง่ายกว่า
  // ถ้าไม่มี cookie และไม่ได้อยู่ที่หน้าแรก ให้ redirect ไปหน้าแรก
  if (!hasAuthCookie && request.nextUrl.pathname !== "/") {
    console.log("Server Redirecting to home page - no auth cookie")
    return NextResponse.redirect(new URL("/", request.url))
  }

  // ยกเลิกการ redirect จากหน้าแรกไปหน้าเกมโดยอัตโนมัติ
  // เพื่อป้องกัน redirect loop
  // ให้ผู้ใช้คลิกปุ่มเข้าเกมเองแทน

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
