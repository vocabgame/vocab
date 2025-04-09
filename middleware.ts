import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function middleware(request: NextRequest) {
  console.log("Server Middleware running for path:", request.nextUrl.pathname)

  // ถ้าเป็นเส้นทางที่เกี่ยวกับ API หรือ static files ให้ข้ามไป
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/static")
  ) {
    return NextResponse.next()
  }

  // เพิ่มการตรวจสอบ NEXTAUTH_SECRET
  if (!process.env.NEXTAUTH_SECRET) {
    console.error("Server Warning: NEXTAUTH_SECRET is not set properly")
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  console.log("Server Token in middleware:", token ? "exists" : "does not exist")

  // แสดงรายละเอียดการตรวจสอบ cookie เพื่อการแก้ไขปัญหา
  if (!token) {
    const authCookie = request.cookies.get("next-auth.session-token") ||
                      request.cookies.get("__Secure-next-auth.session-token")
    console.log("Server Auth cookie exists:", !!authCookie)
  }

  // ถ้าไม่มี token และไม่ได้อยู่ที่หน้าแรก ให้ redirect ไปหน้าแรก
  if (!token && request.nextUrl.pathname !== "/") {
    console.log("Server Redirecting to home page - no token")
    return NextResponse.redirect(new URL("/", request.url))
  }

  // ถ้ามี token และอยู่ที่หน้าแรก ให้ redirect ไปหน้าเกม
  if (token && request.nextUrl.pathname === "/") {
    console.log("Server Redirecting to game page - has token")
    return NextResponse.redirect(new URL("/game", request.url))
  }

  // ยกเลิกการตรวจสอบสิทธิ์แอดมินสำหรับหน้า dashboard
  // ทุกคนที่ล็อกอินแล้วสามารถเข้าถึงได้

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
