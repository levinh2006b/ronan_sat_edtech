import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";

export default async function AuthRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  if (session.user.role === "PARENT") {
    redirect("/parent/dashboard");
  }

  redirect("/full-length");
}
