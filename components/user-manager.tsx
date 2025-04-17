"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
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
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Pencil, Trash2, UserCog } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

interface User {
  _id: string
  name?: string
  email?: string
  image?: string
  role?: string
}

interface UserManagerProps {
  users: User[]
}

export function UserManager({ users: initialUsers }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [isLoading, setIsLoading] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const handleEditUser = (user: User) => {
    setEditingUser(user)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingUser) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${editingUser._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
          role: editingUser.role,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user")
      }

      const updatedUser = await response.json()
      
      // อัพเดตข้อมูลผู้ใช้ในรายการ
      setUsers(users.map(user => 
        user._id === editingUser._id ? { ...user, ...updatedUser } : user
      ))

      toast({
        title: "อัพเดตข้อมูลผู้ใช้สำเร็จ",
        description: `อัพเดตข้อมูลของ ${editingUser.name || editingUser.email} เรียบร้อยแล้ว`,
      })

      setEditingUser(null)
    } catch (error) {
      console.error("Error updating user:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดตข้อมูลผู้ใช้ได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete user")
      }

      // ลบผู้ใช้ออกจากรายการ
      setUsers(users.filter(user => user._id !== userId))

      toast({
        title: "ลบผู้ใช้สำเร็จ",
        description: "ลบผู้ใช้ออกจากระบบเรียบร้อยแล้ว",
      })
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถลบผู้ใช้ได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleAdmin = async (user: User) => {
    setIsLoading(true)
    try {
      const newRole = user.role === "admin" ? "user" : "admin"
      
      const response = await fetch(`/api/users/${user._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: newRole,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update user role")
      }

      // อัพเดตข้อมูลผู้ใช้ในรายการ
      setUsers(users.map(u => 
        u._id === user._id ? { ...u, role: newRole } : u
      ))

      toast({
        title: "อัพเดตสถานะแอดมินสำเร็จ",
        description: `${user.name || user.email} ${newRole === "admin" ? "เป็นแอดมินแล้ว" : "ไม่ได้เป็นแอดมินแล้ว"}`,
      })
    } catch (error) {
      console.error("Error toggling admin status:", error)
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัพเดตสถานะแอดมินได้",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>รายชื่อผู้ใช้งานระบบ</CardTitle>
        <CardDescription>จัดการผู้ใช้งานทั้งหมดในระบบ แก้ไขข้อมูล ลบผู้ใช้ และเปลี่ยนสถานะแอดมิน</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ชื่อ</TableHead>
                <TableHead>อีเมล</TableHead>
                <TableHead>สถานะ</TableHead>
                <TableHead className="text-right">จัดการ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    ไม่พบข้อมูลผู้ใช้
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {user.image && (
                          <img 
                            src={user.image} 
                            alt={user.name || "User"} 
                            className="h-8 w-8 rounded-full"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg?height=32&width=32"
                            }}
                          />
                        )}
                        {user.name || "ไม่ระบุชื่อ"}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${user.role === "admin" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {user.role === "admin" ? "แอดมิน" : "ผู้ใช้ทั่วไป"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="icon" onClick={() => handleEditUser(user)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">แก้ไข</span>
                            </Button>
                          </DialogTrigger>
                          {editingUser && (
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>แก้ไขข้อมูลผู้ใช้</DialogTitle>
                                <DialogDescription>
                                  แก้ไขข้อมูลของผู้ใช้ {editingUser.name || editingUser.email}
                                </DialogDescription>
                              </DialogHeader>
                              <form onSubmit={handleUpdateUser}>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="name">ชื่อ</Label>
                                    <Input
                                      id="name"
                                      value={editingUser.name || ""}
                                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="email">อีเมล</Label>
                                    <Input
                                      id="email"
                                      type="email"
                                      value={editingUser.email || ""}
                                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor="admin">สถานะแอดมิน</Label>
                                    <Switch
                                      id="admin"
                                      checked={editingUser.role === "admin"}
                                      onCheckedChange={(checked) => 
                                        setEditingUser({ ...editingUser, role: checked ? "admin" : "user" })
                                      }
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "กำลังบันทึก..." : "บันทึก"}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          )}
                        </Dialog>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleToggleAdmin(user)}
                          disabled={isLoading}
                        >
                          <UserCog className="h-4 w-4" />
                          <span className="sr-only">
                            {user.role === "admin" ? "ยกเลิกสิทธิ์แอดมิน" : "ให้สิทธิ์แอดมิน"}
                          </span>
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">ลบ</span>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ยืนยันการลบผู้ใช้</AlertDialogTitle>
                              <AlertDialogDescription>
                                คุณต้องการลบผู้ใช้ {user.name || user.email} ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user._id)}
                                disabled={isLoading}
                              >
                                {isLoading ? "กำลังลบ..." : "ลบ"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
  )
}
