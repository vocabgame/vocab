export function isAdmin(session: any) {
  // ตรวจสอบว่า session มี user และ user มี role เป็น admin หรือไม่
  return session?.user?.role === "admin"
}
