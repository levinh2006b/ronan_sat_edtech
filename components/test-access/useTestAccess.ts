"use client";

import { useEffect, useState } from "react";

import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { hasStoredTestAccess, storeTestAccess } from "@/lib/testAccessStorage";

type UseTestAccessOptions = {
  testId: string;
  requiresToken: boolean;
};

export function useTestAccess({ testId, requiresToken }: UseTestAccessOptions) {
  const [storedAccess, setStoredAccess] = useState({
    testId,
    requiresToken,
    isUnlocked: !requiresToken,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isUnlocked =
    !requiresToken ||
    (storedAccess.testId === testId && storedAccess.requiresToken === requiresToken && storedAccess.isUnlocked);

  useEffect(() => {
    setError("");

    if (!requiresToken) {
      setStoredAccess({ testId, requiresToken, isUnlocked: true });
      setIsDialogOpen(false);
      return;
    }

    setStoredAccess({ testId, requiresToken, isUnlocked: hasStoredTestAccess(testId) });
  }, [requiresToken, testId]);

  const openDialog = () => {
    setError("");
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSubmitting) {
      return;
    }

    setIsDialogOpen(false);
  };

  const verifyToken = async (token: string) => {
    const normalizedToken = token.trim();

    if (!normalizedToken) {
      setError("Enter the token for this test.");
      return false;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await api.post(API_PATHS.TEST_ACCESS, {
        testId,
        token: normalizedToken,
      });

      if (!response.data?.unlocked) {
        setError("That token does not match this test.");
        return false;
      }

      storeTestAccess(testId, normalizedToken);
      setStoredAccess({ testId, requiresToken, isUnlocked: true });
      setIsDialogOpen(false);
      return true;
    } catch (requestError: unknown) {
      const message =
        requestError &&
        typeof requestError === "object" &&
        "response" in requestError &&
        requestError.response &&
        typeof requestError.response === "object" &&
        "data" in requestError.response &&
        requestError.response.data &&
        typeof requestError.response.data === "object" &&
        "error" in requestError.response.data
          ? String(requestError.response.data.error)
          : "Failed to verify this token.";

      setError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isUnlocked,
    isDialogOpen,
    isSubmitting,
    error,
    openDialog,
    closeDialog,
    verifyToken,
  };
}
