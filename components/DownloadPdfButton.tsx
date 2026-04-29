"use client";

import { useState } from "react";

import { TestTokenDialog } from "@/components/test-access/TestTokenDialog";
import { useTestAccess } from "@/components/test-access/useTestAccess";
import { API_PATHS } from "@/lib/apiPaths";
import { getStoredTestAccessToken } from "@/lib/testAccessStorage";

interface DownloadPdfButtonProps {
  testId: string;
  testName?: string;
  sectionName?: string;
  className?: string;
  requiresToken?: boolean;
}

function buildFallbackFileName(testName: string, sectionName?: string) {
  const suffix = sectionName ? `-${sectionName}` : "";
  const baseName = `ronan-sat-${testName}${suffix}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${baseName || "ronan-sat-practice"}.pdf`;
}

function getFileNameFromContentDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = value.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? null;
}

function triggerBlobDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function DownloadPdfButton({
  testId,
  testName = "Practice Test",
  sectionName,
  className,
  requiresToken = false,
}: DownloadPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const access = useTestAccess({ testId, requiresToken });

  const downloadPdf = async () => {
    const params = new URLSearchParams({ testId });
    if (sectionName) {
      params.set("section", sectionName);
    }

    const headers = new Headers();
    const token = getStoredTestAccessToken(testId);
    if (token) {
      headers.set("x-test-access-token", token);
    }

    const response = await fetch(`${API_PATHS.TEST_PDF_DOWNLOAD}?${params.toString()}`, {
      credentials: "include",
      headers,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error || "Unable to download the PDF.");
    }

    const blob = await response.blob();
    const fileName =
      getFileNameFromContentDisposition(response.headers.get("content-disposition")) ||
      buildFallbackFileName(testName, sectionName);
    triggerBlobDownload(blob, fileName);
  };

  const handleDownload = async () => {
    if (requiresToken && (!access.isUnlocked || !getStoredTestAccessToken(testId))) {
      access.openDialog();
      return;
    }

    try {
      setIsDownloading(true);
      await downloadPdf();
    } catch (error) {
      console.error("Failed to download PDF", error);
      window.alert(error instanceof Error ? error.message : "An error occurred while downloading the PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className={`${className ?? "text-xs font-medium underline"} ${isDownloading ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {isDownloading ? "Downloading..." : "Download PDF"}
      </button>

      <TestTokenDialog
        error={access.error}
        isSubmitting={access.isSubmitting}
        onClose={access.closeDialog}
        onSubmit={async (token) => {
          const unlocked = await access.verifyToken(token);
          if (unlocked) {
            window.setTimeout(() => {
              void handleDownload();
            }, 0);
          }
          return unlocked;
        }}
        open={access.isDialogOpen}
        testTitle={testName}
      />
    </>
  );
}
