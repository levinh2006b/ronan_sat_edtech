"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MIN_VISIBLE_MS = 220;
const COMPLETE_FILL_MS = 90;
const INITIAL_PROGRESS = 3;
const IDLE_PROGRESS_TARGET = 96;

function getRouteKey(pathname: string, search: string) {
  return search ? `${pathname}?${search}` : pathname;
}

function getWindowRouteKey() {
  return getRouteKey(window.location.pathname, window.location.search.slice(1));
}

function isInternalNavigationTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return null;
  }

  const anchor = target.closest("a[href]");

  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }

  if (anchor.target && anchor.target !== "_self") {
    return null;
  }

  if (anchor.hasAttribute("download")) {
    return null;
  }

  return anchor;
}

export default function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const isNavigatingRef = useRef(false);
  const startedAtRef = useRef(0);
  const startFrameRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const lastCompletedUrlRef = useRef("");
  const lastStartedUrlRef = useRef("");

  useEffect(() => {
    lastCompletedUrlRef.current = getRouteKey(pathname, searchParams.toString());
  }, [pathname, searchParams]);

  useEffect(() => {
    const stopProgressTimer = () => {
      if (progressTimerRef.current !== null) {
        window.clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };

    const clearHideTimer = () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const scheduleStartProgress = (targetRoute?: string) => {
      if (startFrameRef.current !== null) {
        window.cancelAnimationFrame(startFrameRef.current);
      }

      startFrameRef.current = window.requestAnimationFrame(() => {
        startFrameRef.current = null;
        startProgress(targetRoute);
      });
    };

    const startProgress = (targetRoute?: string) => {
      const nextRoute = targetRoute ?? getWindowRouteKey();

      if (nextRoute === lastCompletedUrlRef.current || nextRoute === lastStartedUrlRef.current) {
        return;
      }

      stopProgressTimer();
      clearHideTimer();

      lastStartedUrlRef.current = nextRoute;
      isNavigatingRef.current = true;
      startedAtRef.current = window.performance.now();
      setIsVisible(true);
      setProgress(INITIAL_PROGRESS);

      progressTimerRef.current = window.setInterval(() => {
        setProgress((current) => {
          if (current < IDLE_PROGRESS_TARGET) {
            return Math.min(current + Math.max((IDLE_PROGRESS_TARGET - current) * 0.14, 0.08), IDLE_PROGRESS_TARGET);
          }

          return current;
        });
      }, 90);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = isInternalNavigationTarget(event.target);

      if (!anchor) {
        return;
      }

      const targetUrl = new URL(anchor.href, window.location.href);

      if (targetUrl.origin !== window.location.origin) {
        return;
      }

      startProgress(getRouteKey(targetUrl.pathname, targetUrl.searchParams.toString()));
    };

    const handlePopState = () => {
      startProgress(getWindowRouteKey());
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const wrapHistoryMethod =
      (method: typeof window.history.pushState) =>
      (...args: Parameters<typeof window.history.pushState>) => {
        const [, , url] = args;

        if (typeof url === "string") {
          const targetUrl = new URL(url, window.location.href);
          scheduleStartProgress(getRouteKey(targetUrl.pathname, targetUrl.searchParams.toString()));
        } else if (url instanceof URL) {
          scheduleStartProgress(getRouteKey(url.pathname, url.searchParams.toString()));
        }

        return method.apply(window.history, args);
      };

    window.history.pushState = wrapHistoryMethod(originalPushState);
    window.history.replaceState = wrapHistoryMethod(originalReplaceState);
    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      stopProgressTimer();
      clearHideTimer();
      if (startFrameRef.current !== null) {
        window.cancelAnimationFrame(startFrameRef.current);
        startFrameRef.current = null;
      }
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    if (!isNavigatingRef.current) {
      return;
    }

    const elapsed = window.performance.now() - startedAtRef.current;
    const hideDelay = Math.max(MIN_VISIBLE_MS - elapsed, COMPLETE_FILL_MS);

    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    setProgress(100);

    hideTimerRef.current = window.setTimeout(() => {
      isNavigatingRef.current = false;
      lastStartedUrlRef.current = "";
      setIsVisible(false);
      setProgress(0);
    }, hideDelay);
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none fixed inset-x-0 top-0 z-[120] h-1 overflow-hidden",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div
        className="h-full origin-left bg-ink-fg transition-[transform] duration-90 ease-out"
        style={{ transform: `scaleX(${progress / 100})` }}
      />
    </div>
  );
}
