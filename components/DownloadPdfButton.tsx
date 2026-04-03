"use client";

import { useState } from "react";

import { generatePDFTemplate } from "@/utils/questionTemplate";

interface DownloadPdfButtonProps {
  testId: string;
  testName?: string;
  sectionName?: string;
}

type PdfDataResponse = {
  testTitle: string;
  questions: Array<Record<string, unknown>>;
  sectionName?: string;
};

function buildFileName(testName: string, sectionName?: string) {
  const joined = [testName, sectionName, "PDF"]
    .filter(Boolean)
    .join("_")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");

  return `${joined || "practice_test"}.pdf`;
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
}: DownloadPdfButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    let iframe: HTMLIFrameElement | null = null;

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
          response.status === 401 ? "Bạn cần đăng nhập để tải PDF." : "Lỗi khi lấy dữ liệu PDF.";
        throw new Error(message);
      }

      const data = (await response.json()) as PdfDataResponse;
      const fileName = buildFileName(testName || data.testTitle, sectionName || data.sectionName);
      const htmlString = generatePDFTemplate({
        testTitle: data.testTitle,
        questions: data.questions,
        sectionName: data.sectionName,
        documentTitle: fileName.replace(/\.pdf$/i, ""),
      });

      iframe = createHiddenPrintFrame();
      const iframeWindow = iframe.contentWindow;

      if (!iframeWindow) {
        throw new Error("Không thể tạo vùng in ẩn.");
      }

      iframeWindow.document.open();
      iframeWindow.document.write(htmlString);
      iframeWindow.document.close();

      await waitForPrintableAssets(iframeWindow);

      const cleanup = () => {
        iframe?.remove();
        iframe = null;
      };

      iframeWindow.addEventListener("afterprint", cleanup, { once: true });
      window.setTimeout(cleanup, 60_000);

      iframeWindow.focus();
      iframeWindow.print();
    } catch (error) {
      console.error("Failed to prepare print PDF", error);
      iframe?.remove();
      window.alert(error instanceof Error ? error.message : "Đã xảy ra lỗi khi chuẩn bị PDF.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className={`text-xs font-medium transition-colors underline ${
        isDownloading
          ? "cursor-not-allowed text-gray-400"
          : "cursor-pointer text-black hover:text-blue-600 hover:no-underline"
      }`}
    >
      {isDownloading ? "Downloading..." : "Download PDF"}
    </button>
  );
}
