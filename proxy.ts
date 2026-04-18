import { withAuth } from "next-auth/middleware";
import type { NextAuthMiddlewareOptions } from "next-auth/middleware";
import { NextResponse } from "next/server";

import type { Role } from "@/lib/permissions";

const PROFILE_GATE_API_PATH = "/api/user/profile-gate";

type ProfileGatePayload = {
  hasCompletedProfile?: boolean;
  role?: Role;
};

function getHomePath(role?: string) {
  if (role === "PARENT") {
    return "/parent/dashboard";
  }

  if (role === "ADMIN") {
    return "/admin";
  }

  return "/dashboard";
}

const authOptions: NextAuthMiddlewareOptions = {
  pages: {
    signIn: "/auth",
  },
  callbacks: {
    authorized: ({ token }) => {
      return !!token;
    },
  },
};

export default withAuth(
  async function proxy(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    let resolvedRole: Role | undefined = token?.role;
    let hasCompletedProfile = Boolean(token?.hasCompletedProfile);

    if (token) {
      try {
        const response = await fetch(new URL(PROFILE_GATE_API_PATH, req.url), {
          headers: {
            cookie: req.headers.get("cookie") ?? "",
          },
          cache: "no-store",
        });

        if (response.ok) {
          const payload = (await response.json()) as ProfileGatePayload;
          resolvedRole = payload.role ?? resolvedRole;
          hasCompletedProfile = Boolean(payload.hasCompletedProfile);

          if (
            !hasCompletedProfile &&
            resolvedRole !== "ADMIN" &&
            resolvedRole !== "PARENT" &&
            pathname !== "/welcome"
          ) {
            return NextResponse.redirect(new URL("/welcome", req.url));
          }

          if (hasCompletedProfile && pathname === "/welcome") {
            return NextResponse.redirect(new URL(getHomePath(resolvedRole), req.url));
          }
        }
      } catch (error) {
        console.error("Profile gate proxy fetch failed", error);
      }
    }

    if (pathname.startsWith("/admin") && resolvedRole !== "ADMIN") {
      return NextResponse.redirect(new URL(getHomePath(resolvedRole), req.url));
    }

    if (pathname.startsWith("/parent") && resolvedRole !== "PARENT" && resolvedRole !== "ADMIN") {
      return NextResponse.redirect(new URL(getHomePath(resolvedRole), req.url));
    }

    if (pathname === "/welcome" && hasCompletedProfile) {
      return NextResponse.redirect(new URL(getHomePath(resolvedRole), req.url));
    }

    return NextResponse.next();
  },
  authOptions
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/full-length/:path*",
    "/sectional/:path*",
    "/review/:path*",
    "/vocab/:path*",
    "/hall-of-fame/:path*",
    "/settings/:path*",
    "/fix/:path*",
    "/admin/:path*",
    "/parent/:path*",
    "/welcome",
  ],
};
