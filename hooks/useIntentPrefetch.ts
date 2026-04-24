"use client";

import { useCallback, useEffect, useRef } from "react";

const DEFAULT_HOVER_INTENT_DELAY_MS = 175;
const completedIntentPrefetches = new Set<string>();

type IntentPrefetchOptions = {
  prefetchKey: string;
  prefetch: (signal: AbortSignal) => Promise<unknown> | void;
  disabled?: boolean;
  delayMs?: number;
};

export function useIntentPrefetch({
  prefetchKey,
  prefetch,
  disabled = false,
  delayMs = DEFAULT_HOVER_INTENT_DELAY_MS,
}: IntentPrefetchOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearIntent = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const startPrefetch = useCallback(
    (nextDelayMs: number) => {
      if (disabled || completedIntentPrefetches.has(prefetchKey)) {
        return;
      }

      clearIntent();
      abortRef.current = new AbortController();

      timeoutRef.current = setTimeout(() => {
        const controller = abortRef.current;
        timeoutRef.current = null;

        if (!controller || controller.signal.aborted || completedIntentPrefetches.has(prefetchKey)) {
          return;
        }

        completedIntentPrefetches.add(prefetchKey);
        void Promise.resolve(prefetch(controller.signal)).catch((error) => {
          if (!controller.signal.aborted) {
            console.error("Intent prefetch failed", error);
          }
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
    onTouchStart: () => startPrefetch(0),
  };
}
