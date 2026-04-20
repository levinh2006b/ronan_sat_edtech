"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileWarning, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";

import Loading from "@/components/Loading";
import QuestionExtraBlock from "@/components/question/QuestionExtraBlock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import type { QuestionExtra } from "@/lib/questionExtra";
import { VERBAL_SECTION } from "@/lib/sections";
import { readTestManagerQuestionCache, writeTestManagerQuestionCache } from "@/lib/testManagerQuestionCache";
import type { TestManagerCard } from "@/lib/testManagerReports";
import { renderHtmlLatexContent } from "@/utils/renderContent";

type EditorQuestion = {
  questionId: string;
  testId: string;
  testTitle: string;
  visibility: "public" | "private";
  status: string;
  section: string;
  domain?: string;
  skill?: string;
  module: number;
  questionType: "multiple_choice" | "spr";
  questionText: string;
  passage?: string;
  choices?: string[];
  correctAnswer?: string;
  sprAnswers?: string[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  imageUrl?: string;
  extra?: unknown;
};

type EditorPayload = {
  card: TestManagerCard;
  question: EditorQuestion;
};

type QuestionFormState = {
  testId: string;
  section: string;
  domain: string;
  skill: string;
  module: number;
  questionType: "multiple_choice" | "spr";
  questionText: string;
  passage: string;
  choices: string[];
  correctAnswer: string;
  sprAnswers: string[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  points: number;
  imageUrl: string;
  extraText: string;
};

const optionLabels = ["A", "B", "C", "D", "E", "F"];

function toFormState(question: EditorQuestion): QuestionFormState {
  return {
    testId: question.testId,
    section: question.section || VERBAL_SECTION,
    domain: question.domain ?? "",
    skill: question.skill ?? "",
    module: question.module,
    questionType: question.questionType,
    questionText: question.questionText,
    passage: question.passage ?? "",
    choices: question.choices ?? ["", "", "", ""],
    correctAnswer: question.correctAnswer ?? "",
    sprAnswers: question.sprAnswers ?? [""],
    explanation: question.explanation,
    difficulty: question.difficulty,
    points: question.points,
    imageUrl: question.imageUrl ?? "",
    extraText: question.extra ? JSON.stringify(question.extra, null, 2) : "",
  };
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { error?: string } } }).response;
    if (typeof response?.data?.error === "string" && response.data.error.trim()) {
      return response.data.error;
    }
  }

  return fallback;
}

function EditablePanel({
  label,
  isEditing,
  onStartEdit,
  onDone,
  preview,
  editor,
  helper,
}: {
  label: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onDone: () => void;
  preview: ReactNode;
  editor: ReactNode;
  helper?: string;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">{label}</label>
        {helper ? <span className="text-[11px] text-ink-fg/55">{helper}</span> : null}
      </div>

      {isEditing ? (
        <div className="rounded-[24px] border-2 border-ink-fg bg-primary/35 p-3 brutal-shadow-sm">
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={onDone} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-fg workbook-press">
              <Check className="h-3.5 w-3.5" />
              Done
            </button>
          </div>
          {editor}
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartEdit}
          className="block w-full rounded-[24px] border-2 border-ink-fg bg-surface-white text-left brutal-shadow-sm transition hover:-translate-y-0.5 workbook-press"
        >
          <div className="flex items-center justify-end border-b-2 border-ink-fg/10 px-4 py-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-fg bg-paper-bg px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-fg">
              <Pencil className="h-3.5 w-3.5" />
              Click to edit
            </span>
          </div>
          <div className="px-5 py-5">{preview}</div>
        </button>
      )}
    </section>
  );
}

