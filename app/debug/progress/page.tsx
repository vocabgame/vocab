"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function DebugProgressPage() {
  const [userId, setUserId] = useState("")
  const [wordId, setWordId] = useState("")
  const [progress, setProgress] = useState<any>(null)
  const [duplicates, setDuplicates] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch user progress
  const fetchProgress = async () => {
    if (!userId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณาระบุ User ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/debug/progress?userId=${userId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch progress")
      }

      const data = await response.json()
      setProgress(data)

      toast({
        title: "สำเร็จ",
        description: "ดึงข้อมูลความคืบหน้าสำเร็จ",
      })
    } catch (err) {
      console.error("Error fetching progress:", err)
      setError(err instanceof Error ? err.message : "Unknown error")

      toast({
        title: "ข้อผิดพลาด",
        description: err instanceof Error ? err.message : "ไม่สามารถดึงข้อมูลความคืบหน้าได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Test progress update
  const testProgressUpdate = async (correct: boolean, revealed: boolean) => {
    if (!userId || !wordId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณาระบุ User ID และ Word ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          wordId,
          correct,
          revealed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update progress")
      }

      const data = await response.json()
      setProgress(data.progress)

      toast({
        title: "สำเร็จ",
        description: "อัพเดตความคืบหน้าสำเร็จ",
      })
    } catch (err) {
      console.error("Error updating progress:", err)
      setError(err instanceof Error ? err.message : "Unknown error")

      toast({
        title: "ข้อผิดพลาด",
        description: err instanceof Error ? err.message : "ไม่สามารถอัพเดตความคืบหน้าได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Check for duplicate words in progress
  const checkDuplicates = async () => {
    if (!userId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณาระบุ User ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/debug/duplicates?userId=${userId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to check duplicates")
      }

      const data = await response.json()
      setDuplicates(data)

      toast({
        title: "สำเร็จ",
        description: `ตรวจสอบสำเร็จ พบคำซ้ำ ${data.duplicatesFound} คำ`,
      })
    } catch (err) {
      console.error("Error checking duplicates:", err)
      setError(err instanceof Error ? err.message : "Unknown error")

      toast({
        title: "ข้อผิดพลาด",
        description: err instanceof Error ? err.message : "ไม่สามารถตรวจสอบคำซ้ำได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fix duplicate words in progress
  const fixDuplicates = async () => {
    if (!userId) {
      toast({
        title: "ข้อผิดพลาด",
        description: "กรุณาระบุ User ID",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/debug/fix-duplicates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fix duplicates")
      }

      const data = await response.json()

      toast({
        title: "สำเร็จ",
        description: `แก้ไขสำเร็จ ลบคำซ้ำ ${data.duplicatesRemoved} คำ`,
      })

      // Refresh progress and duplicates data
      await fetchProgress()
      await checkDuplicates()
    } catch (err) {
      console.error("Error fixing duplicates:", err)
      setError(err instanceof Error ? err.message : "Unknown error")

      toast({
        title: "ข้อผิดพลาด",
        description: err instanceof Error ? err.message : "ไม่สามารถแก้ไขคำซ้ำได้",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Debug Progress</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="userId">User ID</Label>
                  <Input
                    id="userId"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Enter user ID"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={fetchProgress} disabled={loading}>
                    {loading ? "Loading..." : "Fetch Progress"}
                  </Button>
                  <Button onClick={checkDuplicates} disabled={loading} variant="outline">
                    {loading ? "Loading..." : "Check Duplicates"}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {duplicates && duplicates.duplicatesFound > 0 && (
                <Alert variant="warning" className="mt-4">
                  <AlertTitle>Duplicates Found</AlertTitle>
                  <AlertDescription>
                    Found {duplicates.duplicatesFound} duplicate words out of {duplicates.totalWords} total words.
                    <Button
                      onClick={fixDuplicates}
                      disabled={loading}
                      variant="outline"
                      className="mt-2"
                    >
                      Fix Duplicates
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {duplicates && duplicates.duplicatesFound === 0 && (
                <Alert variant="default" className="mt-4">
                  <AlertTitle>No Duplicates</AlertTitle>
                  <AlertDescription>
                    No duplicate words found in {duplicates.totalWords} total words.
                  </AlertDescription>
                </Alert>
              )}

              {progress && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Progress Data:</h3>
                  <div className="mt-4 grid gap-2">
                    <p><strong>Current Level:</strong> {progress.currentLevel?.toUpperCase()}</p>
                    <p><strong>Current Stage:</strong> {progress.currentStage}</p>
                    <p><strong>Completed Words:</strong> {progress.completedWords?.length || 0}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-md overflow-auto max-h-96 mt-4">
                    <pre className="text-xs">{JSON.stringify(progress, null, 2)}</pre>
                  </div>
                </div>
              )}

              {duplicates && duplicates.duplicatesFound > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Duplicate Words:</h3>
                  <div className="p-4 bg-gray-50 rounded-md overflow-auto max-h-96">
                    <pre className="text-xs">{JSON.stringify(duplicates.duplicates, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Progress Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wordId">Word ID</Label>
                  <Input
                    id="wordId"
                    value={wordId}
                    onChange={(e) => setWordId(e.target.value)}
                    placeholder="Enter word ID"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={() => testProgressUpdate(true, false)}
                    disabled={loading}
                    variant="default"
                  >
                    {loading ? "Loading..." : "Test Correct"}
                  </Button>
                  <Button
                    onClick={() => testProgressUpdate(false, true)}
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? "Loading..." : "Test Revealed"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
