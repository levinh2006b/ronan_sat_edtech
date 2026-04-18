"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import Loading from "@/components/Loading";
import { getPostAuthRedirectPath } from "@/lib/getPostAuthRedirectPath";

export default function HomeRedirectGate() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    router.replace(getPostAuthRedirectPath(session?.user));
  }, [router, session?.user, session?.user?.hasCompletedProfile, session?.user?.role, status]);

  return <Loading showQuote={false} />;
}
