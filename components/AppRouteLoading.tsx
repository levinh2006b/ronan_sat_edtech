"use client";

import { useLayoutEffect, useState } from "react";

import PrettyLoading from "@/components/PrettyLoading";
import {
  INITIAL_TAB_BOOT_CHANGE_EVENT,
  hasSeenInitialTabLoad,
  isInitialTabBootPending,
} from "@/lib/initialTabLoad";

export default function AppRouteLoading() {
  const [shouldShowPrettyLoader, setShouldShowPrettyLoader] = useState(true);
  const [shouldRender, setShouldRender] = useState(true);

  useLayoutEffect(() => {
    const syncBootState = () => {
      const shouldShowBootOverlay = !hasSeenInitialTabLoad() || isInitialTabBootPending();
      setShouldShowPrettyLoader(shouldShowBootOverlay);
      setShouldRender(shouldShowBootOverlay);
    };

    syncBootState();
    window.addEventListener(INITIAL_TAB_BOOT_CHANGE_EVENT, syncBootState);

    return () => {
      window.removeEventListener(INITIAL_TAB_BOOT_CHANGE_EVENT, syncBootState);
    };
  }, []);

  if (!shouldRender) {
    return null;
  }

  if (shouldShowPrettyLoader) {
    return <PrettyLoading />;
  }

  return null;
}
