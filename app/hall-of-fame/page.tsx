"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";

import StudentCard from "@/components/StudentCard";
import StudentCardSkeleton from "@/components/StudentCardSkeleton";
import { fetchHallOfFamePage, type HallOfFameStudent } from "@/lib/services/hallOfFameService";

export default function HallOfFame() {
  const [students, setStudents] = useState<HallOfFameStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);

      try {
        const page = await fetchHallOfFamePage(currentPage, 8);
        setStudents(page.students);
        setTotalPages(page.totalPages);
      } catch (error) {
        console.error("Failed to load hall of fame students", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchStudents();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  return (
    <div className="min-h-screen bg-paper-bg pb-12">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="workbook-panel-muted mb-6 overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5 text-ink-fg">
            <div className="flex items-center gap-3">
              <div className="workbook-sticker bg-accent-1 text-ink-fg">Hall of Fame</div>
              <Trophy className="h-5 w-5 text-accent-3" />
            </div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight md:text-5xl">
              Celebrate the score jumps worth pinning to the wall.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 md:text-base">
              A rotating gallery of Ronan SAT students whose work translated into standout SAT results.
            </p>
          </div>
        </section>

        {loading ? (
          <div className="space-y-10">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <StudentCardSkeleton key={index} />
              ))}
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="workbook-panel-muted py-24 text-center text-ink-fg">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-ink-fg/45" />
            <h2 className="font-display text-3xl font-black uppercase tracking-tight">No students pinned yet</h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6">
              Once student highlights are published, they will appear in this workbook gallery.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {students.map((student) => (
                <StudentCard
                  key={student._id}
                  name={student.name}
                  school={student.school}
                  score={student.score}
                  examDate={student.examDate}
                  imageUrl={student.imageUrl}
                />
              ))}
            </div>

            {totalPages > 1 ? (
              <div className="mx-auto mt-10 flex w-full max-w-md items-center justify-center gap-3 sm:max-w-none">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="workbook-button workbook-button-secondary h-14 w-14 shrink-0 px-0 disabled:opacity-50 sm:w-auto sm:min-w-32 sm:px-4"
                >
                  <ChevronLeft className="h-5 w-5 sm:hidden" />
                  <span className="hidden sm:inline-flex sm:items-center sm:gap-2">
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </span>
                </button>
                <div className="workbook-sticker h-14 min-w-0 flex-1 justify-center self-center bg-surface-white text-ink-fg sm:flex-none">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="workbook-button workbook-button-secondary h-14 w-14 shrink-0 px-0 disabled:opacity-50 sm:w-auto sm:min-w-32 sm:px-4"
                >
                  <ChevronRight className="h-5 w-5 sm:hidden" />
                  <span className="hidden sm:inline-flex sm:items-center sm:gap-2">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}
