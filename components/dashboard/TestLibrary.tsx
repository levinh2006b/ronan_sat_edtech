"use client";

import { BookOpen } from "lucide-react";       // icon
import TestCard from "@/components/TestCard";       // Khung hiển thị 1 bài test
import Loading from "@/components/Loading";         // animation loading
import { Dispatch, SetStateAction } from "react";
import TestCardSkeleton from "@/components/TestCardSkeleton";

interface TestLibraryProps {
    uniquePeriods: string[];
    selectedPeriod: string;
    setSelectedPeriod: (val: string) => void;
    sortOption: string;
    setSortOption: (val: string) => void;
    page: number;
    setPage: Dispatch<SetStateAction<number>>; // Định dạng đúng cho hàm setPage của useState
    loading: boolean;
    filteredTests: any[];
    totalPages: number;
}

export default function TestLibrary({
    uniquePeriods, selectedPeriod, setSelectedPeriod,
    sortOption, setSortOption,
    page, setPage,
    loading, filteredTests, totalPages
}: TestLibraryProps) {
    return (
        <section>
            <div className="flex flex-col md:flex-row gap-8">
                
                {/* CỘT TRÁI: Thanh Sidebar điều hướng theo thời gian */}
                <div className="w-full md:w-1/4 flex-shrink-0">
                    {/* sticky top-24 giúp thanh này dính trên màn hình khi cuộn chuột */}
                    <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-24">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 pb-3 border-b border-slate-100">
                            Filter by Date
                        </h2>
                        <div className="flex flex-col gap-2">
                            {uniquePeriods.map((period, index) => (
                                <button
                                    key={index}
                                    onClick={() => { 
                                        setSelectedPeriod(period); 
                                        setPage(1); // Cực kì quan trọng: Reset về trang 1 khi đổi bộ lọc
                                    }}
                                    className={`cursor-pointer text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                        selectedPeriod === period 
                                            ? "bg-blue-50 text-blue-700 border border-blue-200 shadow-sm" // Nổi bật mục đang chọn
                                            : "text-slate-600 hover:bg-slate-50 border border-transparent"
                                    }`}
                                >
                                    {period === "All" ? "All Tests" : period}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: Lưới danh sách đề thi */}
                <div className="w-full md:w-3/4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-transparent">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-900">Practice Test Library</h2>
                            {loading && <span className="text-sm text-slate-500 animate-pulse">Syncing...</span>}
                        </div>

                        <div className="flex items-center gap-2">
                            <label htmlFor="sort-tests" className="text-sm font-medium text-slate-600">Sort by:</label>
                            <select
                                id="sort-tests"
                                value={sortOption}    // Hiển thị ra màn hình lựa chọn Sort hiện tại
                                onChange={(e) => { setSortOption(e.target.value); setPage(1); }}    // Cập nhật Sort và về trang 1
                                className="cursor-pointer bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="title_asc">Title (A-Z)</option>
                                <option value="title_desc">Title (Z-A)</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                            /* Hiển thị danh sách Khung sườn (Skeleton) khi đang chờ API */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* Tạo mảng 6 phần tử ảo để in ra 6 cái khung sườn lấp đầy màn hình */}
                                {[1, 2, 3, 4, 5, 6].map((index) => (
                                    <TestCardSkeleton key={index} />
                                ))}
                            </div>
                        ) : filteredTests.length === 0 ? (
                            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
                                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-slate-900">No tests found for this period</h3>
                            </div>
                        ) : (
                        <>
                            {/* Điều chỉnh Grid thành 2 cột to để vừa vặn với kích thước mới (vì bên trái đã chiếm 1 khoảng) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* BẮT BUỘC PHẢI DÙNG filteredTests Ở ĐÂY */}
                                {filteredTests.map((test: any) => (
                                    <TestCard key={test._id} test={test} />
                                ))}
                            </div>

                            {!loading && totalPages > 1 && (      // nếu đang k load và số trang phải > 1
                                <div className="flex justify-center items-center mt-8 gap-4">
                                    <button
                                        onClick={() => setPage((p: number) => Math.max(1, p - 1))}     // Lùi trang
                                        disabled={page === 1}                                // Chặn lùi nếu ở trang 1 
                                        className="cursor-pointer px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm font-medium text-slate-600">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}  // Tiến trang
                                        disabled={page === totalPages}                             // Chặn tiến nếu ở trang cuối
                                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

            </div>
        </section>
    );
}