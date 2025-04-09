"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Volume2 } from "lucide-react"

const formSchema = z.object({
  english: z.string().min(1, "กรุณากรอกคำศัพท์ภาษาอังกฤษ"),
  thai: z.string().min(1, "กรุณากรอกคำแปลภาษาไทย"),
  level: z.string().min(1, "กรุณาเลือกระดับ CEFR"),
})

interface WordFormProps {
  word?: any
  onComplete: () => void
}

export function WordForm({ word, onComplete }: WordFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      english: word?.english || "",
      thai: word?.thai || "",
      level: word?.level || "",
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true)

      const url = word?._id ? `/api/words/${word._id}` : "/api/words"

      const method = word?._id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save word")
      }

      toast({
        title: "สำเร็จ",
        description: word?._id ? "อัปเดตคำศัพท์เรียบร้อยแล้ว" : "เพิ่มคำศัพท์เรียบร้อยแล้ว",
      })

      onComplete()
    } catch (error) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error instanceof Error ? error.message : "ไม่สามารถบันทึกคำศัพท์ได้ โปรดลองอีกครั้ง",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const playPronunciation = () => {
    const word = form.getValues("english")
    if (!word) return

    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = "en-US"
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="english"
            render={({ field }) => (
              <FormItem>
                <FormLabel>คำศัพท์ภาษาอังกฤษ</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input placeholder="กรอกคำศัพท์ภาษาอังกฤษ" {...field} />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={playPronunciation}
                    disabled={!field.value}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="thai"
            render={({ field }) => (
              <FormItem>
                <FormLabel>คำแปลภาษาไทย</FormLabel>
                <FormControl>
                  <Input placeholder="กรอกคำแปลภาษาไทย" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ระดับ CEFR</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="เลือกระดับ CEFR" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="a1">A1</SelectItem>
                    <SelectItem value="a2">A2</SelectItem>
                    <SelectItem value="b1">B1</SelectItem>
                    <SelectItem value="b2">B2</SelectItem>
                    <SelectItem value="c1">C1</SelectItem>
                    <SelectItem value="c2">C2</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onComplete}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "กำลังบันทึก..." : word?._id ? "อัปเดตคำศัพท์" : "เพิ่มคำศัพท์"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
