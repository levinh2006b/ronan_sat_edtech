"use client";

import { useEffect, useState } from "react";

import { useSession } from "@/lib/auth/client";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import Loading from "@/components/Loading";
import { TestManagerInboxColumn } from "@/components/test-manager/TestManagerInboxColumn";
import { TestManagerPageHeader } from "@/components/test-manager/TestManagerPageHeader";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import type { TestManagerCard } from "@/lib/testManagerReports";

function TestManagerScreen() {
  const [cards, setCards] = useState<TestManagerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvingQuestionId, setResolvingQuestionId] = useState<string | null>(
    null,
  );
  const [deletingQuestionId, setDeletingQuestionId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get<{ cards: TestManagerCard[] }>(
          API_PATHS.TEST_MANAGER_REPORTS,
        );
        if (!cancelled) {
          setCards(response.data.cards ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            typeof loadError === "object" &&
            loadError !== null &&
            "response" in loadError &&
            typeof (loadError as { response?: { data?: { error?: string } } })
              .response?.data?.error === "string"
              ? ((loadError as { response?: { data?: { error?: string } } })
                  .response?.data?.error ?? "")
              : "Could not load reported questions.";

          setError(message || "Could not load reported questions.");
          setCards([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleResolve = async (questionId: string) => {
    setResolvingQuestionId(questionId);
    setError("");

    try {
      const response = await api.patch<{ isResolved: boolean }>(
        API_PATHS.getTestManagerReport(questionId),
      );
      setCards((currentCards) =>
        currentCards.map((card) =>
          card.questionId === questionId
            ? {
                ...card,
                isResolved: response.data.isResolved,
                reports: card.reports.map((report) => ({
                  ...report,
                  resolvedAt: response.data.isResolved
                    ? (report.resolvedAt ?? new Date().toISOString())
                    : undefined,
                })),
              }
            : card,
        ),
      );
    } catch (actionError) {
      const message =
        typeof actionError === "object" &&
        actionError !== null &&
        "response" in actionError &&
        typeof (actionError as { response?: { data?: { error?: string } } })
          .response?.data?.error === "string"
          ? ((actionError as { response?: { data?: { error?: string } } })
              .response?.data?.error ?? "")
          : "Could not update the reported question.";

      setError(message || "Could not update the reported question.");
    } finally {
      setResolvingQuestionId(null);
    }
  };

  const handleDelete = async (questionId: string) => {
    setDeletingQuestionId(questionId);
    setError("");

    try {
      await api.delete(API_PATHS.getTestManagerReport(questionId));
      setCards((currentCards) =>
        currentCards.filter((card) => card.questionId !== questionId),
      );
    } catch (actionError) {
      const message =
        typeof actionError === "object" &&
        actionError !== null &&
        "response" in actionError &&
        typeof (actionError as { response?: { data?: { error?: string } } })
          .response?.data?.error === "string"
          ? ((actionError as { response?: { data?: { error?: string } } })
              .response?.data?.error ?? "")
          : "Could not delete the reported question.";

      setError(message || "Could not delete the reported question.");
    } finally {
      setDeletingQuestionId(null);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-paper-bg px-4 py-4 sm:px-5 lg:px-6">
      <InitialTabBootReady when={!loading} />
      <div className="mx-auto max-w-[1400px]">
        <TestManagerPageHeader />

        {error ? (
          <section className="workbook-panel mb-4 border-2 border-ink-fg bg-accent-3 px-5 py-4 text-sm font-bold text-white">
            {error}
          </section>
        ) : null}

        <section className="workbook-panel p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-fg/70">
                Reported Questions
              </div>
            </div>
            <div className="workbook-sticker bg-accent-3 text-white">
              {cards.filter((card) => !card.isResolved).length} unresolved
              questions
            </div>
          </div>

          <div className="flex justify-center">
            <TestManagerInboxColumn
              loading={loading}
              cards={cards}
              resolvingQuestionId={resolvingQuestionId}
              deletingQuestionId={deletingQuestionId}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          </div>
        </section>
      </div>
    </main>
  );
}

export default function TestManagerPage() {
  const { data: session, status } = useSession();
  const canEditPublicExams =
    session?.user.permissions.includes("edit_public_exams");

  if (status === "loading") {
    return <Loading />;
  }

  if (!session || !canEditPublicExams) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper-bg">
        <InitialTabBootReady />
        <div className="workbook-panel bg-accent-3 p-8 font-bold text-white">
          Unauthorized. Edit Public Exams permission required.
        </div>
      </div>
    );
  }

  return <TestManagerScreen />;
}
