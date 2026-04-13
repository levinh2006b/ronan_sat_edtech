"use client";

import { useEffect, useState } from "react";

import {
  DEFAULT_TESTING_ROOM_THEME,
  persistTestingRoomTheme,
  readStoredTestingRoomTheme,
  type TestingRoomTheme,
} from "@/lib/testingRoomTheme";

export function useTestingRoomTheme() {
  const [theme, setTheme] = useState<TestingRoomTheme>(DEFAULT_TESTING_ROOM_THEME);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setTheme(readStoredTestingRoomTheme());
      setHasHydrated(true);
    });

    const handleStorage = () => {
      setTheme(readStoredTestingRoomTheme());
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const updateTheme = (nextTheme: TestingRoomTheme) => {
    setTheme(nextTheme);
    persistTestingRoomTheme(nextTheme);
  };

  return { theme, setTheme: updateTheme, hasHydrated };
}
