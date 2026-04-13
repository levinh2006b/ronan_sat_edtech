"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

import Loading from "@/components/Loading";
import CreateQuestionForm from "@/components/admin/CreateQuestionForm";
import CreateStudentForm from "@/components/admin/CreateStudentForm";
import CreateTestForm from "@/components/admin/CreateTestForm";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { TestListItem } from "@/types/testLibrary";

const ADMIN_TESTS_PAGE_SIZE = 100;

type TestsResponse = {
  tests?: TestListItem[];
  pagination?: {
    totalPages?: number;
  };
};

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const firstPage = await api.get<TestsResponse>(
        `${API_PATHS.TESTS}?page=1&limit=${ADMIN_TESTS_PAGE_SIZE}`
      );
      const totalPages = firstPage.data.pagination?.totalPages || 1;

      if (totalPages <= 1) {
        setTests(firstPage.data.tests || []);
        return;
      }

      const remainingPages = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, index) =>
          api.get<TestsResponse>(
            `${API_PATHS.TESTS}?page=${index + 2}&limit=${ADMIN_TESTS_PAGE_SIZE}`
          )
        )
      );

      setTests([
        ...(firstPage.data.tests || []),
        ...remainingPages.flatMap((page) => page.data.tests || []),
      ]);
    } catch (error) {
      console.error("Failed to fetch tests", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return <Loading />;
  }

  if (!session || session.user.role !== "ADMIN") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-bg">
        <div className="workbook-panel bg-accent-3 p-8 font-bold text-white">
          Unauthorized. Admin access required.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper-bg p-8 pb-24">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="workbook-panel-muted overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-accent-3 text-white">Admin Desk</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg">Manage tests, questions, and showcase students.</h1>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <CreateTestForm onSuccess={fetchTests} />
          <CreateQuestionForm tests={tests} />
        </div>

        <CreateStudentForm />
      </div>
    </div>
  );
}
