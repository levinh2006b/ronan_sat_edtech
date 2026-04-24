"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth/client";

import { markInitialTabPreloadReady } from "@/lib/initialTabLoad";
import { preloadInitialAppData } from "@/lib/startupPreload";

const BLOCKED_PRELOAD_PREFIXES = ["/auth", "/test/", "/admin"];
const BLOCKED_PRELOAD_ROUTES = new Set(["/welcome"]);

function canPreloadForPath(pathname: string) {
  if (BLOCKED_PRELOAD_ROUTES.has(pathname)) {
    return false;
  }

  return !BLOCKED_PRELOAD_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function AppStartupPreloader() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!canPreloadForPath(pathname)) {
      markInitialTabPreloadReady();
      return;
    }

    if (status === "loading") {
      return;
    }

    if (status !== "authenticated" || !session?.user?.id || !session.user.hasCompletedProfile) {
      markInitialTabPreloadReady();
      return;
    }

    void preloadInitialAppData({
      role: session.user.role,
      userId: session.user.id,
    }).finally(() => {
      markInitialTabPreloadReady();
    });
  }, [pathname, session?.user?.hasCompletedProfile, session?.user?.id, session?.user?.role, status]);

  return null;
}
