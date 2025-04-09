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
import { Pencil, Plus, Trash2 } from "lucide-react"

interface SimpleDashboardProps {
  wordCount: number
  recentWords: any[]
}

export function SimpleDashboard({ wordCount, recentWords }: SimpleDashboardProps) {
  const [activeTab, setActiveTab] = useState("view")
  const [isLoading, setIsLoading] = useState(false)
  const [words, setWords] = useState<any[]>(recentWords)
  const [formData, setFormData] = useState({
    english: "",
    thai: "",
    level: "a1",
  })
  const { toast } = useToast()

  // ฟังก์ชันสำหรับโหลดคำศัพท์
  const loadWords = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/words?page=1")

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

  // ฟังก์ชันสำหรับเพิ่มคำศัพท์
  const addWord = async (e: React.FormEvent) => {
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
      const response = await fetch("/api/words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to add word")
      }

      const data = await response.json()

      toast({
        title: "เพิ่มคำศัพท์สำเร็จ",
        description: `เพิ่มคำศัพท์ "${data.english}" เรียบร้อยแล้ว`,
      })

      // รีเซ็ตฟอร์ม
      setFormData({
        english: "",
        thai: "",
        level: "a1",
      })

      // โหลดคำศัพท์ใหม่
      loadWords()

      // กลับไปที่แท็บดูคำศัพท์
      setActiveTab("view")
    } catch (error) {
      console.error("Error adding word:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถเพิ่มคำศัพท์ได้",
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
              <div className="mt-1">
                <Button variant="outline" size="sm" onClick={loadWords} disabled={isLoading}>
                  โหลดคำศัพท์ทั้งหมด
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="view">ดูคำศัพท์</TabsTrigger>
            <TabsTrigger value="add">เพิ่มคำศัพท์</TabsTrigger>
          </TabsList>

          {activeTab === "view" && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={addSampleWords} disabled={isLoading}>
                เพิ่มคำศัพท์ตัวอย่าง
              </Button>
              <Button onClick={() => setActiveTab("add")} disabled={isLoading}>
                <Plus className="mr-2 h-4 w-4" />
                เพิ่มคำศัพท์ใหม่
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>รายการคำศัพท์</CardTitle>
              <CardDescription>แสดงคำศัพท์ล่าสุดในฐานข้อมูล คลิก "โหลดคำศัพท์ทั้งหมด" เพื่อดูคำศัพท์ทั้งหมด</CardDescription>
            </CardHeader>
            <CardContent>
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
                          ไม่พบคำศัพท์ในฐานข้อมูล
                        </TableCell>
                      </TableRow>
                    ) : (
                      words.map((word) => (
                        <TableRow key={word._id}>
                          <TableCell className="font-medium">{word.english}</TableCell>
                          <TableCell>{word.thai}</TableCell>
                          <TableCell className="uppercase">{word.level}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setFormData({
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>{formData.english ? `แก้ไขคำศัพท์: ${formData.english}` : "เพิ่มคำศัพท์ใหม่"}</CardTitle>
              <CardDescription>กรอกข้อมูลคำศัพท์ที่ต้องการเพิ่มหรือแก้ไข</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addWord} className="space-y-4">
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
                      {isLoading ? "กำลังบันทึก..." : formData.english ? "อัปเดตคำศัพท์" : "เพิ่มคำศัพท์"}
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
