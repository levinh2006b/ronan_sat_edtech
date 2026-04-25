"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_HOVER_INTENT_DELAY_MS = 175;
const completedIntentPrefetches = new Set<string>();
const runningIntentPrefetches = new Set<string>();

type IntentPrefetchOptions = {
  prefetchKey: string;
  prefetch: (signal: AbortSignal) => Promise<unknown> | void;
  disabled?: boolean;
  delayMs?: number;
  touchDelayMs?: number;
};

export function useIntentPrefetch({
  prefetchKey,
  prefetch,
  disabled = false,
  delayMs = DEFAULT_HOVER_INTENT_DELAY_MS,
  touchDelayMs = 0,
}: IntentPrefetchOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const hasStartedRef = useRef(false);

  const clearIntent = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!hasStartedRef.current) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, []);

  const startPrefetch = useCallback(
    (nextDelayMs: number) => {
      if (disabled || completedIntentPrefetches.has(prefetchKey) || runningIntentPrefetches.has(prefetchKey)) {
        return;
      }

      clearIntent();
      abortRef.current = new AbortController();
      hasStartedRef.current = false;

      timeoutRef.current = setTimeout(() => {
        const controller = abortRef.current;
        timeoutRef.current = null;

        if (
          !controller ||
          controller.signal.aborted ||
          completedIntentPrefetches.has(prefetchKey) ||
          runningIntentPrefetches.has(prefetchKey)
        ) {
          return;
        }

        hasStartedRef.current = true;
        runningIntentPrefetches.add(prefetchKey);
        void Promise.resolve(prefetch(controller.signal))
          .then(() => {
            completedIntentPrefetches.add(prefetchKey);
          })
          .catch((error) => {
            if (!controller.signal.aborted) {
              console.error("Intent prefetch failed", error);
            }
          })
          .finally(() => {
            runningIntentPrefetches.delete(prefetchKey);
            if (abortRef.current === controller) {
              abortRef.current = null;
            }
            hasStartedRef.current = false;
          });
      }, nextDelayMs);
    },
    [clearIntent, disabled, prefetch, prefetchKey],
  );

  useEffect(() => clearIntent, [clearIntent]);

  return {
    onMouseEnter: () => startPrefetch(delayMs),
    onMouseLeave: () => clearIntent(),
    onFocus: () => startPrefetch(delayMs),
    onBlur: () => clearIntent(),
    onTouchStart: () => startPrefetch(touchDelayMs),
  };
}
