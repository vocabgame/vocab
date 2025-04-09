import type React from "react"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Header } from "@/components/header"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  // ตรวจสอบเซสชันด้วย try-catch เพื่อป้องกันการผิดพลาดที่อาจเกิด
  try {
    // บันทึกค่า session เพื่อการแก้ไขปัญหา
    console.log('Server AuthenticatedLayout: session exists =', !!session, 'userId =', session?.user?.id || 'none')

    if (!session?.user?.id) {
      console.log('Server AuthenticatedLayout: redirect to homepage due to no user id')
      redirect("/")
    }
  } catch (error) {
    console.error('Server AuthenticatedLayout: Error checking session:', error)
    redirect("/")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session.user} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
