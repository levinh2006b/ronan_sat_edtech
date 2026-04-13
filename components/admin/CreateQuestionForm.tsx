"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import { ListPlus, CheckCircle, Save, Upload, FileUp, ChevronDown } from "lucide-react";
import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";

type TestOption = {
    _id: string;
    title: string;
};

type JsonQuestionRow = Record<string, unknown>;

type QuestionPayload = {
    testId: string;
    section: string;
    domain: string;
    skill: string;
    module: number;
    questionType: string;
    questionText: string;
    explanation: string;
    difficulty: string;
    points: number;
    passage?: string;
    imageUrl?: string;
    choices?: string[];
    correctAnswer?: string;
    sprAnswers?: string[];
};

function getTrimmedString(value: unknown) {
    return typeof value === "string" ? value.trim() : "";
}

const panelHeaderClassName =
    "flex items-center justify-between gap-4 border-b-4 border-ink-fg bg-paper-bg px-5 py-4";

const fieldLabelClassName = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70";

const workbookInputClassName = "workbook-input text-sm";

const workbookSelectClassName = "workbook-input appearance-none pr-10 text-sm";

const workbookTextareaClassName = "workbook-input resize-none text-sm";

export default function CreateQuestionForm({ tests }: { tests: TestOption[] }) {
    const [selectedTestId, setSelectedTestId] = useState("");
    const [isTestDropdownOpen, setIsTestDropdownOpen] = useState(false);

    const [parsedJSONQuestions, setParsedJSONQuestions] = useState<QuestionPayload[]>([]);
    const [isSavingJSON, setIsSavingJSON] = useState(false);

    const [isImporting, setIsImporting] = useState(false);
    const [importProgress] = useState("");

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

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTestId) return;

    setIsImporting(true);
    const reader = new FileReader();
    
    reader.onload = (event) => {
        try {
            const rows = JSON.parse(event.target?.result as string) as JsonQuestionRow[];
            const validQuestions = rows.map((row) => {
                const type = String(row.questionType || "multiple_choice").trim();
                
                const payload: QuestionPayload = {
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

                const passage = getTrimmedString(row.passage);
                const imageUrl = getTrimmedString(row.imageUrl);
                if (passage) payload.passage = passage;
                if (imageUrl) payload.imageUrl = imageUrl;

                if (type === "multiple_choice") {
                    const choices = [
                        String(row.choice_0 || "").trim(),
                        String(row.choice_1 || "").trim(),
                        String(row.choice_2 || "").trim(),
                        String(row.choice_3 || "").trim()
                    ];
                    payload.choices = choices;

                    const finalAns = String(row.correctAnswer || "").trim();
                    if (finalAns.startsWith("choice_")) {
                        const idx = parseInt(finalAns.split("_")[1]);
                        payload.correctAnswer = choices[idx] || "";
                    } else {
                        payload.correctAnswer = finalAns;
                    }
                } else if (type === "spr") {
                    let spr: string[] = [];
                    
                    if (Array.isArray(row.sprAnswers) && row.sprAnswers.length > 0) {
                        spr = row.sprAnswers.filter((ans): ans is unknown => String(ans).trim() !== "").map((ans) => String(ans).trim());
                    } 
                    else {
                        const sprAnswer0 = getTrimmedString(row.sprAnswer_0);
                        const sprAnswer1 = getTrimmedString(row.sprAnswer_1);
                        const sprAnswer2 = getTrimmedString(row.sprAnswer_2);

                        if (sprAnswer0) spr.push(sprAnswer0);
                        if (sprAnswer1) spr.push(sprAnswer1);
                        if (sprAnswer2) spr.push(sprAnswer2);
                    }
                    
                    payload.sprAnswers = spr.length > 0 ? spr : [];
                }

                return payload;
            });

            setParsedJSONQuestions(validQuestions);
            setQuestionMessage(`Prepared ${validQuestions.length} questions. Click Save to import them.`);
        } catch (err: unknown) {
            setQuestionMessage("JSON read error: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };
    reader.readAsText(file);
};

  const handleSaveJSONQuestions = async () => {
    if (parsedJSONQuestions.length === 0 || !selectedTestId) {
        setQuestionMessage("Error: Select a test and load a JSON file first.");
        return;
    }
    
    setIsSavingJSON(true);
    let successCount = 0;
    let failCount = 0;
    let firstError = "";

    for (let i = 0; i < parsedJSONQuestions.length; i++) {
        const payload = { ...parsedJSONQuestions[i], testId: selectedTestId };
        
        try {
            await api.post(API_PATHS.QUESTIONS, payload);
            successCount++;
        } catch (error: unknown) {
            failCount++;
            const responseData = typeof error === "object" && error !== null && "response" in error
                ? (error as { response?: { data?: { error?: { details?: Array<{ path: string[]; message: string }> }; message?: string } } }).response?.data
                : undefined;
            console.error(`Question import error on row ${i + 1}:`, responseData);
            
            if (!firstError) {
                if (responseData?.error?.details) {
                    const d = responseData.error.details[0] as { path: string[]; message: string };
                    firstError = `Field [${d.path.join('.')}] failed validation: ${d.message}`;
                } else {
                    firstError = typeof responseData?.message === "string"
                        ? responseData.message
                        : "Database/ObjectId error";
                }
            }
        }
    }

    setIsSavingJSON(false);
    if (failCount > 0) {
        setQuestionMessage(`Failed to save ${failCount} question(s). First error: ${firstError}`);
    } else {
        setQuestionMessage(`Success! Saved ${successCount} question(s).`);
        setParsedJSONQuestions([]);
    }
};

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
                setQuestionMessage("Please enter at least one student-produced response answer.");
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
        } catch {
            setQuestionMessage("Network error");
        }
    };



    const hasTable = questionForm.passage?.includes('<table') || questionForm.questionText?.includes('<table');
    const needsImage = questionForm.imageUrl === "Cần thêm ảnh" || questionForm.imageUrl === "Need image";
    const hasRealImage = questionForm.imageUrl && questionForm.imageUrl.startsWith("http");
    const selectedTest = tests.find((test) => test._id === selectedTestId);



    return (
        <div className="lg:col-span-2">
            <div className="workbook-panel overflow-visible">
                <div className={panelHeaderClassName}>
                    <div className="flex items-center gap-3 text-ink-fg">
                        <span className="workbook-sticker bg-accent-2 text-white">
                            <ListPlus className="h-4 w-4" />
                            Step 2
                        </span>
                        <div>
                            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-ink-fg">Add Questions</h2>
                            <p className="text-sm text-ink-fg/70">Load question JSON or build a single question by hand.</p>
                        </div>
                    </div>

                    <div
                        className="relative flex items-center gap-2"
                        onBlur={(event) => {
                            const nextFocus = event.relatedTarget as Node | null;
                            if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
                                setIsTestDropdownOpen(false);
                            }
                        }}
                    >
                        <label className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Select Test</label>
                        <button
                            type="button"
                            disabled={tests.length === 0}
                            onClick={() => setIsTestDropdownOpen((isOpen) => !isOpen)}
                            className="flex min-w-[240px] max-w-[420px] items-center justify-between gap-3 rounded-2xl border-2 border-ink-fg bg-surface-white px-4 py-3 text-left text-sm font-bold text-ink-fg brutal-shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <span className="truncate">{selectedTest?.title || "No tests available"}</span>
                            <ChevronDown className={`h-4 w-4 shrink-0 text-ink-fg/60 transition-transform ${isTestDropdownOpen ? "rotate-180" : ""}`} />
                        </button>

                        {isTestDropdownOpen && tests.length > 0 && (
                            <div className="absolute right-0 top-full z-50 mt-2 w-[min(32rem,calc(100vw-3rem))] max-h-[70vh] overflow-y-auto rounded-2xl border-2 border-ink-fg bg-surface-white p-1 brutal-shadow">
                                {tests.map(t => (
                                    <button
                                        key={t._id}
                                        type="button"
                                        onClick={() => {
                                            setSelectedTestId(t._id);
                                            setIsTestDropdownOpen(false);
                                        }}
                                        className={`block w-full rounded-xl border-2 px-3 py-2 text-left text-sm font-bold transition workbook-press ${t._id === selectedTestId ? "border-ink-fg bg-accent-2 text-white" : "border-transparent bg-surface-white text-ink-fg hover:border-ink-fg hover:bg-paper-bg"}`}
                                    >
                                        {t.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-start justify-between gap-4 border-b-4 border-ink-fg bg-paper-bg px-5 py-5 sm:flex-row sm:items-center">
                    <div>
                        <h3 className="font-display text-xl font-black uppercase tracking-tight text-ink-fg">Bulk Import with JSON</h3>
                        <p className="text-sm text-ink-fg/70">Choose a `.json` file of questions to stage them for the selected test.</p>
                        
                        {importProgress && (
                            <p className="mt-2 text-sm font-bold text-accent-2">{importProgress}</p>
                        )}
                        
                        {parsedJSONQuestions.length > 0 && !isSavingJSON && (
                            <p className="mt-2 text-sm font-bold text-accent-2">
                                Ready: {parsedJSONQuestions.length} question(s) are staged for saving.
                            </p>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className="relative">
                            <button 
                                disabled={isImporting || isSavingJSON || !selectedTestId}
                                className="workbook-button workbook-button-secondary workbook-press w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
                                type="button"
                            >
                                <FileUp className="h-5 w-5" /> 
                                {isImporting ? "Reading file..." : "1. Choose JSON File"}
                            </button>
                            <input 
                                type="file" 
                                accept=".json"
                                onChange={handleFileUpload}
                                disabled={isImporting || isSavingJSON || !selectedTestId}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" 
                            />
                        </div>

                        {parsedJSONQuestions.length > 0 && (
                            <button
                                type="button"
                                onClick={handleSaveJSONQuestions}
                                disabled={isSavingJSON}
                                className="workbook-button workbook-press w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Save className="h-5 w-5" />
                                {isSavingJSON ? "Saving..." : "2. Save JSON Questions"}
                            </button>
                        )}
                    </div>
                </div>

                <form className="p-6 space-y-6" onSubmit={handleCreateQuestion}>
                    {questionMessage && (
                        <div className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-bold brutal-shadow-sm ${(questionMessage.includes('Success') || questionMessage.includes('success')) ? 'justify-center border-ink-fg bg-primary text-ink-fg' : 'border-ink-fg bg-accent-3 text-white'}`}>
                            {(questionMessage.includes('Success') || questionMessage.includes('success')) && <CheckCircle className="h-5 w-5" />}
                            {questionMessage}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className={fieldLabelClassName}>Section</label>
                            <select
                                value={questionForm.section}
                                onChange={(e) => setQuestionForm({ ...questionForm, section: e.target.value })}
                                className={workbookSelectClassName}
                            >
                                <option value="Reading and Writing">Reading and Writing</option>
                                <option value="Math">Math</option>
                            </select>
                        </div>

                        <div>
                            <label className={fieldLabelClassName}>Module</label>
                            <select
                                value={questionForm.module}
                                onChange={(e) => setQuestionForm({ ...questionForm, module: parseInt(e.target.value) })}
                                className={workbookSelectClassName}
                            >
                                <option value={1}>Module 1</option>
                                <option value={2}>Module 2</option>
                            </select>
                        </div>

                        <div>
                            <label className={fieldLabelClassName}>Question Type</label>
                            <select
                                value={questionForm.questionType}
                                onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}
                                className={workbookSelectClassName}
                            >
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="spr">Student-Produced Response</option>
                            </select>
                        </div>

                        <div>
                            <label className={fieldLabelClassName}>Difficulty</label>
                            <select
                                value={questionForm.difficulty}
                                onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}
                                className={workbookSelectClassName}
                            >
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className={fieldLabelClassName}>Points</label>
                            <input
                                type="number"
                                required
                                value={Number.isNaN(questionForm.points) ? "" : questionForm.points}
                                onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}
                                className={workbookInputClassName}
                            />
                        </div>
                    </div>

                    <div className="space-y-4 border-t-2 border-ink-fg pt-4">
                        <div>
                            <label className={fieldLabelClassName}>Passage</label>
                            <textarea
                                rows={4}
                                value={questionForm.passage}
                                onChange={(e) => setQuestionForm({ ...questionForm, passage: e.target.value })}
                                placeholder="Text passage for reading questions..."
                                className={`${workbookTextareaClassName} font-serif`}
                            />
                        </div>

                        <div>
                            <label className={fieldLabelClassName}>Question Image / Chart</label>
                            <div>
                            <label className={fieldLabelClassName}>Visual Reference</label>
                            
                            {hasTable && !hasRealImage && (
                                <div className="mb-3 rounded-2xl border-2 border-ink-fg bg-primary p-4 text-ink-fg brutal-shadow-sm">
                                    <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                                        Table markup detected successfully.
                                    </p>
                                    <p className="mb-3 text-xs text-ink-fg/70">The HTML table is already in the text content. The preview below means you do not need to upload a separate table image.</p>
                                    
                                    <div className="pointer-events-none overflow-x-auto rounded-2xl border-2 border-ink-fg bg-surface-white p-2"
                                         dangerouslySetInnerHTML={{
                                             __html: questionForm.passage.includes('<table') 
                                                ? questionForm.passage.substring(questionForm.passage.indexOf('<table'), questionForm.passage.indexOf('</table>') + 8)
                                                : questionForm.questionText.substring(questionForm.questionText.indexOf('<table'), questionForm.questionText.indexOf('</table>') + 8)
                                         }}
                                    />
                                </div>
                            )}

                            <div className={`rounded-2xl border-2 p-3 brutal-shadow-sm ${needsImage ? 'border-ink-fg bg-accent-3 text-white' : 'border-ink-fg bg-paper-bg text-ink-fg'}`}>
                                {hasRealImage ? (
                                    <div className="relative">
                                        <Image src={questionForm.imageUrl} alt="Question preview" width={1200} height={800} unoptimized className="mx-auto max-h-40 w-auto rounded-2xl border-2 border-ink-fg bg-surface-white p-2" />
                                        <button 
                                            type="button" 
                                            onClick={() => setQuestionForm({...questionForm, imageUrl: ""})} 
                                            className="absolute right-0 top-0 rounded-bl-2xl rounded-tr-2xl border-2 border-ink-fg bg-accent-3 px-3 py-1 text-xs font-bold text-white workbook-press"
                                        >
                                            Remove Image
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {needsImage && (
                                            <p className="mb-2 text-center text-sm font-bold animate-pulse">
                                                A chart or graphic is expected here. Please upload the image.
                                            </p>
                                        )}
                                        
                                        <CldUploadWidget
                                            uploadPreset="ronan_sat_edTech"
                                            onSuccess={(result: CloudinaryUploadWidgetResults) => {
                                                const info = typeof result.info === "string" ? undefined : result.info;
                                                if (result.event === "success" && info?.secure_url) {
                                                    setQuestionForm(prev => ({ ...prev, imageUrl: info.secure_url }));
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
                                                        className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-fg bg-surface-white font-bold transition-all workbook-press ${hasTable ? 'py-2 text-xs' : 'py-3 text-sm'} ${needsImage ? 'text-accent-3' : 'text-ink-fg'}`}
                                                    >
                                                        <Upload className="h-5 w-5" /> 
                                                        {needsImage 
                                                            ? "Upload the required chart image" 
                                                            : hasTable 
                                                                ? "Optional: upload another image anyway" 
                                                                : "Upload a chart or figure (optional)"}
                                                    </button>
                                                )}
                                        </CldUploadWidget>
                                    </>
                                )}
                            </div>
                        </div>
                        </div>

                        <div>
                            <label className={fieldLabelClassName}>Question Text *</label>
                            <textarea
                                rows={3}
                                required
                                value={questionForm.questionText}
                                onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                                placeholder="The actual question..."
                                className={`${workbookTextareaClassName} font-medium`}
                            />
                        </div>

                        {questionForm.questionType === "multiple_choice" ? (
                            <>
                                <div className="space-y-3 rounded-2xl border-2 border-ink-fg bg-paper-bg p-4 brutal-shadow-sm">
                                    <label className="block text-sm font-bold text-ink-fg">Multiple Choice Options</label>
                                    {questionForm.choices.map((choice, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink-fg bg-surface-white font-bold text-ink-fg">
                                                {String.fromCharCode(65 + i)}
                                            </span>
                                            <input
                                                type="text"
                                                required
                                                value={choice}
                                                onChange={(e) => handleChoiceChange(i, e.target.value)}
                                                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                                className={workbookInputClassName}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className={fieldLabelClassName}>Correct Answer *</label>
                                        <select
                                            required
                                            value={questionForm.correctAnswer}
                                            onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                                            className={`${workbookSelectClassName} bg-primary`}
                                        >
                                            <option value="" disabled>Select correct choice</option>
                                            {questionForm.choices.map((choice, i) => (
                                                <option key={i} value={choice} disabled={!choice}>
                                                    {choice ? `Option ${String.fromCharCode(65 + i)}: ${choice}` : `Option ${String.fromCharCode(65 + i)} (Empty)`}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="mt-1 text-xs text-ink-fg/60">Select from the choices above.</p>
                                    </div>

                                    <div>
                                        <label className={fieldLabelClassName}>Explanation *</label>
                                        <textarea
                                            rows={2}
                                            required
                                            value={questionForm.explanation}
                                            onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                            placeholder="Why is this correct?"
                                            className={workbookTextareaClassName}
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-3 rounded-2xl border-2 border-ink-fg bg-paper-bg p-4 brutal-shadow-sm">
                                    <label className="block text-sm font-bold text-ink-fg">Student-Produced Response Answers</label>
                                    <p className="mb-3 text-xs text-ink-fg/60">You can accept up to three formats, for example `1/3`, `0.333`, and `.333`.</p>
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-ink-fg bg-accent-2 font-bold text-white">
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
                                                placeholder={i === 0 ? "Answer format 1 (required) - e.g. 1/3" : `Answer format ${i + 1} (optional) - e.g. 0.333`}
                                                className={`${workbookInputClassName} ${i === 0 ? 'bg-primary' : ''}`}
                                            />
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <label className={fieldLabelClassName}>Explanation</label>
                                    <textarea
                                        rows={2}
                                        required
                                        value={questionForm.explanation}
                                        onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                        placeholder="Why is this correct?"
                                        className={workbookTextareaClassName}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex justify-end border-t-2 border-ink-fg pt-6">
                        <button
                            type="submit"
                            disabled={!selectedTestId || tests.length === 0}
                            className="workbook-button workbook-press px-8 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Save className="h-5 w-5" /> Save Question
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
