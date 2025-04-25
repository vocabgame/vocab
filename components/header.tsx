"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { BookOpen, BarChart3, LogOut, User, Database, Layers, Menu, Users } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

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
  const isMobile = useIsMobile()

  // สร้างรายการเมนูตามสิทธิ์ของผู้ใช้
  const navigationItems = [
    { href: "/game", label: "เล่นเกม", icon: null },
    { href: "/review", label: "ทบทวนคำศัพท์", icon: <BookOpen className="h-4 w-4" /> },
    { href: "/level-select", label: "เลือกระดับ", icon: <Layers className="h-4 w-4" /> },
    { href: "/wrong-words", label: "คำที่ตอบผิด", icon: <BarChart3 className="h-4 w-4" /> },
    { href: "/manage-words", label: "จัดการคำศัพท์", icon: <Database className="h-4 w-4" /> },
    // เพิ่มเมนูจัดการผู้ใช้สำหรับแอดมินเท่านั้น
    ...(user?.role === "admin" ? [{ href: "/users", label: "จัดการผู้ใช้", icon: <Users className="h-4 w-4" /> }] : []),
  ]

  const NavigationLinks = () => (
    <>
      {navigationItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant={pathname === item.href ? "default" : "ghost"}
            className="w-full justify-start"
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </Button>
        </Link>
      ))}
    </>
  )

  const UserButton = () => (
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
                e.currentTarget.src = "/placeholder.svg?height=32&width=32"
              }}
            />
          ) : (
            <User className="h-5 w-5" />
          )}
          <span className="sr-only">้ใช้</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled>
          <span>{user?.name || user?.email}</span>
        </DropdownMenuItem>
        {user?.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard">
              <Database className="mr-2 h-4 w-4" />
              <span>แดชบอร์ด</span>
            </Link>
          </DropdownMenuItem>
        )}
        {user?.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/users">
              <Users className="mr-2 h-4 w-4" />
              <span>จัดการผู้ใช้</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>ออกจากระบบ</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <header className="sticky top-0 z-40 border-b bg-background">
      <div className="container flex h-16 items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            <h1 className="text-xl font-bold">Oxford 3000</h1>
          </Link>
        </div>

        <nav className="flex items-center gap-4">
          {isMobile ? (
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">เมนู</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                  <nav className="flex flex-col gap-2 mt-6">
                    <NavigationLinks />
                  </nav>
                </SheetContent>
              </Sheet>
              <UserButton />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <NavigationLinks />
              </div>
              <UserButton />
            </>
          )}
        </nav>
      </div>
    </header>
  )
}



