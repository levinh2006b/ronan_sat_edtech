"use client";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import Loading from "@/components/Loading";
import { ManageTestsPageContent } from "@/components/test-manager/ManageTestsPageContent";
import { useSession } from "@/lib/auth/client";

export default function ManageTestsPage() {
  const { data: session, status } = useSession();
  const canEditPublicExams = session?.user.permissions.includes("edit_public_exams");

  if (status === "loading") {
    return <Loading />;
  }

  if (!session || !canEditPublicExams) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-bg">
        <InitialTabBootReady />
        <div className="workbook-panel bg-accent-3 p-8 font-bold text-white">Unauthorized. Edit Public Exams permission required.</div>
      </div>
    );
  }

  return <ManageTestsPageContent />;
}