export function TestManagerQuestionEditor({ cardId }: { cardId: string }) {
  const router = useRouter();
  const [data, setData] = useState<EditorPayload | null>(null);
  const [form, setForm] = useState<QuestionFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingField, setEditingField] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const cached = readTestManagerQuestionCache<EditorPayload>(cardId);
    if (cached) {
      setData(cached);
      setForm(toFormState(cached.question));
      setLoading(false);
    }

    const loadQuestion = async () => {
      if (!cached) {
        setLoading(true);
      }
      setError("");

      try {
        const response = await api.get<EditorPayload>(API_PATHS.getTestManagerQuestion(cardId));

        if (cancelled) {
          return;
        }

        setData(response.data);
        setForm(toFormState(response.data.question));
        writeTestManagerQuestionCache(cardId, response.data);
      } catch (loadError) {
        if (!cancelled) {
          setError(getApiErrorMessage(loadError, "Could not load this reported question."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadQuestion();

    return () => {
      cancelled = true;
    };
  }, [cardId]);

  const reportSummary = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.card.reports.map((report, index) => ({
      ...report,
      label: `Report ${data.card.reportCount - index}`,
    }));
  }, [data]);

  const parsedExtra = useMemo<QuestionExtra | null>(() => {
    if (!form?.extraText.trim()) {
      return null;
    }

    try {
      return JSON.parse(form.extraText) as QuestionExtra;
    } catch {
      return null;
    }
  }, [form?.extraText]);

  if (loading) {
    return <Loading showQuote={false} />;
  }

  if (error || !data || !form) {
    return (
      <main className="min-h-screen bg-paper-bg px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="workbook-panel p-6">
            <div className="flex items-start gap-3 rounded-2xl border-2 border-ink-fg bg-accent-3 px-4 py-4 text-white brutal-shadow-sm">
              <FileWarning className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <div className="text-sm font-black uppercase tracking-[0.16em]">Unavailable</div>
                <p className="mt-1 text-sm">{error || "This reported question could not be opened."}</p>
              </div>
            </div>
            <div className="mt-5">
              <Link href="/test-manager" className="workbook-button workbook-button-secondary workbook-press text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to test manager
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const handleFieldChange = <K extends keyof QuestionFormState>(key: K, value: QuestionFormState[K]) => {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  };

  const handleChoiceChange = (index: number, value: string) => {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextChoices = [...current.choices];
      nextChoices[index] = value;
      return { ...current, choices: nextChoices };
    });
  };

  const handleSprAnswerChange = (index: number, value: string) => {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextAnswers = [...current.sprAnswers];
      nextAnswers[index] = value;
      return { ...current, sprAnswers: nextAnswers };
    });
  };

  const handleAddChoice = () => {
    setForm((current) => (current ? { ...current, choices: [...current.choices, ""] } : current));
  };

  const handleRemoveChoice = (index: number) => {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextChoices = current.choices.filter((_, choiceIndex) => choiceIndex !== index);
      const removedValue = current.choices[index];
      return {
        ...current,
        choices: nextChoices.length > 0 ? nextChoices : [""],
        correctAnswer: current.correctAnswer === removedValue ? "" : current.correctAnswer,
      };
    });
  };

  const handleAddSprAnswer = () => {
    setForm((current) => (current ? { ...current, sprAnswers: [...current.sprAnswers, ""] } : current));
  };

  const handleRemoveSprAnswer = (index: number) => {
    setForm((current) => {
      if (!current) {
        return current;
      }

      const nextAnswers = current.sprAnswers.filter((_, answerIndex) => answerIndex !== index);
      return { ...current, sprAnswers: nextAnswers.length > 0 ? nextAnswers : [""] };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const choices = form.choices.map((choice) => choice.trim()).filter(Boolean);
      const sprAnswers = form.sprAnswers.map((answer) => answer.trim()).filter(Boolean);
      const extra = form.extraText.trim() ? JSON.parse(form.extraText) : undefined;

      const payload = {
        testId: form.testId,
        section: form.section,
        domain: form.domain.trim() || undefined,
        skill: form.skill.trim() || undefined,
        module: form.module,
        questionType: form.questionType,
        questionText: form.questionText,
        passage: form.passage.trim() || undefined,
        choices,
        correctAnswer: form.correctAnswer.trim() || undefined,
        sprAnswers,
        explanation: form.explanation,
        difficulty: form.difficulty,
        points: form.points,
        imageUrl: form.imageUrl.trim() || undefined,
        extra,
      };

      const response = await api.patch<EditorPayload>(API_PATHS.getTestManagerQuestion(cardId), payload);
      setData(response.data);
      setForm(toFormState(response.data.question));
      writeTestManagerQuestionCache(cardId, response.data);
      setEditingField(null);
      setMessage("Question saved.");
    } catch (saveError) {
      if (saveError instanceof SyntaxError) {
        setError("Extra JSON must be valid JSON.");
      } else {
        setError(getApiErrorMessage(saveError, "Could not save this question."));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-paper-bg px-4 py-4 sm:px-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-4">
        <section className="workbook-panel overflow-hidden">
          <div className="flex flex-col gap-4 border-b-4 border-ink-fg bg-paper-bg px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="workbook-sticker bg-primary text-ink-fg">Reported Question Editor</div>
              <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight text-ink-fg sm:text-4xl">
                {data.question.testTitle}
              </h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-fg/70">
                <span className="rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1">{data.card.section}</span>
                <span className="rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1">Module {data.card.module}</span>
                <span className="rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1">Question {data.card.questionNumber}</span>
                <span className="rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1">{data.card.reportCount} reports</span>
                <span
                  className={`rounded-full border-2 border-ink-fg px-3 py-1 ${data.question.visibility === "public" ? "bg-primary text-ink-fg" : "bg-accent-3 text-white"}`}
                >
                  {data.question.visibility}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => router.push("/test-manager")}
                className="workbook-button workbook-button-secondary workbook-press text-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className="workbook-button workbook-press text-sm disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save question"}
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5 lg:p-6">
            {message ? (
              <div className="mb-4 rounded-2xl border-2 border-ink-fg bg-primary px-4 py-3 text-sm font-bold text-ink-fg brutal-shadow-sm">
                {message}
              </div>
            ) : null}
            {error ? (
              <div className="mb-4 rounded-2xl border-2 border-ink-fg bg-accent-3 px-4 py-3 text-sm font-bold text-white brutal-shadow-sm">
                {error}
              </div>
            ) : null}

            <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Section</label>
                <Select value={form.section} onValueChange={(value) => handleFieldChange("section", value)}>
                  <SelectTrigger className="text-sm font-medium normal-case tracking-normal">
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VERBAL_SECTION}>{VERBAL_SECTION}</SelectItem>
                    <SelectItem value="Math">Math</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Module</label>
                <Select value={String(form.module)} onValueChange={(value) => handleFieldChange("module", Number.parseInt(value, 10))}>
                  <SelectTrigger className="text-sm font-medium normal-case tracking-normal">
                    <SelectValue placeholder="Select module" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Module 1</SelectItem>
                    <SelectItem value="2">Module 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Question Type</label>
                <Select value={form.questionType} onValueChange={(value) => handleFieldChange("questionType", value as QuestionFormState["questionType"])}>
                  <SelectTrigger className="text-sm font-medium normal-case tracking-normal">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                    <SelectItem value="spr">Student-Produced Response</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Difficulty</label>
                <Select value={form.difficulty} onValueChange={(value) => handleFieldChange("difficulty", value as QuestionFormState["difficulty"])}>
                  <SelectTrigger className="text-sm font-medium normal-case tracking-normal">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Domain</label>
                <input value={form.domain} onChange={(event) => handleFieldChange("domain", event.target.value)} className="workbook-input text-sm" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Skill</label>
                <input value={form.skill} onChange={(event) => handleFieldChange("skill", event.target.value)} className="workbook-input text-sm" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Points</label>
                <input type="number" min={0} value={form.points} onChange={(event) => handleFieldChange("points", Number.parseInt(event.target.value || "0", 10))} className="workbook-input text-sm" />
              </div>
            </section>

            <div className="space-y-6">
              <EditablePanel
                label="Figures"
                isEditing={editingField === "figures"}
                onStartEdit={() => setEditingField("figures")}
                onDone={() => setEditingField(null)}
                helper="Click the figure area to edit JSON or image URL"
                preview={
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4">
                      {form.imageUrl.trim() ? (
                        <img src={form.imageUrl} alt="Question figure" className="max-h-[28rem] w-full object-contain" />
                      ) : (
                        <div className="flex min-h-40 items-center justify-center rounded-2xl border-2 border-dashed border-ink-fg/35 bg-surface-white px-4 py-8 text-center text-sm text-ink-fg/55">
                          No image URL yet.
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4">
                      {parsedExtra ? (
                        <QuestionExtraBlock
                          extra={parsedExtra}
                          className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4"
                          titleClassName="mb-2 text-center text-[16px] font-normal leading-[1.35] text-ink-fg font-[Georgia,serif]"
                        />
                      ) : (
                        <div className="flex min-h-40 items-center justify-center rounded-2xl border-2 border-dashed border-ink-fg/35 bg-surface-white px-4 py-8 text-center text-sm text-ink-fg/55">
                          No structured figure content yet.
                        </div>
                      )}
                    </div>
                  </div>
                }
                editor={
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Image URL</label>
                      <input value={form.imageUrl} onChange={(event) => handleFieldChange("imageUrl", event.target.value)} className="workbook-input text-sm" />
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Extra JSON</label>
                      <textarea value={form.extraText} onChange={(event) => handleFieldChange("extraText", event.target.value)} rows={10} className="workbook-input resize-y font-mono text-sm" placeholder='{"type":"figure_other","content":{}}' />
                    </div>
                  </div>
                }
              />

              <EditablePanel
                label="Passage"
                isEditing={editingField === "passage"}
                onStartEdit={() => setEditingField("passage")}
                onDone={() => setEditingField(null)}
                preview={
                  form.passage.trim() ? (
                    <div className="font-[Georgia,serif] text-[17.5px] leading-[1.8] text-ink-fg">{renderHtmlLatexContent(form.passage)}</div>
                  ) : (
                    <div className="text-sm text-ink-fg/55">No passage yet.</div>
                  )
                }
                editor={<textarea value={form.passage} onChange={(event) => handleFieldChange("passage", event.target.value)} rows={10} className="workbook-input resize-y text-sm" />}
              />

              <EditablePanel
                label="Question Text"
                isEditing={editingField === "questionText"}
                onStartEdit={() => setEditingField("questionText")}
                onDone={() => setEditingField(null)}
                preview={<div className="font-[Georgia,serif] text-[17.5px] leading-[1.8] text-ink-fg">{renderHtmlLatexContent(form.questionText)}</div>}
                editor={<textarea value={form.questionText} onChange={(event) => handleFieldChange("questionText", event.target.value)} rows={10} className="workbook-input resize-y text-sm" />}
              />

              {form.questionType === "multiple_choice" ? (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Choices</label>
                    <button type="button" onClick={handleAddChoice} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-fg workbook-press">
                      <Plus className="h-3.5 w-3.5" />
                      Add choice
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.choices.map((choice, index) => {
                      const fieldKey = `choice-${index}`;
                      const isEditing = editingField === fieldKey;
                      const label = optionLabels[index] ?? String(index + 1);
                      const isCorrect = form.correctAnswer.trim() === choice.trim() && choice.trim().length > 0;

                      return (
                        <div key={fieldKey} className="rounded-[24px] border-2 border-ink-fg bg-surface-white brutal-shadow-sm overflow-hidden">
                          {isEditing ? (
                            <div className="p-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-fg bg-paper-bg text-sm font-black text-ink-fg">{label}</span>
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => handleFieldChange("correctAnswer", choice)} className={`rounded-full border-2 border-ink-fg px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] workbook-press ${isCorrect ? "bg-primary text-ink-fg" : "bg-surface-white text-ink-fg"}`}>
                                    Mark correct
                                  </button>
                                  {form.choices.length > 1 ? (
                                    <button type="button" onClick={() => handleRemoveChoice(index)} className="rounded-full border-2 border-ink-fg bg-accent-3 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white workbook-press">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                  <button type="button" onClick={() => setEditingField(null)} className="rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-fg workbook-press">
                                    Done
                                  </button>
                                </div>
                              </div>
                              <textarea value={choice} onChange={(event) => handleChoiceChange(index, event.target.value)} rows={4} className="workbook-input resize-y text-sm" />
                            </div>
                          ) : (
                            <button type="button" onClick={() => setEditingField(fieldKey)} className={`flex w-full items-start gap-4 rounded-[22px] px-4 py-4 text-left ${isCorrect ? "bg-primary/35" : "bg-surface-white"}`}>
                              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-ink-fg text-sm font-black ${isCorrect ? "bg-primary text-ink-fg" : "bg-paper-bg text-ink-fg"}`}>{label}</span>
                              <div className="min-w-0 flex-1">
                                <div className="font-[Georgia,serif] text-[17px] leading-[1.7] text-ink-fg">{renderHtmlLatexContent(choice || "Click to add choice text.")}</div>
                                {isCorrect ? <div className="mt-3 inline-flex rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-fg">Correct answer</div> : null}
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <section>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Accepted SPR Answers</label>
                    <button type="button" onClick={handleAddSprAnswer} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-fg workbook-press">
                      <Plus className="h-3.5 w-3.5" />
                      Add answer
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.sprAnswers.map((answer, index) => {
                      const fieldKey = `spr-${index}`;
                      const isEditing = editingField === fieldKey;

                      return (
                        <div key={fieldKey} className="rounded-[24px] border-2 border-ink-fg bg-surface-white brutal-shadow-sm">
                          {isEditing ? (
                            <div className="p-3">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70">Accepted answer {index + 1}</span>
                                <div className="flex items-center gap-2">
                                  {form.sprAnswers.length > 1 ? (
                                    <button type="button" onClick={() => handleRemoveSprAnswer(index)} className="rounded-full border-2 border-ink-fg bg-accent-3 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-white workbook-press">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                  <button type="button" onClick={() => setEditingField(null)} className="rounded-full border-2 border-ink-fg bg-surface-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-fg workbook-press">
                                    Done
                                  </button>
                                </div>
                              </div>
                              <input value={answer} onChange={(event) => handleSprAnswerChange(index, event.target.value)} className="workbook-input text-sm" />
                            </div>
                          ) : (
                            <button type="button" onClick={() => setEditingField(fieldKey)} className="block w-full px-5 py-5 text-left">
                              <div className="rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-4 font-mono text-lg text-ink-fg">{answer || "Click to add an accepted answer."}</div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <EditablePanel
                label="Explanation"
                isEditing={editingField === "explanation"}
                onStartEdit={() => setEditingField("explanation")}
                onDone={() => setEditingField(null)}
                preview={<div className="font-[Georgia,serif] text-[17px] leading-[1.8] text-ink-fg">{renderHtmlLatexContent(form.explanation)}</div>}
                editor={<textarea value={form.explanation} onChange={(event) => handleFieldChange("explanation", event.target.value)} rows={10} className="workbook-input resize-y text-sm" />}
              />

              <section className="rounded-[24px] border-2 border-ink-fg bg-surface-white p-4 brutal-shadow-sm">
                <div className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-ink-fg/70">Latest Reports</div>
                <div className="space-y-3">
                  {reportSummary.map((report) => (
                    <article key={report.id} className="rounded-[18px] border-2 border-ink-fg bg-paper-bg px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-fg/70">
                        <span className="rounded-full border-2 border-ink-fg bg-surface-white px-2 py-0.5 text-ink-fg">{report.label}</span>
                        <span>{report.reason}</span>
                        <span>{report.source === "review" ? "Question from review" : "Question from test"}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-ink-fg">{report.additionalContext?.trim() ? report.additionalContext : "No extra note provided."}</p>
                      <div className="mt-2 text-[11px] text-ink-fg/60">
                        {new Date(report.createdAt).toLocaleString()}
                        {report.reporterName ? ` • ${report.reporterName}` : ""}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
