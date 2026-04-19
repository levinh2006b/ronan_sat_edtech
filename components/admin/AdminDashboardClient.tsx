"use client";

import { useEffect, useState } from "react";

import InitialTabBootReady from "@/components/InitialTabBootReady";
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

export default function AdminDashboardClient() {
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

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-paper-bg p-8 pb-24">
      <InitialTabBootReady />
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

function AdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-paper-bg p-8 pb-24">
      <InitialTabBootReady />
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="workbook-panel-muted overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="h-8 w-32 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
            <div className="mt-4 h-12 w-full max-w-3xl rounded-md bg-surface-white/75 animate-pulse" />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, index) => (
            <section key={index} className="workbook-panel overflow-hidden">
              <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
                <div className="h-7 w-32 rounded-md bg-surface-white/75 animate-pulse" />
              </div>
              <div className="space-y-4 p-5">
                {Array.from({ length: 5 }).map((__, fieldIndex) => (
                  <div key={fieldIndex} className="h-11 rounded-2xl border-2 border-ink-fg bg-surface-white animate-pulse" />
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="workbook-panel overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-5 py-4">
            <div className="h-7 w-40 rounded-md bg-surface-white/75 animate-pulse" />
          </div>
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-11 rounded-2xl border-2 border-ink-fg bg-surface-white animate-pulse" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
