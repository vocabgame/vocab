import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { ReviewInterface } from "@/components/review-interface"
import { redirect } from "next/navigation"
import { Session } from "next-auth"

export default async function ReviewPage() {
  const session = await getServerSession(authOptions) as Session & {
    user: {
      id: string;
      email?: string;
      name?: string;
      image?: string;
    }
  }

  if (!session) {
    redirect("/")
  }

  const userId = session.user.id

  return (
    <div className="container mx-auto py-6">
      <ReviewInterface userId={userId} />
    </div>
  )
}
