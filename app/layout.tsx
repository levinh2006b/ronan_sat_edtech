import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import AppShell from "@/components/AppShell";
import AuthProvider from "@/components/AuthProvider";
import { VocabBoardProvider } from "@/components/vocab/VocabBoardProvider";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  variable: "--font-workbook-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bodyFont = DM_Sans({
  variable: "--font-workbook-body",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const monoFont = Geist_Mono({
  variable: "--font-workbook-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ronan SAT - Master the SAT with Personalized, Data-Driven Practice",
  description:
    "Experience real test conditions, target your exact weaknesses, and achieve your dream score with our comprehensive SAT preparation platform. Full-length exams, sectional practice, and detailed explanations.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}>
        <AuthProvider>
          <VocabBoardProvider>
            <AppShell>{children}</AppShell>
          </VocabBoardProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
