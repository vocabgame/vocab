"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogIn } from "lucide-react"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function DebugLoginButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adminStatus, setAdminStatus] = useState<any>(null)
  const { toast } = useToast()

  const handleLogin = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log("Attempting to sign in with Google...")

      const result = await signIn("google", {
        callbackUrl: "/game",
        redirect: false,
      })

      console.log("Sign in result:", result)

      if (result?.error) {
        setError(result.error)
        console.error("Sign in error:", result.error)
        toast({
          title: "เกิดข้อผิดพลาด",
          description: `ไม่สามารถเข้าสู่ระบบได้: ${result.error}`,
          variant: "destructive",
        })
      } else if (result?.url) {
        console.log("Redirecting to:", result.url)
        window.location.href = result.url
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "Unknown error")
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ โปรดลองอีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ทางเลือกที่ 2: ล็อกอินโดยตรงผ่าน URL
  const handleDirectLogin = () => {
    console.log("Redirecting to direct Google sign in...")
    window.location.href = "/api/auth/signin/google?callbackUrl=/game"
  }

  const testDbConnection = async () => {
    try {
      console.log("Testing DB connection...")
      const response = await fetch("/api/test-db")
      const data = await response.json()
      console.log("DB test result:", data)
      toast({
        title: "ผลการทดสอบฐานข้อมูล",
        description:
          data.status === "success"
            ? `เชื่อมต่อสำเร็จ! พบ ${data.collections.length} คอลเลกชัน`
            : `เกิดข้อผิดพลาด: ${data.error}`,
        variant: data.status === "success" ? "default" : "destructive",
      })
    } catch (error) {
      console.error("DB test error:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถทดสอบการเชื่อมต่อฐานข้อมูลได้",
        variant: "destructive",
      })
    }
  }

  const makeAdmin = async () => {
    try {
      console.log("Making user admin...")
      const response = await fetch("/api/make-admin")
      const data = await response.json()
      console.log("Make admin result:", data)
      toast({
        title: "ผลการทำให้เป็น Admin",
        description: data.success
          ? "คุณได้รับสิทธิ์ Admin แล้ว กรุณาเข้าสู่ระบบใหม่"
          : data.warning
            ? data.warning
            : `เกิดข้อผิดพลาด: ${data.error}`,
        variant: data.success ? "default" : data.warning ? "warning" : "destructive",
      })
    } catch (error) {
      console.error("Make admin error:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถกำหนดสิทธิ์ Admin ได้",
        variant: "destructive",
      })
    }
  }

  const checkAdminStatus = async () => {
    try {
      console.log("Checking admin status...")
      const response = await fetch("/api/check-admin")
      const data = await response.json()
      console.log("Admin status result:", data)
      setAdminStatus(data)
      toast({
        title: "สถานะ Admin",
        description: data.isAdmin ? "คุณมีสิทธิ์ Admin" : data.error ? `เกิดข้อผิดพลาด: ${data.error}` : "คุณไม่มีสิทธิ์ Admin",
        variant: data.isAdmin ? "default" : data.error ? "destructive" : "warning",
      })
    } catch (error) {
      console.error("Check admin status error:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถตรวจสอบสถานะ Admin ได้",
        variant: "destructive",
      })
    }
  }

  const addSampleWords = async () => {
    try {
      console.log("Adding sample words...")
      const response = await fetch("/api/words/add-sample")
      const data = await response.json()
      console.log("Add sample words result:", data)
      toast({
        title: "เพิ่มคำศัพท์ตัวอย่าง",
        description: data.success ? data.message : `เกิดข้อผิดพลาด: ${data.error}`,
        variant: data.success ? "default" : "destructive",
      })
    } catch (error) {
      console.error("Add sample words error:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มคำศัพท์ตัวอย่างได้",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleLogin} disabled={isLoading} variant="outline">
        {isLoading ? (
          "กำลังเข้าสู่ระบบ..."
        ) : (
          <>
            <LogIn className="mr-2 h-4 w-4" />
            เข้าสู่ระบบด้วย signIn()
          </>
        )}
      </Button>

      <Button onClick={handleDirectLogin} variant="outline">
        <LogIn className="mr-2 h-4 w-4" />
        เข้าสู่ระบบโดยตรง (URL)
      </Button>

      <Button onClick={testDbConnection} variant="outline">
        ทดสอบการเชื่อมต่อ MongoDB
      </Button>

      <Button onClick={makeAdmin} variant="outline">
        ทำให้ฉันเป็น Admin
      </Button>

      <Button onClick={checkAdminStatus} variant="outline">
        ตรวจสอบสถานะ Admin
      </Button>

      <Button onClick={addSampleWords} variant="outline">
        เพิ่มคำศัพท์ตัวอย่าง
      </Button>

      {error && <div className="text-red-500 text-sm mt-2">เกิดข้อผิดพลาด: {error}</div>}

      {adminStatus && (
        <div className="bg-gray-100 p-3 rounded text-sm mt-2">
          <h4 className="font-medium mb-1">สถานะ Admin:</h4>
          <pre className="text-xs overflow-auto">{JSON.stringify(adminStatus, null, 2)}</pre>
        </div>
      )}

      <div className="text-sm mt-4">
        <p>ข้อมูลสภาพแวดล้อม:</p>
        <pre className="bg-gray-100 p-2 rounded text-xs mt-1">
          {JSON.stringify(
            {
              nextAuthUrl: process.env.NEXT_PUBLIC_NEXTAUTH_URL || "ไม่ได้กำหนด",
              hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
              hasGoogleClientSecret: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_SECRET,
              nodeEnv: process.env.NODE_ENV,
            },
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  )
}
