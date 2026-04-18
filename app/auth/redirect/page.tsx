import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { hasCompletedStudentProfile } from "@/lib/userProfile";

export default async function AuthRedirectPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select("role username birthDate").lean();

  if (!user) {
    redirect("/auth");
  }

  if (user.role === "PARENT") {
    redirect("/parent/dashboard");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  if (!hasCompletedStudentProfile(user)) {
    redirect("/welcome");
  }

  redirect("/dashboard");
}
