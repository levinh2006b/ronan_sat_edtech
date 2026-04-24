"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "@/lib/auth/client";
import type { LucideIcon } from "lucide-react";
import {
  BarChart2,
  BookOpen,
  CircleAlert,
  FolderKanban,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  Wrench,
} from "lucide-react";

import BrandLogo from "@/components/BrandLogo";
import { clearClientSessionState } from "@/lib/clearClientSessionState";
import type { Role } from "@/lib/permissions";
import { canPrefetchRouteData, canPrefetchRouteShell, prefetchRouteData } from "@/lib/routeDataPrefetch";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";

type NavItemConfig = {
  href: string;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  tone: "primary" | "accent-1" | "accent-2" | "accent-3" | "surface";
  matches: string[];
  queryKey?: string;
  queryValue?: string;
};

const STUDENT_ITEMS: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    mobileLabel: "Home",
    icon: LayoutDashboard,
    tone: "primary",
    matches: ["/dashboard"],
  },
  {
    href: "/full-length",
    label: "Full-length",
    mobileLabel: "Tests",
    icon: BookOpen,
    tone: "primary",
    matches: ["/full-length"],
  },
  {
    href: "/sectional",
    label: "Sectional",
    mobileLabel: "Skills",
    icon: Target,
    tone: "accent-2",
    matches: ["/sectional"],
  },
  {
    href: "/review",
    label: "Results",
    mobileLabel: "Review",
    icon: BarChart2,
    tone: "primary",
    matches: ["/review"],
  },
  {
    href: "/review?view=error-log",
    label: "Error log",
    mobileLabel: "Errors",
    icon: CircleAlert,
    tone: "accent-3",
    matches: ["/review"],
    queryKey: "view",
    queryValue: "error-log",
  },
  {
    href: "/vocab",
    label: "Vocab",
    mobileLabel: "Vocab",
    icon: LibraryBig,
    tone: "accent-1",
    matches: ["/vocab"],
  },
  {
    href: "/hall-of-fame",
    label: "Hall of Fame",
    mobileLabel: "Hall",
    icon: Trophy,
    tone: "primary",
    matches: ["/hall-of-fame"],
  },
  {
    href: "/settings",
    label: "Settings",
    mobileLabel: "Settings",
    icon: Settings,
    tone: "surface",
    matches: ["/settings"],
  },
];

const ADMIN_ITEMS: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    mobileLabel: "Home",
    icon: LayoutDashboard,
    tone: "primary",
    matches: ["/dashboard"],
  },
  {
    href: "/full-length",
    label: "Full-length",
    mobileLabel: "Tests",
    icon: BookOpen,
    tone: "primary",
    matches: ["/full-length"],
  },
  {
    href: "/sectional",
    label: "Sectional",
    mobileLabel: "Skills",
    icon: Target,
    tone: "accent-2",
    matches: ["/sectional"],
  },
  {
    href: "/review",
    label: "Results",
    mobileLabel: "Review",
    icon: BarChart2,
    tone: "surface",
    matches: ["/review"],
  },
  {
    href: "/review?view=error-log",
    label: "Error log",
    mobileLabel: "Errors",
    icon: CircleAlert,
    tone: "accent-3",
    matches: ["/review"],
    queryKey: "view",
    queryValue: "error-log",
  },
  {
    href: "/vocab",
    label: "Vocab",
    mobileLabel: "Vocab",
    icon: LibraryBig,
    tone: "accent-1",
    matches: ["/vocab"],
  },
  {
    href: "/hall-of-fame",
    label: "Hall of Fame",
    mobileLabel: "Hall",
    icon: Trophy,
    tone: "surface",
    matches: ["/hall-of-fame"],
  },
  {
    href: "/settings",
    label: "Settings",
    mobileLabel: "Settings",
    icon: Settings,
    tone: "surface",
    matches: ["/settings"],
  },
  {
    href: "/groups",
    label: "Groups",
    mobileLabel: "Groups",
    icon: FolderKanban,
    tone: "accent-2",
    matches: ["/groups"],
  },
  {
    href: "/test-manager",
    label: "Test Manager",
    mobileLabel: "Manager",
    icon: Wrench,
    tone: "accent-3",
    matches: ["/test-manager"],
  },
  {
    href: "/admin",
    label: "Admin",
    mobileLabel: "Admin",
    icon: ShieldCheck,
    tone: "accent-3",
    matches: ["/admin"],
  },
];

const GROUPS_ITEM: NavItemConfig = {
  href: "/groups",
  label: "Groups",
  mobileLabel: "Groups",
  icon: FolderKanban,
  tone: "accent-2",
  matches: ["/groups"],
};

function buildStudentItems(canManageGroups: boolean) {
  if (!canManageGroups) {
    return STUDENT_ITEMS;
  }

  return [...STUDENT_ITEMS.slice(0, -1), GROUPS_ITEM, STUDENT_ITEMS[STUDENT_ITEMS.length - 1]];
}

