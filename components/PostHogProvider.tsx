"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/auth/client";
import posthog from "posthog-js";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
const posthogUiHost = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim();

type PostHogProviderProps = {
  children: React.ReactNode;
};

export default function PostHogProvider({ children }: PostHogProviderProps) {
  const { data: session, status } = useSession();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!posthogKey || hasInitializedRef.current) {
      return;
    }

    posthog.init(posthogKey, {
      api_host: posthogHost,
      ...(posthogUiHost ? { ui_host: posthogUiHost } : {}),
      capture_pageview: "history_change",
      defaults: "2026-01-30",
      person_profiles: "identified_only",
    });

    hasInitializedRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) {
      return;
    }

    if (status === "loading") {
      return;
    }

    if (status !== "authenticated" || !session?.user?.id) {
      posthog.reset();
      return;
    }

    posthog.identify(session.user.id, {
      email: session.user.email ?? undefined,
      name: session.user.name ?? undefined,
      role: session.user.role,
      username: session.user.username ?? undefined,
      hasCompletedProfile: Boolean(session.user.hasCompletedProfile),
    });
  }, [session, status]);

  return children;
}
