import { redirect } from "next/navigation"
import { NextRequest } from "next/server"

export function GET(request: NextRequest) {
  redirect("/wrong-words")
}
