"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import { ListPlus, CheckCircle, Save, Upload, FileUp } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";

// Đã XÓA thư viện papaparse vì Javascript đọc được JSON tự nhiên

export default function CreateQuestionForm({ tests }: { tests: any[] }) {
    // State cho việc chọn Bài Test
    const [selectedTestId, setSelectedTestId] = useState("");

    // THAY ĐỔI: State cho việc xử lý JSON (thay vì CSV)
    const [parsedJSONQuestions, setParsedJSONQuestions] = useState<any[]>([]); // Kho chứa tạm các câu hỏi JSON
    const [isSavingJSON, setIsSavingJSON] = useState(false); // Trạng thái hiệu ứng xoay khi đang lưu JSON

    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState("");

    // Form tạo 1 câu hỏi thủ công
    const [questionForm, setQuestionForm] = useState({
        section: "Reading and Writing",
        module: 1,
        questionType: "multiple_choice",
        questionText: "",
        passage: "",
        imageUrl: "",
        choices: ["", "", "", ""],
        correctAnswer: "",
        sprAnswers: ["", "", ""],
        explanation: "",
        difficulty: "medium",
        points: 10
    });

    const [questionMessage, setQuestionMessage] = useState("");

    // Auto chọn bài test đầu tiên
    useEffect(() => {
        if (tests.length > 0 && !selectedTestId) {
            setSelectedTestId(tests[0]._id);
        }
    }, [tests, selectedTestId]);

    const handleChoiceChange = (index: number, value: string) => {
        const newChoices = [...questionForm.choices];
        newChoices[index] = value;
        setQuestionForm({ ...questionForm, choices: newChoices });
    };

    // THAY ĐỔI: Hàm xử lý file tải lên - CHỈ ĐỌC JSON
   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTestId) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
        try {
            const rows = JSON.parse(event.target?.result as string);
            const validQuestions = rows.map((row :any) => {
                const type = (row.questionType || "multiple_choice").trim();
                
                // Khởi tạo payload cơ bản
                const payload: any = {
                    testId: selectedTestId,
                    section: String(row.section || "Reading and Writing").trim(),
                    domain: String(row.domain || "").trim(),
                    skill: String(row.skill || "").trim(),
                    module: Number(row.module) || 1,
                    questionType: type,
                    questionText: String(row.questionText || "").trim(),
                    explanation: String(row.explanation || "").trim(),
                    difficulty: String(row.difficulty || "medium").trim().toLowerCase(),
                    points: Number(row.points) || 10,
                };

                // Thêm các trường optional nếu có dữ liệu
                if (row.passage?.trim()) payload.passage = row.passage.trim();
                if (row.imageUrl?.trim()) payload.imageUrl = row.imageUrl.trim();

                if (type === "multiple_choice") {
                    // Chỉ gom choices cho câu trắc nghiệm
                    const choices = [
                        String(row.choice_0 || "").trim(),
                        String(row.choice_1 || "").trim(),
                        String(row.choice_2 || "").trim(),
                        String(row.choice_3 || "").trim()
                    ];
                    payload.choices = choices;

                    // Xử lý correctAnswer
                    let finalAns = String(row.correctAnswer || "").trim();
                    if (finalAns.startsWith("choice_")) {
                        const idx = parseInt(finalAns.split("_")[1]);
                        payload.correctAnswer = choices[idx] || "";
                    } else {
                        payload.correctAnswer = finalAns;
                    }
                } else if (type === "spr") {
                    // Xử lý thông minh: Nhận cả mảng sprAnswers trực tiếp hoặc các trường lẻ
                    let spr = [];
                    
                    // Nếu JSON đã có sẵn mảng sprAnswers (Giống như file JSON hiện tại của bạn)
                    if (Array.isArray(row.sprAnswers) && row.sprAnswers.length > 0) {
                        spr = row.sprAnswers.filter((ans: any) => String(ans).trim() !== "");
                    } 
                    // Đề phòng trường hợp JSON cũ viết theo kiểu sprAnswer_0, sprAnswer_1
                    else {
                        if (row.sprAnswer_0?.trim()) spr.push(row.sprAnswer_0.trim());
                        if (row.sprAnswer_1?.trim()) spr.push(row.sprAnswer_1.trim());
                        if (row.sprAnswer_2?.trim()) spr.push(row.sprAnswer_2.trim());
                    }
                    
                    // Nếu sau khi lọc vẫn không có gì, đưa vào 1 mảng rỗng để Zod không chửi
                    payload.sprAnswers = spr.length > 0 ? spr : [];
                }

                return payload;
            });

            setParsedJSONQuestions(validQuestions);
            setQuestionMessage(`Đã chuẩn bị ${validQuestions.length} câu. Hãy nhấn Save.`);
        } catch (err: any) {
            setQuestionMessage("Lỗi đọc JSON: " + err.message);
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };
    reader.readAsText(file);
};

    // THAY ĐỔI: Hàm đẩy kho JSON nháp lên Database
  const handleSaveJSONQuestions = async () => {
    if (parsedJSONQuestions.length === 0 || !selectedTestId) {
        setQuestionMessage("Lỗi: Chưa chọn bài Test hoặc chưa có dữ liệu JSON!");
        return;
    }
    
    setIsSavingJSON(true);
    let successCount = 0;
    let failCount = 0;
    let firstError = "";

    for (let i = 0; i < parsedJSONQuestions.length; i++) {
        // Đảm bảo mỗi câu đều có testId chuẩn
        const payload = { ...parsedJSONQuestions[i], testId: selectedTestId };
        
        try {
            await api.post(API_PATHS.QUESTIONS, payload);
            successCount++;
        } catch (error: any) {
            failCount++;
            // Bóc tách lỗi cực sâu từ Axios
            const responseData = error.response?.data;
            console.error(`❌ CHI TIẾT LỖI DÒNG ${i + 1}:`, responseData);
            
            if (!firstError) {
                // Nếu server trả về mảng lỗi (Zod), lấy cái đầu tiên
                if (responseData?.error?.details) {
                    const d = responseData.error.details[0];
                    firstError = `Trường [${d.path.join('.')}] bị lỗi: ${d.message}`;
                } else {
                    firstError = responseData?.message || responseData?.error || "Lỗi Database/ObjectId";
                }
            }
        }
    }

    setIsSavingJSON(false);
    if (failCount > 0) {
        setQuestionMessage(`Thất bại ${failCount} câu. Lỗi cụ thể: ${firstError}`);
    } else {
        setQuestionMessage(`Thành công! Đã lưu ${successCount} câu.`);
        setParsedJSONQuestions([]);
    }
};

    // Tạo câu hỏi thủ công trên Web (Không thay đổi)
    const handleCreateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setQuestionMessage("");

        if (!selectedTestId) {
            setQuestionMessage("Please select a test first.");
            return;
        }

        if (questionForm.questionType === "multiple_choice") {
            if (!questionForm.choices.includes(questionForm.correctAnswer)) {
                setQuestionMessage("The correct answer must exactly match one of the choices.");
                return;
            }
        } else {
            if (!questionForm.sprAnswers[0].trim()) {
                setQuestionMessage("Vui lòng điền ít nhất 1 đáp án cho câu tự luận.");
                return;
            }
        }

        try {
            const res = await api.post(API_PATHS.QUESTIONS, {    
                ...questionForm,
                testId: selectedTestId
            });

            if (res.status === 200 || res.status === 201) {
                setQuestionMessage("Question added successfully!");
                setQuestionForm({
                    ...questionForm,
                    questionText: "",
                    passage: "",
                    imageUrl: "",
                    choices: ["", "", "", ""],
                    correctAnswer: "",
                    sprAnswers: ["", "", ""],
                    explanation: "",
                });
            } else {
                setQuestionMessage(`Error: ${res.data.error || "Unknown database error"}`);
            }
        } catch (err: any) {
            setQuestionMessage("Network error");
        }
    };



    const hasTable = questionForm.passage?.includes('<table') || questionForm.questionText?.includes('<table');
    const needsImage = questionForm.imageUrl === "Cần thêm ảnh";
    const hasRealImage = questionForm.imageUrl && questionForm.imageUrl.startsWith("http");



    return (
        <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <ListPlus className="w-5 h-5 text-blue-600" />
                        Step 2: Add Questions to Test
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="text-sm font-semibold text-slate-600">Select Test:</label>
                        <select
                            value={selectedTestId}
                            onChange={(e) => setSelectedTestId(e.target.value)}
                            className="px-3 py-1.5 border border-slate-300 rounded-md font-medium text-sm outline-none bg-white text-slate-900 min-w-[200px]"
                        >
                            {tests.map(t => (
                                <option key={t._id} value={t._id}>{t.title}</option>
                            ))}  
                            {tests.length === 0 && <option value="">No tests available</option>}
                        </select>
                    </div>
                </div>

                {/* KHU VỰC GIAO DIỆN UPLOAD JSON MỚI */}
                <div className="p-5 bg-blue-50/50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800">Tải lên hàng loạt bằng JSON</h3>
                        <p className="text-sm text-slate-500">Chọn file .json chứa danh sách câu hỏi để chuẩn bị thêm vào Test.</p>
                        
                        {importProgress && (
                            <p className="text-sm font-bold text-blue-600 mt-2">{importProgress}</p>
                        )}
                        
                        {parsedJSONQuestions.length > 0 && !isSavingJSON && (
                            <p className="text-sm font-bold text-emerald-600 mt-2">
                                📌 Sẵn sàng: {parsedJSONQuestions.length} câu hỏi đang chờ được lưu.
                            </p>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="relative">
                            <button 
                                disabled={isImporting || isSavingJSON || !selectedTestId}
                                className="w-full bg-white border-2 border-slate-300 text-slate-700 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                type="button"
                            >
                                <FileUp className="w-5 h-5" /> 
                                {isImporting ? "Đang đọc file..." : "1. Chọn file JSON"}
                            </button>
                            {/* THAY ĐỔI: Chỉ chấp nhận file có đuôi .json */}
                            <input 
                                type="file" 
                                accept=".json"
                                onChange={handleFileUpload}
                                disabled={isImporting || isSavingJSON || !selectedTestId}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                            />
                        </div>

                        {/* NÚT THỨ 2: CHỈ HIỆN KHI ĐÃ ĐỌC JSON XONG */}
                        {parsedJSONQuestions.length > 0 && (
                            <button
                                type="button"
                                onClick={handleSaveJSONQuestions}
                                disabled={isSavingJSON}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold shadow-md transition-all disabled:opacity-50"
                            >
                                <Save className="w-5 h-5" />
                                {isSavingJSON ? "Đang lưu..." : "2. Save JSON Questions"}
                            </button>
                        )}
                    </div>
                </div>

                <form className="p-6 space-y-6" onSubmit={handleCreateQuestion}>
                    {questionMessage && (
                        <div className={`p-4 rounded-lg font-medium text-sm flex items-center gap-2 ${questionMessage.includes('thành công') || questionMessage.includes('success') ? 'bg-green-50 justify-center text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {(questionMessage.includes('thành công') || questionMessage.includes('success')) && <CheckCircle className="w-5 h-5" />}
                            {questionMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
                            <select
                                value={questionForm.section}
                                onChange={(e) => setQuestionForm({ ...questionForm, section: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            >
                                <option value="Reading and Writing">Reading and Writing</option>
                                <option value="Math">Math</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Module</label>
                            <select
                                value={questionForm.module}
                                onChange={(e) => setQuestionForm({ ...questionForm, module: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            >
                                <option value={1}>Module 1</option>
                                <option value={2}>Module 2</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Loại câu hỏi</label>
                            <select
                                value={questionForm.questionType}
                                onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 font-medium"
                            >
                                <option value="multiple_choice">Trắc nghiệm</option>
                                <option value="spr">Tự luận</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                            <select
                                value={questionForm.difficulty}
                                onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Points</label>
                            <input
                                type="number"
                                required
                                value={Number.isNaN(questionForm.points) ? "" : questionForm.points}
                                onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Passage</label>
                            <textarea
                                rows={4}
                                value={questionForm.passage}
                                onChange={(e) => setQuestionForm({ ...questionForm, passage: e.target.value })}
                                placeholder="Text passage for reading questions..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-serif resize-none bg-white text-slate-900"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Question Image / Chart (Optional)</label>
                            <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Minh họa: Hình ảnh / Bảng dữ liệu</label>
                            
                            {/* 1. NẾU AI TẠO BẢNG: Hiển thị Preview bảng ở đây và báo không cần ảnh */}
                            {hasTable && !hasRealImage && (
                                <div className="mb-3 p-4 border-2 border-emerald-400 bg-emerald-50 rounded-lg">
                                    <p className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                                        📊 AI đã tự động vẽ Bảng dữ liệu thành công!
                                    </p>
                                    <p className="text-xs text-slate-600 mb-3">Mã HTML của bảng đã nằm trong phần Text. Khung dưới là bản xem trước, bạn không cần phải tải ảnh của bảng lên nữa.</p>
                                    
                                    {/* Render HTML bảng ra đây để preview (chỉ lấy đoạn table) */}
                                    <div className="overflow-x-auto bg-white p-2 rounded border border-slate-200 pointer-events-none"
                                         dangerouslySetInnerHTML={{
                                             __html: questionForm.passage.includes('<table') 
                                                ? questionForm.passage.substring(questionForm.passage.indexOf('<table'), questionForm.passage.indexOf('</table>') + 8)
                                                : questionForm.questionText.substring(questionForm.questionText.indexOf('<table'), questionForm.questionText.indexOf('</table>') + 8)
                                         }}
                                    />
                                </div>
                            )}

                            {/* 2. KHU VỰC UPLOAD ẢNH (Sẽ đổi màu đỏ cảnh báo nếu AI báo "Cần thêm ảnh") */}
                            <div className={`border rounded-lg p-3 ${needsImage ? 'border-red-400 bg-red-50 shadow-sm' : 'border-slate-300 bg-slate-50'}`}>
                                {hasRealImage ? (
                                    // Khi đã upload URL thành công
                                    <div className="relative">
                                        <img src={questionForm.imageUrl} alt="Question preview" className="max-h-40 mx-auto rounded shadow-sm" />
                                        <button 
                                            type="button" 
                                            onClick={() => setQuestionForm({...questionForm, imageUrl: ""})} 
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 px-3 rounded-bl-lg rounded-tr-lg text-xs hover:bg-red-600 font-bold"
                                        >
                                            Xóa ảnh
                                        </button>
                                    </div>
                                ) : (
                                    // Khi chưa có ảnh thật
                                    <>
                                        {/* Cảnh báo đỏ nếu AI trả về chuỗi "Cần thêm ảnh" */}
                                        {needsImage && (
                                            <p className="text-sm font-bold text-red-600 mb-2 text-center animate-pulse">
                                                ⚠️ AI phát hiện có đồ thị/hình vẽ. Vui lòng tải ảnh lên!
                                            </p>
                                        )}
                                        
                                        <CldUploadWidget
                                            uploadPreset="ronan_sat_edTech"
                                            onSuccess={(result: any) => {
                                                if (result?.event === "success") {
                                                    setQuestionForm(prev => ({ ...prev, imageUrl: result.info.secure_url }));
                                                    document.body.style.overflow = "auto";
                                                }
                                            }}
                                            onClose={() => {
                                                document.body.style.overflow = "auto";
                                            }}
                                        >
                                            {({ open }) => (
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.preventDefault(); open(); }}
                                                    // Nếu đang cần ảnh thì nút màu đỏ, nếu đã có Bảng thì thu nhỏ nút lại đỡ vướng
                                                    className={`w-full border-2 border-dashed rounded-lg transition-all font-medium flex items-center justify-center gap-2 
                                                        ${hasTable ? 'py-1.5 text-xs text-slate-400 border-slate-200 hover:text-blue-500' : 'py-3 text-sm'} 
                                                        ${needsImage ? 'border-red-400 text-red-600 hover:bg-red-100 bg-white' : 'border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50'}`}
                                                >
                                                    <Upload className="w-5 h-5" /> 
                                                    {needsImage 
                                                        ? "Bấm vào đây để tải ảnh đồ thị lên" 
                                                        : hasTable 
                                                            ? "(Tùy chọn) Vẫn tải thêm ảnh khác lên" 
                                                            : "Tải ảnh đồ thị/biểu đồ lên (Không bắt buộc)"}
                                                </button>
                                            )}
                                        </CldUploadWidget>
                                    </>
                                )}
                            </div>
                        </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Question Text *</label>
                            <textarea
                                rows={3}
                                required
                                value={questionForm.questionText}
                                onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                                placeholder="The actual question..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium resize-none bg-white text-slate-900"
                            />
                        </div>

                        {questionForm.questionType === "multiple_choice" ? (
                            <>
                                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-800">Multiple Choice Options</label>
                                    {questionForm.choices.map((choice, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="w-8 h-8 flex items-center justify-center bg-slate-200 text-slate-700 font-bold rounded shrink-0">
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            <input
                                                type="text"
                                                required
                                                value={choice}
                                                onChange={(e) => handleChoiceChange(i, e.target.value)}
                                                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-emerald-700 mb-1">Correct Answer *</label>
                                        <select
                                            required
                                            value={questionForm.correctAnswer}
                                            onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                                            className="w-full px-4 py-2 border border-emerald-300 bg-emerald-50 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                                        >
                                            <option value="" disabled className="">Select correct choice</option>
                                            {questionForm.choices.map((choice, i) => (
                                                <option key={i} value={choice} disabled={!choice} className="">
                                                    {choice ? `Option ${String.fromCharCode(65 + i)}: ${choice}` : `Option ${String.fromCharCode(65 + i)} (Empty)`}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-slate-500 mt-1">Select from the choices above.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Explanation *</label>
                                        <textarea
                                            rows={2}
                                            required
                                            value={questionForm.explanation}
                                            onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                            placeholder="Why is this correct?"
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white text-slate-900"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                    <label className="block text-sm font-bold text-slate-800">Đáp án tự luận (Hỗ trợ tối đa 3 cách viết)</label>
                                    <p className="text-xs text-slate-500 mb-3">Ví dụ: Điền 1/3 ở cách 1; điền 0.333 ở cách 2; điền .333 ở cách 3</p>
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded shrink-0">
                                                {i + 1}
                                            </span>
                                            <input
                                                type="text"
                                                required={i === 0}
                                                value={questionForm.sprAnswers[i]}
                                                onChange={(e) => {
                                                    const newAnswers = [...questionForm.sprAnswers];
                                                    newAnswers[i] = e.target.value;
                                                    setQuestionForm({ ...questionForm, sprAnswers: newAnswers });
                                                }}
                                                placeholder={i === 0 ? "Cách viết đáp án 1 (Bắt buộc) - VD: 1/3" : `Cách viết đáp án ${i + 1} (Tùy chọn) - VD: 0.333`}
                                                className={`w-full px-4 py-2 border ${i === 0 ? 'border-blue-300 bg-blue-50' : 'border-slate-300'} rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Explanation</label>
                                    <textarea
                                        rows={2}
                                        required
                                        value={questionForm.explanation}
                                        onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                        placeholder="Why is this correct?"
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white text-slate-900"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-200 flex justify-end">
                        <button
                            type="submit"
                            disabled={!selectedTestId || tests.length === 0}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save className="w-5 h-5" /> Save Question
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}