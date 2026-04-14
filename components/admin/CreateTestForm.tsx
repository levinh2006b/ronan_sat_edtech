"use client";

import { useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { FileText, Plus } from "lucide-react";

import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import { VERBAL_SECTION } from "@/lib/sections";

type CreateTestFormState = {
  title: string;
};

const panelHeaderClassName =
  "flex items-center gap-3 border-b-4 border-ink-fg bg-paper-bg px-5 py-4 text-ink-fg";

const fieldLabelClassName = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70";

export default function CreateTestForm({ onSuccess }: { onSuccess: () => void }) {
  const [testForm, setTestForm] = useState<CreateTestFormState>({
    title: "",
  });
  const [testMessage, setTestMessage] = useState("");

  const handleCreateTest = async (event: FormEvent) => {
    event.preventDefault();
    setTestMessage("");

    try {
      const res = await api.post(API_PATHS.TESTS, {
        title: testForm.title,
        sections: [
          { name: VERBAL_SECTION, questionsCount: 27, timeLimit: 32 },
          { name: "Math", questionsCount: 22, timeLimit: 35 },
        ],
      });

      if (res.status === 200 || res.status === 201) {
        setTestMessage("Test created successfully!");
        setTestForm({ title: "" });
        onSuccess();
      } else {
        setTestMessage(`Error: ${String(res.data?.error || "Error creating test.")}`);
      }
    } catch (error: unknown) {
      console.error(error);
      const axiosError = error as AxiosError<{ error?: string }>;
      setTestMessage(axiosError.response?.data?.error || "Network error");
    }
  };

  return (
    <div className="space-y-8 lg:col-span-1">
      <div className="workbook-panel overflow-hidden">
        <div className={panelHeaderClassName}>
          <span className="workbook-sticker bg-primary text-ink-fg">
            <FileText className="h-4 w-4" />
            Step 1
          </span>
          <div>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight">Create Test</h2>
            <p className="text-sm text-ink-fg/70">Start a new SAT workbook with the default section structure.</p>
          </div>
        </div>

        <form className="p-5 space-y-5" onSubmit={handleCreateTest}>
          {testMessage && (
            <div
              className={`rounded-2xl border-2 px-4 py-3 text-sm font-bold brutal-shadow-sm ${
                testMessage.includes("success")
                  ? "border-ink-fg bg-primary text-ink-fg"
                  : "border-ink-fg bg-accent-3 text-white"
              }`}
            >
              {testMessage}
            </div>
          )}

          <div>
            <label className={fieldLabelClassName}>Test Title</label>
            <input
              type="text"
              required
              value={testForm.title}
              onChange={(event) => setTestForm({ title: event.target.value })}
              placeholder="e.g. Official Practice Test 1"
              className="workbook-input text-sm"
            />
          </div>

          <button
            type="submit"
            className="workbook-button workbook-press w-full text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create Test
          </button>
        </form>
      </div>
    </div>
  );
}
