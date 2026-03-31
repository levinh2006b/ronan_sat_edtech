import Link from "next/link";
import { Clock, BookOpen, GraduationCap } from "lucide-react";

interface Test {
    _id: string;
    title: string;
    timeLimit: number;
    difficulty: string;
    sections: any[];
    // Khai báo thêm trường questionCounts vừa tạo bên BE
    questionCounts?: { rw_1: number; rw_2: number; math_1: number; math_2: number; };
}

interface TestCardProps {
    test: Test;
    isSectional?: boolean;
    subjectFilter?: string;
    userResults?: any[];
}

export default function TestCard({ test, isSectional = false, subjectFilter, userResults = [] }: TestCardProps) {
    const formattedSectionName = subjectFilter === "reading" ? "Reading and Writing" : "Math";

    // 1. Kiểm tra số lượng câu hỏi thực tế trong database cho từng module
    const rw1Count = test.questionCounts?.rw_1 || 0;
    const rw2Count = test.questionCounts?.rw_2 || 0;
    const math1Count = test.questionCounts?.math_1 || 0;
    const math2Count = test.questionCounts?.math_2 || 0;

    // 2. Logic cộng dồn số câu và số giờ cố định theo luật SAT
    let totalQuestions = 0;
    let totalTime = 0;

    if (isSectional) {
        if (subjectFilter === "reading") {
            // Reading & Writing: 27 câu, 32 phút mỗi module
            if (rw1Count > 0) { totalQuestions += 27; totalTime += 32; }
            if (rw2Count > 0) { totalQuestions += 27; totalTime += 32; }
        } else if (subjectFilter === "math") {
            // Math: 22 câu, 35 phút mỗi module
            if (math1Count > 0) { totalQuestions += 22; totalTime += 35; }
            if (math2Count > 0) { totalQuestions += 22; totalTime += 35; }
        }
    } else {
        // Chế độ Full-length Test: Cộng dồn toàn bộ nếu module đó đã được khởi tạo
        if (rw1Count > 0) { totalQuestions += 27; totalTime += 32; }
        if (rw2Count > 0) { totalQuestions += 27; totalTime += 32; }
        if (math1Count > 0) { totalQuestions += 22; totalTime += 35; }
        if (math2Count > 0) { totalQuestions += 22; totalTime += 35; }
    }

    // Biến phụ trợ để quản lý nút bấm
    const secPrefix = subjectFilter === "reading" ? "rw" : "math";
    const mod1Count = test.questionCounts?.[`${secPrefix}_1` as keyof typeof test.questionCounts] || 0;
    const mod2Count = test.questionCounts?.[`${secPrefix}_2` as keyof typeof test.questionCounts] || 0;

    // 3. ẨN HOÀN TOÀN nếu đang ở chế độ Sectional và cả 2 module đều không có câu hỏi nào
    if (isSectional && mod1Count === 0 && mod2Count === 0) {
        return null;
    }

    const getModuleResult = (moduleNumber: number) => {
        return userResults.find(
            (r) => r.testId === test._id && r.sectionalSubject === formattedSectionName && r.sectionalModule === moduleNumber
        );
    };

    const mod1Result = isSectional ? getModuleResult(1) : null;
    const mod2Result = isSectional ? getModuleResult(2) : null;

    const getScore = (res: any) => {
        if (res?.answers) return res.answers.filter((a: any) => a.isCorrect).length;
        return res?.score || 0;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-200 transition-all group flex flex-col h-full">
            <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-700">
                        {test.title}
                    </h3>
                </div>

                <div className="space-y-2 mt-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {/* Thay test.timeLimit bằng tổng thời gian vừa tính */}
                        <span>{totalTime} Minutes Total</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-slate-400" />
                        {/* Thay thế tổng câu hỏi động bằng tổng câu hỏi cố định */}
                        <span>{totalQuestions} Questions</span>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                {isSectional ? (
                    <div className="flex flex-col gap-3">
                        {/* MODULE 1 */}
                        <div className="relative group/btn">
                            {mod1Result && mod1Count > 0 && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max whitespace-nowrap bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm border border-amber-600">
                                    Previous Result: {getScore(mod1Result)} / {subjectFilter === "reading" ? 27 : 22}
                                </div>
                            )}
                            
                            {/* Chặn không cho ấn nếu có 0 câu */}
                            {mod1Count === 0 ? (
                                <button
                                    title="Coming Soon"
                                    disabled
                                    className="block w-full text-center font-medium py-2.5 px-4 rounded-lg border bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 transition-all"
                                >
                                    Module 1 (Coming Soon)
                                </button>
                            ) : (
                                <Link
                                    href={`/test/${test._id}?section=${formattedSectionName}&module=1&mode=sectional`}
                                    className={`relative block w-full text-center font-medium py-2.5 px-4 rounded-lg border transition-all ${
                                        mod1Result 
                                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300" 
                                            : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md border-transparent"
                                    }`}
                                >
                                    {mod1Result ? "Retake Module 1" : "Start Module 1"}
                                </Link>
                            )}
                        </div>

                        {/* MODULE 2 */}
                        <div className="relative group/btn mt-2">
                            {mod2Result && mod2Count > 0 && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-max whitespace-nowrap bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 shadow-sm border border-amber-600">
                                    Previous Result: {getScore(mod2Result)} / {subjectFilter === "reading" ? 27 : 22}
                                </div>
                            )}
                            
                            {/* Chặn không cho ấn nếu có 0 câu */}
                            {mod2Count === 0 ? (
                                <button
                                    title="Coming Soon"
                                    disabled
                                    className="block w-full text-center font-medium py-2.5 px-4 rounded-lg border bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 transition-all"
                                >
                                    Module 2 (Coming Soon)
                                </button>
                            ) : (
                                <Link
                                    href={`/test/${test._id}?section=${formattedSectionName}&module=2&mode=sectional`}
                                    className={`relative block w-full text-center font-medium py-2.5 px-4 rounded-lg border transition-all ${
                                        mod2Result 
                                            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:border-amber-300" 
                                            : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md border-transparent"
                                    }`}
                                >
                                    {mod2Result ? "Retake Module 2" : "Start Module 2"}
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    <Link
                        href={`/test/${test._id}?mode=full`}
                        className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg"
                    >
                        Start Practice
                    </Link>
                )}
            </div>
        </div>
    );
}