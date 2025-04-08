"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { MoreHorizontal, Pencil, Trash2, Volume2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface WordsTableProps {
  onEdit: (word: any) => void
}

export function WordsTable({ onEdit }: WordsTableProps) {
  const [words, setWords] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [levelFilter, setLevelFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [deleteWordId, setDeleteWordId] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchWords = async () => {
    try {
      setIsLoading(true)
      console.log("Fetching words with params:", { page, searchTerm, levelFilter })

      const response = await fetch(
        `/api/words?page=${page}&search=${searchTerm}&level=${levelFilter === "all" ? "" : levelFilter}`,
      )

      console.log("API response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("API error:", errorData)
        throw new Error(errorData.error || "Failed to fetch words")
      }

      const data = await response.json()
      console.log("Words data received:", data)

      setWords(data.words)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error("Error fetching words:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถโหลดคำศัพท์ได้ โปรดลองอีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWords()
  }, [page, searchTerm, levelFilter])

  const handleDelete = async () => {
    if (!deleteWordId) return

    try {
      const response = await fetch(`/api/words/${deleteWordId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to delete word")
      }

      toast({
        title: "สำเร็จ",
        description: "ลบคำศัพท์เรียบร้อยแล้ว",
      })

      fetchWords()
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบคำศัพท์ได้ โปรดลองอีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setDeleteWordId(null)
    }
  }

  const playPronunciation = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = "en-US"
    window.speechSynthesis.speak(utterance)
  }

  return (
    <>
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <Input
          placeholder="ค้นหาคำศัพท์..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:w-1/3"
        />
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="md:w-1/4">
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
      </div>

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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  กำลังโหลด...
                </TableCell>
              </TableRow>
            ) : words.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  ไม่พบคำศัพท์
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">เปิดเมนู</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(word)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          แก้ไข
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteWordId(word._id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          ลบ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          แสดง {words.length} จาก {totalPages * 10} คำ
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ก่อนหน้า
          </Button>
          <p className="text-sm">
            หน้า {page} จาก {totalPages}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => (p < totalPages ? p + 1 : p))}
            disabled={page === totalPages}
          >
            ถัดไป
          </Button>
        </div>
      </div>

      <AlertDialog open={!!deleteWordId} onOpenChange={(open) => !open && setDeleteWordId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>คุณแน่ใจหรือไม่?</AlertDialogTitle>
            <AlertDialogDescription>การกระทำนี้ไม่สามารถย้อนกลับได้ คำศัพท์นี้จะถูกลบออกจากฐานข้อมูลอย่างถาวร</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>ลบ</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
