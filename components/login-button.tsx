"use client"

import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // เปลี่ยนวิธีการล็อกอินให้ใช้วิธีที่ตรงไปตรงมามากขึ้น
  const handleLogin = () => {
    try {
      setIsLoading(true)

      // ใช้วิธีการล็อกอินโดยตรงแทนการใช้ signIn จาก nextauth/react
      // เพื่อหลีกเลี่ยงปัญหาการจัดการ session ใน client side
      window.location.href = "/api/auth/signin/google"
    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ โปรดลองอีกครั้ง",
        variant: "destructive",
      })
      setIsLoading(false)
    }
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
