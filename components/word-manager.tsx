"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Pencil, Plus, Trash2, Volume2, Search, RefreshCw, Upload, AlertTriangle, Download } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"
import { useIsMobile } from "@/hooks/use-mobile"

interface WordManagerProps {
  wordCount: number
  recentWords: any[]
}

export function WordManager({ wordCount, recentWords }: WordManagerProps) {
  const isMobile = useIsMobile()
  const [activeTab, setActiveTab] = useState("view")
  const [isLoading, setIsLoading] = useState(false)
  const [words, setWords] = useState<any[]>(recentWords)
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [formData, setFormData] = useState({
    _id: "",
    english: "",
    thai: "",
    level: "a1",
  })
  const [bulkData, setBulkData] = useState("")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  // โหลดคำศัพท์
  const loadWords = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(
        `/api/words?page=1&search=${searchTerm}&level=${levelFilter === "all" ? "" : levelFilter}`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch words")
      }

      const data = await response.json()
      setWords(data.words)

      toast({
        title: "โหลดคำศัพท์สำเร็จ",
        description: `โหลดคำศัพท์ ${data.words.length} คำ`,
      })
    } catch (error) {
      console.error("Error loading words:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถโหลดคำศัพท์ได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // บันทึกคำศัพท์
  const saveWord = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.english || !formData.thai || !formData.level) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรอกข้อมูลให้ครบช่อง",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      // ถ้า _id แสดงว่าเป็นการอัปเดต
      const isUpdate = !!formData._id

      const url = isUpdate ? `/api/words/${formData._id}` : "/api/words"
      const method = isUpdate ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          english: formData.english,
          thai: formData.thai,
          level: formData.level,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save word")
      }

      const data = await response.json()

      toast({
        title: isUpdate ? "อัปเดตคำศัพท์สำเร็จ" : "บันทึกคำศัพท์สำเร็จ",
        description: `คำศัพท์ "${data.english}" ${isUpdate ? "อัปเดต" : "บันทึก"} แล้ว`,
      })

      // ตั้งค่าฟอร์ม
      setFormData({
        _id: "",
        english: "",
        thai: "",
        level: "a1",
      })

      // โหลดคำศัพท์ใหม่
      loadWords()

      // ไปแท็บคำศัพท์
      setActiveTab("view")
    } catch (error) {
      console.error("Error saving word:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถบันทึกคำศัพท์ได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ลบคำศัพท์
  const deleteWord = async (id: string) => {
    if (!confirm("แน่ใจไม่จะลบคำศัพท์?")) {
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch(`/api/words/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete word")
      }

      toast({
        title: "ลบคำศัพท์สำเร็จ",
        description: "ลบคำศัพท์แล้ว",
      })

      // อัปเดตรายการคำศัพท์
      setWords(words.filter((word) => word._id !== id))
    } catch (error) {
      console.error("Error deleting word:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถลบคำศัพท์ได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  

  // ล้างคำศัพท์ส้งหมด
  const clearAllWords = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/words/clear-all", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to clear all words")
      }

      const data = await response.json()

      toast({
        title: "ล้างคำศัพท์ทั้งหมดสำเร็จ",
        description: data.message,
      })

      // อัปเดตรายการคำศัพท์
      setWords([])
    } catch (error) {
      console.error("Error clearing all words:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถล้างคำศัพท์ส้งหมดได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ตั้งค่าความคืบหน้า
  const resetProgress = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/progress/reset", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to reset progress")
      }

      const data = await response.json()

      toast({
        title: "ตั้งค่าความคืบหน้าสำเร็จ",
        description: data.message,
      })
    } catch (error) {
      console.error("Error resetting progress:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: "ไม่สามารถตั้งค่าความคืบหน้าได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันเล่นคำศัพท์
  const playPronunciation = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = "en-US"
    window.speechSynthesis.speak(utterance)
  }

  // บันทึกคำศัพท์แบบหลายคำ
  const addBulkWords = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bulkData) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรอกข้อมูลคำศัพท์",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setIsUploading(true)
      setUploadProgress(0)

      // แยกข้อมูลเป็นคำศัพท์
      const wordEntries = bulkData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          try {
            // แยกข้อมูลตามช่องว่าง
            const parts = line.split(/\s+/)

            // ต้องมีอย่างน้อย 4 ส่วน: ลำดับ, คำศัพท์, คำแปล, ระดับ
            if (parts.length < 4) return null

            // ส่วนแรกเป็นลำดับ (ใช้ในการบันทึก)
            const sequence = parseInt(parts[0], 10)
            if (isNaN(sequence)) {
              console.warn(`ลำดับไม่ถูกต้อง: ${parts[0]} ในบรรทัด: ${line}`)
              return null
            }

            // ส่วนสุดท้ายเป็นระดับ
            const level = parts[parts.length - 1].toLowerCase()

            // ตรวจสอบว่าระดับถูกต้อง
            if (!['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].includes(level)) {
              console.warn(`ระดับไม่ถูกต้อง: ${level} ในบรรทัด: ${line}`)
              return null
            }

            // ส่วนที่สองเป็นคำศัพท์ (อาจมีหลายคำ)
            // หาตำแหน่งของคำแปลโดยนับจากท้าย (ระดับ และ คำแปล)
            const thaiStartIndex = parts.length - 2

            // คำศัพท์อยู่ระหว่างลำดับและคำแปล
            const english = parts.slice(1, thaiStartIndex).join(" ")
            const thai = parts[thaiStartIndex]

            return { english, thai, level, sequence }
          } catch (error) {
            console.error(`ข้อผิดพลาดในการแยกข้อมูลบรรทัด: ${line}`, error)
            return null
          }
        })
        .filter((entry) => entry && entry.english && entry.thai && entry.level)

      if (wordEntries.length === 0) {
        throw new Error("ไม่พบคำศัพท์ที่ถูกต้อง โปรดตรวจสอบรูปแบบข้อมูล")
      }

      // แบ่งคำศัพท์เป็นชุด ชุดละ 20 คำ เพื่อส่งข้อมูล
      const batchSize = 20
      const batches = []
      for (let i = 0; i < wordEntries.length; i += batchSize) {
        batches.push(wordEntries.slice(i, i + batchSize))
      }

      let processedCount = 0
      let addedCount = 0
      let updatedCount = 0

      // ส่งข้อมูลทีละชุด
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]

        const response = await fetch("/api/words/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            words: batch,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to add bulk words")
        }

        const data = await response.json()

        // ตั้งค่าจำนวนคำบันทึกและอัปเดต
        addedCount += data.addedCount
        updatedCount += data.updatedCount
        processedCount += batch.length

        // ตั้งค่าความคืบหน้า
        const progress = Math.round((processedCount / wordEntries.length) * 100)
        setUploadProgress(progress)
      }

      toast({
        title: "บันทึกคำศัพท์หลายคำสำเร็จ",
        description: `บันทึกคำศัพท์ ${addedCount} คำ, อัปเดต ${updatedCount} คำ`,
      })

      // ตั้งค่าฟอร์ม
      setBulkData("")
      setUploadProgress(0)
      setIsUploading(false)

      // โหลดคำศัพท์ใหม่
      loadWords()

      // ไปแท็บคำศัพท์
      setActiveTab("view")
    } catch (error) {
      console.error("Error adding bulk words:", error)
      toast({
        title: "ข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถบันทึกคำศัพท์แบบหลายคำได้",
        variant: "destructive",
      })
      setUploadProgress(0)
      setIsUploading(false)
    } finally {
      setIsLoading(false)
    }
  }

  // ดาวน์โหลดเทมเพลต
  const downloadTemplate = () => {
    const template = `1 a an คำนำหน้านามไม่ชี้เฉพาะ a1
2 about เกี่ยวกับ a1
3 above ข้างบน a1
4 across ข้าม a1
5 action การกระทำ a1`

    const blob = new Blob([template], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "word_template.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>คำศัพท์</CardTitle>
          <CardDescription>ข้อมูลเกี่ยวคำศัพท์ในฐานข้อมูล</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">จำนวนคำศัพท์ทั้งหมด</div>
              <div className="mt-1 text-2xl font-bold">{wordCount}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">คำศัพท์แสดงในตาราง</div>
              <div className="mt-1 text-2xl font-bold">{words.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">การจัดการคำศัพท์</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      ล้างค่าความคืบหน้าทั้งหมด
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>แน่ใจไม่?</AlertDialogTitle>
                      <AlertDialogDescription>
                        การล้างค่าความคืบหน้าจะลบการเรียนคำศัพท์ทั้งหมด และเริ่มต้นใหม่ ที่ระดับ A1
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction onClick={resetProgress} className="bg-destructive text-destructive-foreground">
                        ตั้งค่าความคืบหน้า
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className={`${isMobile ? 'flex flex-col gap-4' : 'flex justify-between items-center'} mb-4`}>
          <TabsList className={isMobile ? 'w-full' : ''}>
            <TabsTrigger value="view" className={isMobile ? 'flex-1' : ''}>คำศัพท์</TabsTrigger>
            <TabsTrigger value="add" className={isMobile ? 'flex-1' : ''}>
              {formData._id ? "แก้ไขคำศัพท์" : "บันทึกคำศัพท์"}
            </TabsTrigger>
            <TabsTrigger value="bulk" className={isMobile ? 'flex-1' : ''}>เพิ่มหลายคำ</TabsTrigger>
          </TabsList>

          {activeTab === "view" && (
            <div className={`flex ${isMobile ? 'flex-col w-full' : ''} gap-2`}>
              <Button
                onClick={() => {
                  setFormData({
                    _id: "",
                    english: "",
                    thai: "",
                    level: "a1",
                  })
                  setActiveTab("add")
                }}
                disabled={isLoading}
                className={isMobile ? 'w-full' : ''}
              >
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มคำศัพท์ใหม่
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={isLoading}
                    className={isMobile ? 'w-full' : ''}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    ล้างคำศัพท์ทั้งหมด
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>แน่ใจไม่?</AlertDialogTitle>
                    <AlertDialogDescription>
                      การล้างคำศัพท์ทั้งหมดจะลบคำศัพท์ทั้งหมดในฐานข้อมูล การกระทำไม่สามารถย้อนกลับได้
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={clearAllWords}
                      className="bg-destructive text-destructive-foreground"
                    >
                      ล้างคำศัพท์ทั้งหมด
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>รายการคำศัพท์</CardTitle>
              <CardDescription>ค้นหาและจัดการคำศัพท์ในฐานข้อมูล</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`${isMobile ? 'flex flex-col' : 'flex flex-col md:flex-row'} gap-4 mb-4`}>
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="ค้นหาคำศัพท์..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className={isMobile ? 'w-full' : 'w-[180px]'}>
                      <SelectValue placeholder="กรองตามระดับ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">ทุกระดับ</SelectItem>
                      <SelectItem value="a1">A1</SelectItem>
                      <SelectItem value="a2">A2</SelectItem>
                      <SelectItem value="b1">B1</SelectItem>
                      <SelectItem value="b2">B2</SelectItem>
                      <SelectItem value="c1">C1</SelectItem>
                      <SelectItem value="c2">C2</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={loadWords}
                    disabled={isLoading}
                    variant="outline"
                    className={isMobile ? 'w-full' : ''}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    โหลดคำศัพท์
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>คำศัพท์</TableHead>
                        <TableHead>คำแปลภาษาไทย</TableHead>
                        <TableHead>ระดับ</TableHead>
                        <TableHead className="w-[100px]">การจัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {words.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            {isLoading ? "โหลด..." : "ไม่พบคำศัพท์ในฐานข้อมูล"}
                          </TableCell>
                        </TableRow>
                      ) : (
                        words.map((word) => (
                          <TableRow key={word._id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {word.english}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => playPronunciation(word.english)}
                                >
                                  <Volume2 className="h-4 w-4" />
                                  <span className="sr-only">เล่นคำศัพท์</span>
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{word.thai}</TableCell>
                            <TableCell className="uppercase">{word.level}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setFormData({
                                      _id: word._id,
                                      english: word.english,
                                      thai: word.thai,
                                      level: word.level,
                                    })
                                    setActiveTab("add")
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                  <span className="sr-only">แก้ไข</span>
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteWord(word._id)}>
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">ลบ</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>{formData._id ? `แก้ไขคำศัพท์: ${formData.english}` : "บันทึกคำศัพท์ใหม่"}</CardTitle>
              <CardDescription>กรอกข้อมูลคำศัพท์ที่ต้องการบันทึกหรือแก้ไข</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveWord} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="english">คำศัพท์</Label>
                    <Input
                      id="english"
                      value={formData.english}
                      onChange={(e) => setFormData({ ...formData, english: e.target.value })}
                      placeholder="กรอกคำศัพท์"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thai">คำแปลภาษาไทย</Label>
                    <Input
                      id="thai"
                      value={formData.thai}
                      onChange={(e) => setFormData({ ...formData, thai: e.target.value })}
                      placeholder="กรอกคำแปลภาษาไทย"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">ระดับ CEFR</Label>
                  <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกระดับ CEFR" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a1">A1</SelectItem>
                      <SelectItem value="a2">A2</SelectItem>
                      <SelectItem value="b1">B1</SelectItem>
                      <SelectItem value="b2">B2</SelectItem>
                      <SelectItem value="c1">C1</SelectItem>
                      <SelectItem value="c2">C2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <CardFooter className="px-0 pt-4">
                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFormData({
                          _id: "",
                          english: "",
                          thai: "",
                          level: "a1",
                        })
                        setActiveTab("view")
                      }}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "..." : formData._id ? "อัปเดตคำศัพท์" : "บันทึกคำศัพท์"}
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle>เพิ่มคำศัพท์ทีละหลายคำ</CardTitle>
              <CardDescription>
                เพิ่มคำศัพท์หลายคำพร้อมกัน โดยกำหนดลำดับเลขที่ คำศัพท์ คำแปล และระดับ ในรูปแบบตาราง
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addBulkWords} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="bulkData">ข้อมูลคำศัพท์</Label>
                    <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
                      <Download className="mr-2 h-4 w-4" />
                      ดาวน์โหลดเทมเพลต
                    </Button>
                  </div>
                  <Textarea
                    id="bulkData"
                    value={bulkData}
                    onChange={(e) => setBulkData(e.target.value)}
                    placeholder="1 a an คำนำหน้านามไม่ชี้เฉพาะ a1
2 about เกี่ยวกับ a1
3 above ข้างบน a1"
                    className="min-h-[300px] font-mono"
                    required
                  />
                  {isUploading && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>กำลังโหลด...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">รูปแบบการป้อนข้อมูล:</p>
                    <p className="text-sm text-muted-foreground">- แต่ละบรรทัดคือคำศัพท์หนึ่งคำ</p>
                    <p className="text-sm text-muted-foreground">- รูปแบบ: <strong>ลำดับ คำศัพท์ คำแปล ระดับ</strong></p>
                    <p className="text-sm text-muted-foreground">- ตัวอย่าง: "1 a an คำนำหน้านามไม่ชี้เฉพาะ a1"</p>
                    <p className="text-sm text-muted-foreground">- ระดับที่รองรับ: a1, a2, b1, b2, c1, c2</p>
                  </div>
                </div>
                <CardFooter className="px-0 pt-4">
                  <div className="flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setBulkData("")
                        setActiveTab("view")
                      }}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "..." : "บันทึกคำศัพท์"}
                      <Upload className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

