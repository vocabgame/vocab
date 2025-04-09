"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WordsTable } from "@/components/words-table"
import { WordForm } from "@/components/word-form"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState("view")
  const [editingWord, setEditingWord] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    // เมื่อ component โหลด ให้ตรวจสอบว่าสามารถเข้าถึง API ได้หรือไม่
    const checkApiAccess = async () => {
      try {
        const response = await fetch("/api/words?page=1&limit=1")
        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`)
        }
        const data = await response.json()
        console.log("API access check successful:", data)
      } catch (error) {
        console.error("API access check failed:", error)
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเข้าถึง API จัดการคำศัพท์ได้ โปรดตรวจสอบสิทธิ์การเข้าถึง",
          variant: "destructive",
        })
      }
    }

    checkApiAccess()
  }, [toast])

  const handleEdit = (word: any) => {
    setEditingWord(word)
    setActiveTab("add")
  }

  const handleAddNew = () => {
    setEditingWord(null)
    setActiveTab("add")
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if file is CSV
    if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
      toast({
        title: "รูปแบบไฟล์ไม่ถูกต้อง",
        description: "โปรดอัปโหลดไฟล์ CSV เท่านั้น",
        variant: "destructive",
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/words/import", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to import words")
      }

      const data = await response.json()

      toast({
        title: "นำเข้าสำเร็จ",
        description: `นำเข้าคำศัพท์ ${data.imported} คำเรียบร้อยแล้ว`,
      })

      // Reset file input
      event.target.value = ""

      // Switch to view tab
      setActiveTab("view")
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถนำเข้าคำศัพท์ได้ โปรดลองอีกครั้ง",
        variant: "destructive",
      })
    }
  }

  const handleDownloadTemplate = () => {
    // Create CSV content
    const csvContent = "english,thai,level\nbook,หนังสือ,a1\nhouse,บ้าน,a1\ncar,รถยนต์,a1"

    // Create blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)

    link.setAttribute("href", url)
    link.setAttribute("download", "oxford3000_template.csv")
    link.style.visibility = "hidden"

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex justify-between items-center mb-4">
        <TabsList>
          <TabsTrigger value="view">ดูคำศัพท์</TabsTrigger>
          <TabsTrigger value="add">{editingWord ? "แก้ไขคำศัพท์" : "เพิ่มคำศัพท์"}</TabsTrigger>
          <TabsTrigger value="import">นำเข้าคำศัพท์</TabsTrigger>
        </TabsList>

        {activeTab === "view" && (
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มคำศัพท์ใหม่
          </Button>
        )}
      </div>

      <TabsContent value="view" className="space-y-4">
        <WordsTable onEdit={handleEdit} />
      </TabsContent>

      <TabsContent value="add">
        <WordForm word={editingWord} onComplete={() => setActiveTab("view")} />
      </TabsContent>

      <TabsContent value="import">
        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <h3 className="text-lg font-medium mb-2">นำเข้าคำศัพท์จาก CSV</h3>
            <p className="text-sm text-muted-foreground mb-4">
              อัปโหลดไฟล์ CSV ที่มีคอลัมน์ดังนี้: english, thai, level (a1, a2, b1, b2, c1, c2)
            </p>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
            </div>
          </div>

          <div className="rounded-md border p-4">
            <h3 className="text-lg font-medium mb-2">ดาวน์โหลดเทมเพลต</h3>
            <p className="text-sm text-muted-foreground mb-4">ดาวน์โหลดไฟล์ CSV เทมเพลตเพื่อดูรูปแบบที่ต้องการ</p>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              ดาวน์โหลดเทมเพลต
            </Button>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  )
}