export default function Navbar() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isReady = status !== "loading" && status !== "unauthenticated" && !!session;
  const isHiddenRoute = pathname.startsWith("/test/") || pathname.startsWith("/auth");
  const isAdmin = session?.user.role === "ADMIN";
  const canManageGroups =
    isAdmin ||
    Boolean(
      session?.user.permissions?.some(
        (permission) =>
          permission === "create_remove_groups" ||
          permission === "edit_groups" ||
          permission === "manage_students" ||
          permission === "group_stat_view",
      ),
    );
  const homeHref = "/dashboard";
  const navItems = isAdmin ? ADMIN_ITEMS : buildStudentItems(canManageGroups);
  const displayName = session?.user.name || session?.user.email?.split("@")[0] || "Scholar";

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const routesToPrefetch = Array.from(new Set([homeHref, ...navItems.map((item) => item.href)]));
    routesToPrefetch.forEach((href) => {
      if (canPrefetchRouteShell(href)) {
        router.prefetch(href);
      }
    });
  }, [homeHref, isReady, navItems, router]);

  const handleSignOut = async () => {
    clearClientSessionState();
    await signOut({ callbackUrl: "/auth" });
  };

  if (!isReady || isHiddenRoute) {
    return null;
  }

  return (
    <>
      <aside className="app-shell-navigation fixed inset-y-0 left-0 z-40 hidden w-64 border-r-4 border-ink-fg bg-surface-white lg:flex lg:flex-col">
        <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-5">
          <Link href={homeHref} className="group block rounded-2xl border-2 border-ink-fg bg-surface-white p-3.5 brutal-shadow-sm workbook-press">
            <BrandLogo
              priority
              size={48}
              className="items-center gap-2.5"
              iconClassName="rounded-full border-2 border-ink-fg bg-surface-white p-1"
              labelClassName="text-[1.15rem] font-extrabold tracking-[0.02em]"
            />
          </Link>
        </div>

        <div className="workbook-scrollbar bg-dot-pattern flex-1 overflow-y-auto px-3 py-4">
          <div className="space-y-2.5">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                item={item}
                pathname={pathname}
                role={session.user.role}
                searchParams={searchParams}
                compact={false}
              />
            ))}
          </div>
        </div>

        <div className="border-t-4 border-ink-fg bg-surface-white px-3 py-3">
          <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg p-3.5 brutal-shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-ink-fg">Current Seat</p>
            <p className="mt-2 font-display text-[1.05rem] font-extrabold leading-snug tracking-tight">{displayName}</p>
            <p className="mt-1 truncate text-[0.82rem] text-ink-fg">{session.user.email}</p>
          </div>
          <button
            onClick={() => void handleSignOut()}
            className="workbook-button mt-3 w-full justify-center bg-accent-3 text-white"
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <nav className="app-shell-navigation fixed inset-x-0 bottom-0 z-50 border-t-4 border-ink-fg bg-surface-white lg:hidden">
        <div className="bg-dot-pattern overflow-x-auto px-2 py-2 sm:px-3 sm:py-3">
          <div className="flex min-w-max gap-1.5 sm:gap-2">
            {navItems.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} role={session.user.role} searchParams={searchParams} compact />
            ))}
            <button
              onClick={() => void handleSignOut()}
              className="flex min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-ink-fg bg-surface-white px-2 py-2.5 text-center brutal-shadow-sm workbook-press sm:min-w-[5.75rem] sm:px-3 sm:py-3"
              type="button"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:text-[0.68rem] sm:tracking-[0.16em]">Exit</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}

function NavItem({
  item,
  pathname,
  role,
  searchParams,
  compact,
}: {
  item: NavItemConfig;
  pathname: string;
  role?: Role;
  searchParams: ReturnType<typeof useSearchParams>;
  compact: boolean;
}) {
  const matchesPath = item.matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const matchesQuery = item.queryKey ? searchParams.get(item.queryKey) === item.queryValue : true;
  const isErrorLogView = pathname === "/review" && searchParams.get("view") === "error-log";
  const active = item.queryKey ? matchesPath && matchesQuery : matchesPath && (!isErrorLogView || pathname !== "/review");
  const Icon = item.icon;
  const shouldPrefetchData = canPrefetchRouteData(item.href, role);
  const intentPrefetchHandlers = useIntentPrefetch({
    prefetchKey: `route-data:${item.href}`,
    disabled: !shouldPrefetchData,
    prefetch: (signal) => prefetchRouteData(item.href, role, { signal }),
  });

  return (
    <Link
      href={item.href}
      prefetch={canPrefetchRouteShell(item.href)}
      {...intentPrefetchHandlers}
      className={[
        active ? "border-4 border-ink-fg brutal-shadow-sm workbook-press" : "border-2 border-ink-fg brutal-shadow-sm workbook-press",
        compact
          ? "flex min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-center sm:min-w-[5.75rem] sm:px-3 sm:py-3"
          : "flex items-center gap-3 rounded-2xl px-3.5 py-2.5",
        active ? "bg-paper-bg text-ink-fg" : "bg-surface-white text-ink-fg",
      ].join(" ")}
    >
      <Icon className={compact ? "h-3.5 w-3.5 sm:h-4 sm:w-4" : "h-[1.15rem] w-[1.15rem]"} />
      <div className={compact ? "space-y-0.5" : "min-w-0"}>
        <p className={compact ? "text-[0.62rem] font-bold uppercase tracking-[0.14em] sm:text-[0.68rem] sm:tracking-[0.16em]" : "font-display text-[1.15rem] font-bold leading-none tracking-tight"}>
          {compact ? item.mobileLabel : item.label}
        </p>
      </div>
    </Link>
  );
}
