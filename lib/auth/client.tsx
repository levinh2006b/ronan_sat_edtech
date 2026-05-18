"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { beginClientAuthSync, endClientAuthSync } from "@/lib/clientAuthSync";
import { type AppSession } from "@/lib/auth/session";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

type SessionContextValue = {
  data: AppSession | null;
  status: SessionStatus;
  update: (updates?: Partial<AppSession["user"]>) => Promise<AppSession | null>;
};

type SignInOptions = {
  email?: string;
  password?: string;
  redirect?: boolean;
  callbackUrl?: string;
};

type SignInResult = {
  error?: string;
  ok?: boolean;
  url?: string | null;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

async function wait(ms: number) {
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getRedirectUrl(callbackUrl?: string) {
  if (!callbackUrl) {
    return `${window.location.origin}/auth/redirect`;
  }

  if (callbackUrl.startsWith("http://") || callbackUrl.startsWith("https://")) {
    return callbackUrl;
  }

  return `${window.location.origin}${callbackUrl}`;
}

async function fetchBrowserSession(user: User | null) {
  if (!user) {
    return null;
  }

  let response: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch("/api/user/profile-gate", {
      cache: "no-store",
      credentials: "same-origin",
    });

    if (response.status !== 401) {
      break;
    }

    if (attempt < 2) {
      await wait(150 * (attempt + 1));
    }
  }

  if (!response || response.status === 401) {
    return null;
  }

  if (!response.ok) {
    return {
        user: {
          id: user.id,
          email: user.email ?? null,
          name: typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? null,
          role: "STUDENT" as const,
          permissions: [],
          hasCompletedProfile: false,
        },
    } satisfies AppSession;
  }

  const payload = (await response.json()) as {
    role?: AppSession["user"]["role"];
    permissions?: string[];
    username?: string;
    birthDate?: string;
    displayName?: string;
    hasCompletedProfile?: boolean;
  };

  return {
    user: {
      id: user.id,
        email: user.email ?? null,
        name: payload.displayName ?? (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : user.email ?? null),
        role: payload.role ?? "STUDENT",
        permissions: payload.permissions ?? [],
        username: payload.username,
        birthDate: payload.birthDate,
        hasCompletedProfile: Boolean(payload.hasCompletedProfile),
    },
  } satisfies AppSession;
}

async function handleInvalidToken(supabase: ReturnType<typeof createSupabaseBrowserClient>) {
  try {
    await supabase.auth.signOut();
  } catch (signOutError) {
    console.warn("signOut during invalid-token cleanup failed:", signOutError);
    if (typeof window !== "undefined") {
      // Safely delete Supabase-specific localStorage keys to preserve user's custom settings/app state
      try {
        const keysToRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith("sb-") || key.includes("supabase"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => window.localStorage.removeItem(key));
      } catch (storageError) {
        console.error("Failed to selectively clear localStorage:", storageError);
      }
    }
  }
}

function hasSupabaseCookies() {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((item) => item.trim().startsWith("sb-"));
}

export function SessionProvider({ children, session }: { children: React.ReactNode; session: AppSession | null }) {
  const [data, setData] = useState<AppSession | null>(session);
  const [status, setStatus] = useState<SessionStatus>(session ? "authenticated" : "loading");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const bootstrap = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError && hasSupabaseCookies()) {
          // Stale JWT detected. Clear session and cookies so the user is logged out gracefully.
          console.warn("Stale auth token invalid, clearing session:", authError.message);
          await handleInvalidToken(supabase);
          setData(null);
          setStatus("unauthenticated");
          return;
        }

        const nextSession = await fetchBrowserSession(authData?.user ?? null);
        setData(nextSession);
        setStatus(nextSession ? "authenticated" : "unauthenticated");
      } finally {
        endClientAuthSync();
      }
    };

    void bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, sessionState) => {
      beginClientAuthSync();
      void fetchBrowserSession(sessionState?.user ?? null)
        .then((nextSession) => {
          setData(nextSession);
          setStatus(nextSession ? "authenticated" : "unauthenticated");
        })
        .finally(() => {
          endClientAuthSync();
        });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      data,
      status,
      update: async (updates) => {
        if (!data?.user.id) {
          return null;
        }

        const nextSession = {
          user: {
            ...data.user,
            ...updates,
          },
        } satisfies AppSession;

        setData(nextSession);
        setStatus("authenticated");
        return nextSession;
      },
    }),
    [data, status]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSession must be used inside SessionProvider.");
  }

  return context;
}

export async function getSession() {
  const supabase = createSupabaseBrowserClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError && hasSupabaseCookies()) {
    console.warn("getSession: invalid token, clearing session:", authError.message);
    await handleInvalidToken(supabase);
    return null;
  }

  return fetchBrowserSession(authData?.user ?? null);
}

export async function signIn(provider: string, options: SignInOptions = {}): Promise<SignInResult | undefined> {
  const supabase = createSupabaseBrowserClient();

  if (provider === "credentials") {
    const { error } = await supabase.auth.signInWithPassword({
      email: options.email ?? "",
      password: options.password ?? "",
    });

    return {
      error: error?.message,
      ok: !error,
      url: error ? null : options.callbackUrl ?? null,
    };
  }

  if (provider === "google") {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(options.callbackUrl),
      },
    });

    return {
      error: error?.message,
      ok: !error,
      url: data?.url ?? null,
    };
  }

  return {
    error: `Unsupported provider: ${provider}`,
    ok: false,
    url: null,
  };
}

export async function signOut(options?: { callbackUrl?: string }) {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();

  if (options?.callbackUrl) {
    window.location.assign(options.callbackUrl);
  }
}