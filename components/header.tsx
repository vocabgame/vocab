"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BookOpen, BarChart3, LogOut, User, Database, Layers, Menu as HamburgerIcon } from "lucide-react"
import { useState } from "react"

interface HeaderProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string | null
  }
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-xl font-bold">Oxford 3000</h1>
          </Link>
        </div>

        {/* ปุ่มเมนูแบบ Hamburger สำหรับหน้าจอเล็ก */}
        <div className="flex sm:hidden">
          <Button variant="ghost" onClick={toggleMenu} className="p-2">
            <HamburgerIcon className="h-6 w-6" />
          </Button>
        </div>

        {/* เมนูที่แสดงในหน้าจอใหญ่ */}
        <nav className={`flex items-center gap-4 space-x-2 sm:space-x-4 ${isMenuOpen ? "block" : "hidden"} sm:flex`}>
          <Link href="/game">
            <Button variant={pathname === "/game" ? "default" : "ghost"}>เล่นเกม</Button>
          </Link>
          <Link href="/level-select">
            <Button variant={pathname === "/level-select" ? "default" : "ghost"} className="flex items-center">
              <Layers className="mr-2 h-4 w-4" />
              เลือกระดับ
            </Button>
          </Link>
          <Link href="/progress">
            <Button variant={pathname === "/progress" ? "default" : "ghost"} className="flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              ความคืบหน้า
            </Button>
          </Link>

          <Link href="/manage-words">
            <Button variant={pathname === "/manage-words" ? "default" : "ghost"} className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              จัดการคำศัพท์
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                {user?.image ? (
                  <img
                    src={user.image || "/placeholder.svg?height=32&width=32"}
                    alt={user.name || "User"}
                    className="h-8 w-8 rounded-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback เมื่อโหลดรูปไม่สำเร็จ
                      e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                    }}
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="sr-only">เมนูผู้ใช้</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>
                <span>{user?.name || user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>ออกจากระบบ</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>

      {/* เมนู Dropdown ในหน้าจอเล็ก */}
      <div className={`sm:hidden ${isMenuOpen ? "block" : "hidden"}`}>
        <nav className="flex flex-col items-start gap-2 p-4">
          <Link href="/game">
            <Button variant={pathname === "/game" ? "default" : "ghost"}>เล่นเกม</Button>
          </Link>
          <Link href="/level-select">
            <Button variant={pathname === "/level-select" ? "default" : "ghost"} className="flex items-center">
              <Layers className="mr-2 h-4 w-4" />
              เลือกระดับ
            </Button>
          </Link>
          <Link href="/progress">
            <Button variant={pathname === "/progress" ? "default" : "ghost"} className="flex items-center">
              <BarChart3 className="mr-2 h-4 w-4" />
              ความคืบหน้า
            </Button>
          </Link>

          <Link href="/manage-words">
            <Button variant={pathname === "/manage-words" ? "default" : "ghost"} className="flex items-center">
              <Database className="mr-2 h-4 w-4" />
              จัดการคำศัพท์
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
