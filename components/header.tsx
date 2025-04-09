"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BookOpen, BarChart3, LogOut, User, Database, Layers, Menu } from "lucide-react"
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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  return (
    <header className="sticky top-0 z-40 bg-black text-white border-b">
      <div className="container flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-xl font-bold">Oxford 3000</h1>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={pathname === "/game" ? "default" : "ghost"} 
                className="rounded-lg py-2 px-4 text-base hover:bg-white hover:text-black transition-all">
                เล่นเกม
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black text-white shadow-md rounded-lg">
              <DropdownMenuItem>
                <Link href="/game">เล่นเกม</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={pathname === "/level-select" ? "default" : "ghost"} 
                className="rounded-lg py-2 px-4 text-base hover:bg-white hover:text-black transition-all">
                <Layers className="mr-2 h-4 w-4" />
                เลือกระดับ
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black text-white shadow-md rounded-lg">
              <DropdownMenuItem>
                <Link href="/level-select">เลือกระดับ</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={pathname === "/progress" ? "default" : "ghost"} 
                className="rounded-lg py-2 px-4 text-base hover:bg-white hover:text-black transition-all">
                <BarChart3 className="mr-2 h-4 w-4" />
                ความคืบหน้า
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black text-white shadow-md rounded-lg">
              <DropdownMenuItem>
                <Link href="/progress">ความคืบหน้า</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={pathname === "/manage-words" ? "default" : "ghost"} 
                className="rounded-lg py-2 px-4 text-base hover:bg-white hover:text-black transition-all">
                <Database className="mr-2 h-4 w-4" />
                จัดการคำศัพท์
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black text-white shadow-md rounded-lg">
              <DropdownMenuItem>
                <Link href="/manage-words">จัดการคำศัพท์</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full border-white p-1 hover:bg-white hover:text-black transition-all">
                {user?.image ? (
                  <img
                    src={user.image || "/placeholder.svg?height=32&width=32"}
                    alt={user.name || "User"}
                    className="h-8 w-8 rounded-full"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                    }}
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
                <span className="sr-only">เมนูผู้ใช้</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-black text-white shadow-md rounded-lg">
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

        {/* Mobile Navigation */}
        <nav className="lg:hidden flex items-center gap-4">
          <Button variant="outline" onClick={toggleMenu} className="rounded-full p-2 border-white hover:bg-white hover:text-black transition-all">
            <Menu className="h-6 w-6" />
          </Button>

          {/* Dropdown Menu for Mobile */}
          {isMenuOpen && (
            <div className="absolute top-16 right-4 bg-black text-white shadow-md rounded-lg p-4 w-48">
              <Link href="/game" className="block py-2 text-base hover:bg-white hover:text-black transition-all rounded">เล่นเกม</Link>
              <Link href="/level-select" className="block py-2 text-base hover:bg-white hover:text-black transition-all rounded">เลือกระดับ</Link>
              <Link href="/progress" className="block py-2 text-base hover:bg-white hover:text-black transition-all rounded">ความคืบหน้า</Link>
              <Link href="/manage-words" className="block py-2 text-base hover:bg-white hover:text-black transition-all rounded">จัดการคำศัพท์</Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="rounded-full w-full border-white">
                    {user?.image ? (
                      <img
                        src={user.image || "/placeholder.svg?height=32&width=32"}
                        alt={user.name || "User"}
                        className="h-8 w-8 rounded-full"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                        }}
                      />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black text-white shadow-md rounded-lg">
                  <DropdownMenuItem disabled>
                    <span>{user?.name || user?.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>ออกจากระบบ</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
