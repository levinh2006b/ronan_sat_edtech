import type { Role } from "@/lib/permissions";
import {
  preloadDashboardRouteData,
  preloadFullLengthRouteData,
  preloadReviewRouteData,
  preloadSectionalRouteData,
} from "@/lib/startupPreload";

type RoutePrefetchOptions = {
  signal?: AbortSignal;
};

const BLOCKED_DATA_PREFETCH_PREFIXES = ["/test/"];

function getUrl(href: string) {
  if (typeof window === "undefined") {
    return new URL(href, "http://localhost");
  }

  return new URL(href, window.location.origin);
}

export function canPrefetchRouteData(href: string, role?: Role) {
  if (role !== "STUDENT" && role !== "ADMIN") {
    return false;
  }

  const url = getUrl(href);
  const pathname = url.pathname;

  if (BLOCKED_DATA_PREFETCH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) {
    return false;
  }

  if (pathname === "/review" && url.searchParams.get("view") === "error-log") {
    return false;
  }

  return pathname === "/dashboard" || pathname === "/full-length" || pathname === "/sectional" || pathname === "/review";
}

export function canPrefetchRouteShell(href: string) {
  const pathname = getUrl(href).pathname;
  return !BLOCKED_DATA_PREFETCH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

export async function prefetchRouteData(href: string, role?: Role, options?: RoutePrefetchOptions) {
  if (!canPrefetchRouteData(href, role) || options?.signal?.aborted) {
    return;
  }

  const url = getUrl(href);

  if (url.pathname === "/dashboard") {
    await preloadDashboardRouteData(options);
    return;
  }

  if (url.pathname === "/full-length") {
    await preloadFullLengthRouteData(options);
    return;
  }

  if (url.pathname === "/sectional") {
    await preloadSectionalRouteData(options);
    return;
  }

  if (url.pathname === "/review") {
    await preloadReviewRouteData(options);
  }
}
