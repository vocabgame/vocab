"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-4 flex justify-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">เกิดข้อผิดพลาด</h1>
        <p className="mt-2 text-muted-foreground">เกิดข้อผิดพลาดในการโหลดหน้านี้ โปรดลองอีกครั้ง</p>
        {error.message && (
          <div className="mt-4 rounded-md bg-destructive/10 p-4">
            <p className="text-sm text-destructive">{error.message}</p>
          </div>
        )}
        <div className="mt-6 flex justify-center gap-4">
          <Button onClick={reset}>ลองอีกครั้ง</Button>
          <Button variant="outline" asChild>
            <Link href="/">กลับหน้าแรก</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
