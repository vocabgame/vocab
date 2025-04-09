"use client"

import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { useState } from "react"

// กำหนดให้ใช้วิธีที่เรียบง่ายที่สุดในการล็อกอิน
export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false)

  // ใช้การนำทางโดยตรงไปยังเส้นทางการล็อกอินของ Google
  const handleLogin = () => {
    setIsLoading(true)
    // นำทางไปที่ URL การล็อกอินโดยตรง
    window.location.href = "/api/auth/signin/google"
  }

  return (
    <Button onClick={handleLogin} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
      {isLoading ? (
        "กำลังเข้าสู่ระบบ..."
      ) : (
        <>
          <LogIn className="mr-2 h-4 w-4" />
          เข้าสู่ระบบด้วย Google
        </>
      )}
    </Button>
  )
}
