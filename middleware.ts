import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { authOptions } from "@/lib/auth" // ✅ สำคัญมาก

export async function middleware(request: NextRequest) {
  console.log("🛡️ Middleware running for path:", request.nextUrl.pathname)

  // ถ้าเป็นเส้นทาง static, API หรือ next assets → ข้าม
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/api") ||
    request.nextUrl.pathname.startsWith("/static")
  ) {
    return NextResponse.next()
  }

  // ✅ ดึง token พร้อม secret จาก authOptions
  const token = await getToken({
    req: request,
    secret: authOptions.secret,
  })

  console.log("🍪 Cookies:", request.cookies.getAll())
  console.log("🔐 Token:", token ? "✅ exists" : "❌ does not exist")

  // ❌ ถ้าไม่มี token → redirect ไปหน้า login ("/")
  if (!token && request.nextUrl.pathname !== "/") {
    console.log("➡️ Redirecting to home page - no token")
    return NextResponse.redirect(new URL("/", request.url))
  }

  // ✅ ถ้ามี token และพยายามเข้าหน้า "/" → redirect ไป "/game"
  if (token && request.nextUrl.pathname === "/") {
    console.log("➡️ Redirecting to game page - has token")
    return NextResponse.redirect(new URL("/game", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
}
