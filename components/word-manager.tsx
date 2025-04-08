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

interface WordManagerProps {
  wordCount: number
  recentWords: any[]
}

export function WordManager({ wordCount, recentWords }: WordManagerProps) {
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
  const [bulkLevel, setBulkLevel] = useState("a1")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const { toast } = useToast()

  // ฟังก์ชันสำหรับโหลดคำศัพท์
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
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดคำศัพท์ได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันสำหรับเพิ่มหรืออัปเดตคำศัพท์
  const saveWord = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.english || !formData.thai || !formData.level) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      // ถ้ามี _id แสดงว่าเป็นการอัปเดต
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
        title: isUpdate ? "อัปเดตคำศัพท์สำเร็จ" : "เพิ่มคำศัพท์สำเร็จ",
        description: `คำศัพท์ "${data.english}" ${isUpdate ? "ถูกอัปเดต" : "ถูกเพิ่ม"}เรียบร้อยแล้ว`,
      })

      // รีเซ็ตฟอร์ม
      setFormData({
        _id: "",
        english: "",
        thai: "",
        level: "a1",
      })

      // โหลดคำศัพท์ใหม่
      loadWords()

      // กลับไปที่แท็บดูคำศัพท์
      setActiveTab("view")
    } catch (error) {
      console.error("Error saving word:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถบันทึกคำศัพท์ได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันสำหรับลบคำศัพท์
  const deleteWord = async (id: string) => {
    if (!confirm("คุณแน่ใจหรือไม่ที่จะลบคำศัพท์นี้?")) {
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
        description: "ลบคำศัพท์เรียบร้อยแล้ว",
      })

      // อัปเดตรายการคำศัพท์
      setWords(words.filter((word) => word._id !== id))
    } catch (error) {
      console.error("Error deleting word:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบคำศัพท์ได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันสำหรับเพิ่มคำศัพท์ตัวอย่าง
  const addSampleWords = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/words/add-sample")

      if (!response.ok) {
        throw new Error("Failed to add sample words")
      }

      const data = await response.json()

      toast({
        title: "เพิ่มคำศัพท์ตัวอย่างสำเร็จ",
        description: data.message,
      })

      // โหลดคำศัพท์ใหม่
      loadWords()
    } catch (error) {
      console.error("Error adding sample words:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเพิ่มคำศัพท์ตัวอย่างได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันสำหรับล้างคำศัพท์ทั้งหมด
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
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถล้างคำศัพท์ทั้งหมดได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันสำหรับรีเซตความคืบหน้า
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
        title: "รีเซตความคืบหน้าสำเร็จ",
        description: data.message,
      })
    } catch (error) {
      console.error("Error resetting progress:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถรีเซตความคืบหน้าได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันสำหรับเล่นเสียงคำศัพท์
  const playPronunciation = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = "en-US"
    window.speechSynthesis.speak(utterance)
  }

  // ฟังก์ชันสำหรับเพิ่มคำศัพท์แบบหลายคำ
  const addBulkWords = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!bulkData || !bulkLevel) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกข้อมูลคำศัพท์และเลือกระดับ",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setIsUploading(true)
      setUploadProgress(0)

      // แยกข้อมูลเป็นคู่คำศัพท์
      const wordPairs = bulkData
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          const [english, thai] = line.split(",").map((part) => part.trim())
          return { english, thai, level: bulkLevel }
        })
        .filter((pair) => pair.english && pair.thai)

      if (wordPairs.length === 0) {
        throw new Error("ไม่พบคู่คำศัพท์ที่ถูกต้อง โปรดตรวจสอบรูปแบบข้อมูล")
      }

      // แบ่งคำศัพท์เป็นชุดๆ ละ 20 คำ เพื่อส่งทีละชุด
      const batchSize = 20
      const batches = []
      for (let i = 0; i < wordPairs.length; i += batchSize) {
        batches.push(wordPairs.slice(i, i + batchSize))
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

        // อัพเดตจำนวนคำที่เพิ่มและอัพเดต
        addedCount += data.addedCount
        updatedCount += data.updatedCount
        processedCount += batch.length

        // อัพเดตความคืบหน้า
        const progress = Math.round((processedCount / wordPairs.length) * 100)
        setUploadProgress(progress)
      }

      toast({
        title: "เพิ่มคำศัพท์แบบหลายคำสำเร็จ",
        description: `เพิ่มคำศัพท์ ${addedCount} คำ, อัปเดต ${updatedCount} คำ`,
      })

      // รีเซ็ตฟอร์ม
      setBulkData("")
      setUploadProgress(0)
      setIsUploading(false)

      // โหลดคำศัพท์ใหม่
      loadWords()

      // กลับไปที่แท็บดูคำศัพท์
      setActiveTab("view")
    } catch (error) {
      console.error("Error adding bulk words:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเพิ่มคำศัพท์แบบหลายคำได้",
        variant: "destructive",
      })
      setUploadProgress(0)
      setIsUploading(false)
    } finally {
      setIsLoading(false)
    }
  }

  // ฟังก์ชันสำหรับดาวน์โหลดเทมเพลต
  const downloadTemplate = () => {
    const template = `book,หนังสือ
house,บ้าน
car,รถยนต์
water,น้ำ
food,อาหาร`

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
          <CardTitle>สถิติคำศัพท์</CardTitle>
          <CardDescription>ข้อมูลสถิติเกี่ยวกับคำศัพท์ในฐานข้อมูล</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">จำนวนคำศัพท์ทั้งหมด</div>
              <div className="mt-1 text-2xl font-bold">{wordCount}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">คำศัพท์ที่แสดงในตาราง</div>
              <div className="mt-1 text-2xl font-bold">{words.length}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-sm font-medium text-muted-foreground">การจัดการ</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={addSampleWords} disabled={isLoading}>
                  เพิ่มคำศัพท์ตัวอย่าง
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      รีเซตความคืบหน้า
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                      <AlertDialogDescription>
                        การรีเซตความคืบหน้าจะลบประวัติการเรียนรู้คำศัพท์ทั้งหมดของคุณ และเริ่มต้นใหม่ที่ระดับ A1
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction onClick={resetProgress} className="bg-destructive text-destructive-foreground">
                        รีเซตความคืบหน้า
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
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="view">ดูคำศัพท์</TabsTrigger>
            <TabsTrigger value="add">{formData._id ? "แก้ไขคำศัพท์" : "เพิ่มคำศัพท์"}</TabsTrigger>
            <TabsTrigger value="bulk">เพิ่มคำศัพท์หลายคำ</TabsTrigger>
          </TabsList>

          {activeTab === "view" && (
            <div className="flex gap-2">
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
              >
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มคำศัพท์ใหม่
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isLoading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    ล้างคำศัพท์ทั้งหมด
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
                    <AlertDialogDescription>
                      การล้างคำศัพท์ทั้งหมดจะลบคำศัพท์ทั้งหมดในฐานข้อมูล การกระทำนี้ไม่สามารถย้อนกลับได้
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllWords} className="bg-destructive text-destructive-foreground">
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
              <div className="flex flex-col md:flex-row gap-4 mb-4">
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
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={levelFilter} onValueChange={setLevelFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
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
                  <Button onClick={loadWords} disabled={isLoading} variant="outline" className="w-full sm:w-auto">
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
                        <TableHead>คำศัพท์ภาษาอังกฤษ</TableHead>
                        <TableHead>คำแปลภาษาไทย</TableHead>
                        <TableHead>ระดับ</TableHead>
                        <TableHead className="w-[100px]">จัดการ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {words.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-8">
                            {isLoading ? "กำลังโหลด..." : "ไม่พบคำศัพท์ในฐานข้อมูล"}
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
                                  <span className="sr-only">ฟังเสียง</span>
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
              <CardTitle>{formData._id ? `แก้ไขคำศัพท์: ${formData.english}` : "เพิ่มคำศัพท์ใหม่"}</CardTitle>
              <CardDescription>กรอกข้อมูลคำศัพท์ที่ต้องการเพิ่มหรือแก้ไข</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveWord} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="english">คำศัพท์ภาษาอังกฤษ</Label>
                    <Input
                      id="english"
                      value={formData.english}
                      onChange={(e) => setFormData({ ...formData, english: e.target.value })}
                      placeholder="กรอกคำศัพท์ภาษาอังกฤษ"
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
                      {isLoading ? "กำลังบันทึก..." : formData._id ? "อัปเดตคำศัพท์" : "เพิ่มคำศัพท์"}
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
              <CardTitle>เพิ่มคำศัพท์หลายคำ</CardTitle>
              <CardDescription>
                เพิ่มคำศัพท์หลายคำพร้อมกัน โดยใช้รูปแบบ "คำศัพท์ภาษาอังกฤษ,คำแปลภาษาไทย" แต่ละคู่คำศัพท์ให้อยู่คนละบรรทัด
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
                    placeholder="book,หนังสือ
house,บ้าน
car,รถยนต์"
                    className="min-h-[200px]"
                    required
                  />
                  {isUploading && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>กำลังอัพโหลด...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">แต่ละบรรทัดควรมีรูปแบบ "คำศัพท์ภาษาอังกฤษ,คำแปลภาษาไทย"</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bulkLevel">ระดับ CEFR</Label>
                  <Select value={bulkLevel} onValueChange={setBulkLevel}>
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
                        setBulkData("")
                        setActiveTab("view")
                      }}
                    >
                      ยกเลิก
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "กำลังบันทึก..." : "เพิ่มคำศัพท์"}
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
