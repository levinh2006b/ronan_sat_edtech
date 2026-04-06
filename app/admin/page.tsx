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

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await api.get(API_PATHS.TESTS);
      setTests((res.data.tests || []) as TestListItem[]);
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-lg border border-slate-200 bg-white p-8 font-bold text-red-600">
          Unauthorized. Admin access required.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 pb-24">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <CreateTestForm onSuccess={fetchTests} />
          <CreateQuestionForm tests={tests} />
        </div>

        <CreateStudentForm />
      </div>
    </div>
  );
}
