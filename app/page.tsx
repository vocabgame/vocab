import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { BookOpen, BarChart3, Settings } from "lucide-react"
import { LoginButton } from "@/components/login-button"
import { DebugLoginButton } from "@/components/debug-login-button"
import Link from "next/link"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/game")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-background">
        <div className="container flex h-16 items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-xl font-bold">Oxford 3000 Vocabulary Game</h1>
          </div>
          <nav>
            <LoginButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  เรียนรู้คำศัพท์ภาษาอังกฤษ
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">
                  เรียนรู้คำศัพท์ Oxford 3000 แบ่งตามระดับ CEFR ด้วยเกมทายคำที่สนุกและมีประสิทธิภาพ
                </p>
              </div>
              <div className="space-x-4">
                <LoginButton />
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">วิธีการเล่น</h2>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed">
                    เกมของเราช่วยให้คุณเรียนรู้คำศัพท์ภาษาอังกฤษได้อย่างมีประสิทธิภาพด้วยวิธีที่ได้รับการพิสูจน์แล้ว
                  </p>
                </div>
                <ul className="grid gap-6">
                  <li className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      1
                    </div>
                    <div>ฟังการออกเสียงของคำศัพท์ภาษาอังกฤษ</div>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      2
                    </div>
                    <div>เลือกคำแปลภาษาไทยที่ถูกต้องจากตัวเลือกที่มีให้</div>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      3
                    </div>
                    <div>ติดตามความคืบหน้าของคุณผ่านระดับ CEFR ต่างๆ (A1, A2, B1, ฯลฯ)</div>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[400px] w-[400px] rounded-lg bg-gradient-to-b from-primary/20 to-primary/5 p-4">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="space-y-8 rounded-lg border bg-background p-8 shadow-lg">
                      <div className="space-y-2 text-center">
                        <h3 className="text-2xl font-bold">ตัวอย่าง</h3>
                        <p className="text-4xl">book</p>
                        <Button size="sm" variant="outline" className="mt-2">
                          🔊 ฟังเสียง
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline">หนังสือ</Button>
                        <Button variant="outline">ปากกา</Button>
                        <Button variant="outline">โต๊ะ</Button>
                        <Button variant="outline">เก้าอี้</Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">คุณสมบัติ</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed">
                  เกมคำศัพท์ของเราออกแบบมาเพื่อให้การเรียนรู้คำศัพท์ภาษาอังกฤษมีประสิทธิภาพและสนุกสนาน
                </p>
              </div>
              <div className="mx-auto grid max-w-5xl gap-6 py-12 md:grid-cols-3">
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                  <BookOpen className="h-12 w-12 text-primary" />
                  <h3 className="text-xl font-bold">คำศัพท์ Oxford 3000</h3>
                  <p className="text-sm text-muted-foreground">
                    เรียนรู้คำศัพท์ภาษาอังกฤษที่สำคัญที่สุด 3000 คำ จัดเรียงตามระดับ CEFR
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                  <BarChart3 className="h-12 w-12 text-primary" />
                  <h3 className="text-xl font-bold">ติดตามความคืบหน้า</h3>
                  <p className="text-sm text-muted-foreground">ติดตามความคืบหน้าในการเรียนรู้และไม่เห็นคำเดิมซ้ำอีก</p>
                </div>
                <div className="flex flex-col items-center space-y-2 rounded-lg border p-6 shadow-sm">
                  <Settings className="h-12 w-12 text-primary" />
                  <h3 className="text-xl font-bold">แดชบอร์ดสำหรับผู้ดูแล</h3>
                  <p className="text-sm text-muted-foreground">
                    <Link href="/dashboard" className="text-primary hover:underline">
                      จัดการคำศัพท์
                    </Link>{" "}
                    ในฐานข้อมูลได้อย่างง่ายดาย (สำหรับผู้ดูแลระบบ)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-center mb-8">
                ตัวเลือกการเข้าสู่ระบบสำหรับการแก้ไขปัญหา
              </h2>
              <div className="bg-background p-6 rounded-lg shadow-md">
                <DebugLoginButton />
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Oxford 3000 Vocabulary Game. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
