"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/components/Navbar";

type AppShellProps = {
  children: ReactNode;
};

const SHELL_HIDDEN_PREFIXES = ["/auth", "/test/"];
const SHELL_HIDDEN_ROUTES = new Set(["/"]);

function shouldHideShell(pathname: string) {
  if (SHELL_HIDDEN_ROUTES.has(pathname)) {
    return true;
  }

  return SHELL_HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const hideShell = shouldHideShell(pathname);

  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-paper-bg text-ink-fg">
      <Navbar />
      <div className="min-h-screen pb-28 lg:pl-72 lg:pb-0">
        {children}
      </div>
    </div>
  );
}
