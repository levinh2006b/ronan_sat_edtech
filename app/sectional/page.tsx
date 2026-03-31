"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import TestCard from "@/components/TestCard";
import Loading from "@/components/Loading";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import { BookOpen } from "lucide-react";
import  TestCardSkeleton  from "@/components/TestCardSkeleton"

export default function SectionalTestsPage() {
  const { data: session, status } = useSession();
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State mới: Lưu trữ danh sách điểm để truyền vào TestCard
  const [userResults, setUserResults] = useState<any[]>([]); 

  // Các state tương tự trang chủ
  const [sortOption, setSortOption] = useState("newest");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPeriod, setSelectedPeriod] = useState("All");
  
  // State đặc biệt cho trang Sectional: Lọc theo môn học
  const [subjectFilter, setSubjectFilter] = useState("reading"); // "reading" hoặc "math"
  const limit = 6;

  // THÊM MỚI: Reset lại trang và bộ lọc ngày mỗi khi đổi môn học
  useEffect(() => {
    setSelectedPeriod("All");
    setPage(1);
  }, [subjectFilter]);

  const testsWithSubject = tests.filter((t: any) => {
  if (!t.sections || !Array.isArray(t.sections)) return false;

  const targetSectionName = subjectFilter === "reading" ? "Reading and Writing" : "Math";
  const section = t.sections.find((s: any) => s.name === targetSectionName);
  if (!section) return false;

  // Dùng questionCounts ở root — đây là nguồn data thực tế
  // Chỉ cần 1 trong 2 module có câu hỏi là hiện
  if (t.questionCounts) {
    if (subjectFilter === "reading") {
      return (t.questionCounts.rw_1 > 0) || (t.questionCounts.rw_2 > 0);
    } else {
      return (t.questionCounts.math_1 > 0) || (t.questionCounts.math_2 > 0);
    }
  }

  // Fallback nếu questionCounts chưa có (bài test cũ): dùng section.questionsCount
  return (section.questionsCount ?? 0) > 0;
});


  // BƯỚC 2: Tạo sidebar "Filter by Date" chỉ từ những bài test hợp lệ đã lọc ở BƯỚC 1
  const uniquePeriods = ["All", ...Array.from(new Set(testsWithSubject.map((t: any) => {
      const parts = t.title.split(' ');
      if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
      return "Other";
  })))];

  // BƯỚC 3: Lọc danh sách bài test cuối cùng để render ra UI
  const filteredTests = testsWithSubject.filter((t: any) => {
    if (selectedPeriod === "All") return true;
    if (selectedPeriod === "Other") return t.title.split(' ').length < 2;
    return t.title.startsWith(selectedPeriod);
  });

  // Gọi API lấy lịch sử kết quả bài làm của user (giống trang chủ)
  useEffect(() => {
    if (session) {
      const fetchUserResults = async () => {
        try {
          const statsRes = await api.get(`${API_PATHS.RESULTS}?days=365`); // Lấy rộng ra để quét được các module cũ
          if (statsRes.data.results) {
            setUserResults(statsRes.data.results);
          }
        } catch (e) {
          console.error("Failed to load results", e);
        }
      };
      fetchUserResults();
    }
  }, [session]);

  // Gọi API lấy danh sách bài Test (giống trang chủ)
  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      try {
        let sortBy = "createdAt";
        let sortOrder = "desc";

        if (sortOption === "oldest") { sortOrder = "asc"; } 
        else if (sortOption === "title_asc") { sortBy = "title"; sortOrder = "asc"; } 
        else if (sortOption === "title_desc") { sortBy = "title"; sortOrder = "desc"; }

        const res = await api.get(`${API_PATHS.TESTS}?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
        setTests(res.data.tests || []);
        if (res.data.pagination) setTotalPages(res.data.pagination.totalPages);
      } catch (e) {
        console.error("Failed to fetch tests", e);
      } finally {
        setLoading(false);
      }
    }
    fetchTests();
  }, [page, sortOption]);

  if (status === "loading") return <Loading />;
  if (status === "unauthenticated" || !session) {
    return <div className="p-8 text-center">Vui lòng đăng nhập để xem trang này.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Phần Header riêng cho Sectional */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Sectional Practice</h1>
            <p className="text-slate-600 mt-2">Target specific subjects and modules to improve your weak points.</p>
        </div>

        <section>
          <div className="flex flex-col md:flex-row gap-8">
            
            {/* Cột trái: Bộ lọc thời gian (giữ nguyên) */}
            <div className="w-full md:w-1/4 flex-shrink-0">
              <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-24">
                <h2 className="text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">Filter by Date</h2>
                <div className="flex flex-col gap-2">
                  {uniquePeriods.map((period, index) => (
                    <button
                      key={index}
                      onClick={() => { setSelectedPeriod(period); setPage(1); }}
                      className={`text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedPeriod === period ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" : "text-slate-600 hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      {period === "All" ? "All Tests" : period}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Cột phải: Danh sách đề thi */}
            <div className="w-full md:w-3/4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-transparent">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-slate-900">Test Library</h2>
                  {loading && <span className="text-sm text-slate-500 animate-pulse">Syncing...</span>}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  
                  {/* BỘ LỌC MỚI: CHỌN MÔN HỌC */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Subject:</label>
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="bg-blue-50 border border-blue-200 text-blue-700 font-semibold text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                    >
                      <option value="reading">Reading & Writing</option>
                      <option value="math">Math</option>
                    </select>
                  </div>

                  {/* Bộ lọc Sort (giữ nguyên) */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-600">Sort by:</label>
                    <select
                      value={sortOption}
                      onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
                      className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="title_asc">Title (A-Z)</option>
                      <option value="title_desc">Title (Z-A)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Render danh sách bài thi */}
              {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <TestCardSkeleton key={i} isSectional={true} />
                  ))}
                </div>
         ) : filteredTests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No tests found</h3>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredTests.map((test: any) => (
                      <TestCard 
                        key={test._id} 
                        test={test} 
                        isSectional={true}             /* <--- Bật chế độ 2 nút */
                        subjectFilter={subjectFilter}  /* <--- Truyền môn học xuống để làm URL */
                        userResults={userResults}      /* <--- Truyền lịch sử điểm xuống để check Retake */
                      />
                    ))}
                  </div>

                  {/* Phân trang (giữ nguyên) */}
                  {!loading && totalPages > 1 && (
                    <div className="flex justify-center items-center mt-8 gap-4">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">Previous</button>
                      <span className="text-sm font-medium text-slate-600">Page {page} of {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm hover:bg-slate-50 disabled:opacity-50">Next</button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}