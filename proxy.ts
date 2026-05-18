import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const PROFILE_GATE_API_PATH = "/api/user/profile-gate";

function getHomePath() {
  return "/dashboard";
}

export default async function proxy(req: NextRequest) {
  const response = NextResponse.next({ request: req });
  const pathname = req.nextUrl.pathname;

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Clear all Supabase auth cookies before redirecting so stale JWTs
    // (e.g., after a secret rotation) cannot cause an infinite redirect loop.
    const authCookies = req.cookies.getAll().filter((c) => c.name.startsWith("sb-"));
    const redirect = NextResponse.redirect(new URL("/auth", req.url));
    for (const c of authCookies) {
      redirect.cookies.delete(c.name);
    }
    return redirect;
  }

  try {
    const profileResponse = await fetch(new URL(PROFILE_GATE_API_PATH, req.url), {
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    if (profileResponse.ok) {
      const payload = (await profileResponse.json()) as {
        role?: "STUDENT" | "TEACHER" | "ADMIN";
        hasCompletedProfile?: boolean;
      };
      const resolvedRole = payload.role ?? "STUDENT";
      const hasCompletedProfile = Boolean(payload.hasCompletedProfile);

      if (!hasCompletedProfile && pathname !== "/welcome") {
        return NextResponse.redirect(new URL("/welcome", req.url));
      }

      if (hasCompletedProfile && pathname === "/welcome") {
        return NextResponse.redirect(new URL(getHomePath(), req.url));
      }

      if (pathname.startsWith("/admin") && resolvedRole !== "ADMIN") {
        return NextResponse.redirect(new URL(getHomePath(), req.url));
      }
    }
  } catch (error) {
    console.error("Profile gate proxy fetch failed", error);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/welcome",
  ],
};