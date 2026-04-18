"use client";

import { useLayoutEffect, useState } from "react";

import PrettyLoading from "@/components/PrettyLoading";
import SimpleLoading from "@/components/SimpleLoading";
import { hasSeenInitialTabLoad, isInitialTabBootPending } from "@/lib/initialTabLoad";

export default function AppRouteLoading() {
  const [shouldShowPrettyLoader, setShouldShowPrettyLoader] = useState(true);

  useLayoutEffect(() => {
    setShouldShowPrettyLoader(!hasSeenInitialTabLoad() || isInitialTabBootPending());
  }, []);

  if (shouldShowPrettyLoader) {
    return <PrettyLoading />;
  }

  return <SimpleLoading showQuote={false} />;
}
