import { withAuth } from "next-auth/middleware";
import type { NextAuthMiddlewareOptions } from "next-auth/middleware";

const authOptions: NextAuthMiddlewareOptions = {
  callbacks: {
    authorized: ({ req, token }) => {
      const pathname = req.nextUrl.pathname;

      if (pathname.startsWith("/parent")) {
        return token?.role === "PARENT" || token?.role === "ADMIN";
      }

      if (pathname.startsWith("/admin")) {
        return token?.role === "ADMIN";
      }

      return !!token;
    },
  },
};

export default withAuth(
  function proxy() {
    return;
  },
  authOptions
);

export const config = {
  matcher: ["/parent/:path*", "/admin/:path*", "/settings/:path*"],
};
