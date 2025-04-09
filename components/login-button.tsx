"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function LoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleLogin = async () => {
    try {
      setIsLoading(true)

      // ใช้ redirect: true เพื่อให้ NextAuth จัดการการ redirect เอง
      await signIn("google", {
        callbackUrl: "/game",
        redirect: true,
      })
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

  // ทางเลือกสำรองในกรณีที่ signIn() ไม่ทำงาน
  const handleDirectLogin = () => {
    window.location.href = "/api/auth/signin/google?callbackUrl=/game"
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
