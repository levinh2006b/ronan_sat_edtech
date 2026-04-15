"use client";

import { useState } from "react";
import QRCode from "qrcode";

import { buildTestEntryHref } from "@/lib/testEntryLinks";
import { generatePDFTemplate } from "@/utils/questionTemplate";

interface DownloadPdfButtonProps {
  testId: string;
  testName?: string;
  sectionName?: string;
  className?: string;
}

type PdfDataResponse = {
  testId: string;
  testTitle: string;
  questions: Array<Record<string, unknown>>;
  sectionName?: string;
};

function buildDocumentTitle(testName: string, sectionName?: string) {
  const suffix = sectionName ? ` - ${sectionName}` : "";
  return `RONAN SAT - ${testName}${suffix}`;
}

async function waitForPrintableAssets(iframeWindow: Window) {
  const documentRef = iframeWindow.document;
  const images = Array.from(documentRef.images);

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );

  if ("fonts" in documentRef) {
    await documentRef.fonts.ready;
  }
}

function createHiddenPrintFrame() {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);
  return iframe;
}

export default function DownloadPdfButton({
  testId,
  testName = "Practice Test",
  sectionName,
  className,
}: DownloadPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    let iframe: HTMLIFrameElement | null = null;
    let originalDocumentTitle: string | null = null;

    try {
      setIsDownloading(true);

      const params = new URLSearchParams({ testId });
      if (sectionName) {
        params.set("section", sectionName);
      }

      const response = await fetch(`/api/pdf-data?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        const message =
          response.status === 401 ? "You need to sign in before downloading the PDF." : "Unable to load the PDF data.";
        throw new Error(message);
      }

      const data = (await response.json()) as PdfDataResponse;
      const documentTitle = buildDocumentTitle(testName || data.testTitle, sectionName || data.sectionName);
      const mode = sectionName ? "sectional" : "full";
      const testingRoomUrl = new URL(
        buildTestEntryHref(data.testId, {
          mode,
          sectionName: data.sectionName,
        }),
        window.location.origin,
      ).toString();
      const testingRoomQrSvg = (await QRCode.toString(testingRoomUrl, {
        type: "svg",
        errorCorrectionLevel: "H",
        margin: 1,
        width: 224,
        color: {
          dark: "#111111",
          light: "#ffffff",
        },
      })).replace(/^<\?xml[^>]*>\s*/, "");
      const htmlString = await generatePDFTemplate({
        testId: data.testId,
        testTitle: data.testTitle,
        questions: data.questions,
        sectionName: data.sectionName,
        documentTitle,
        assetBaseUrl: window.location.origin,
        testingRoomUrl,
        testingRoomQrSvg,
      });

      iframe = createHiddenPrintFrame();
      const iframeWindow = iframe.contentWindow;

      if (!iframeWindow) {
        throw new Error("Unable to create the hidden print frame.");
      }

      iframeWindow.document.open();
      iframeWindow.document.write(htmlString);
      iframeWindow.document.close();

      await waitForPrintableAssets(iframeWindow);

      const cleanup = () => {
        if (originalDocumentTitle !== null) {
          document.title = originalDocumentTitle;
          originalDocumentTitle = null;
        }
        iframe?.remove();
        iframe = null;
      };

      iframeWindow.addEventListener("afterprint", cleanup, { once: true });
      window.setTimeout(cleanup, 60_000);

      originalDocumentTitle = document.title;
      document.title = documentTitle;
      iframeWindow.focus();
      iframeWindow.print();
    } catch (error) {
      console.error("Failed to prepare print PDF", error);
      if (originalDocumentTitle !== null) {
        document.title = originalDocumentTitle;
      }
      iframe?.remove();
      window.alert(error instanceof Error ? error.message : "An error occurred while preparing the PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className={`${className ?? "text-xs font-medium underline"} ${isDownloading ? "cursor-not-allowed opacity-60" : ""}`}
    >
      {isDownloading ? "Downloading..." : "Download PDF"}
    </button>
  );
}
