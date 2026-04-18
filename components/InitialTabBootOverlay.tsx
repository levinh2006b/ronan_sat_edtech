"use client";

import { useLayoutEffect, useState } from "react";

import PrettyLoading from "@/components/PrettyLoading";
import { INITIAL_TAB_BOOT_CHANGE_EVENT, isInitialTabBootPending } from "@/lib/initialTabLoad";

export default function InitialTabBootOverlay() {
  const [isBootPending, setIsBootPending] = useState(false);

  useLayoutEffect(() => {
    const syncBootPending = () => {
      setIsBootPending(isInitialTabBootPending());
    };

    syncBootPending();
    window.addEventListener(INITIAL_TAB_BOOT_CHANGE_EVENT, syncBootPending);

    return () => {
      window.removeEventListener(INITIAL_TAB_BOOT_CHANGE_EVENT, syncBootPending);
    };
  }, []);

  if (!isBootPending) {
    return null;
  }

  return <PrettyLoading />;
}
