"use client";

import Image from "next/image";
import { useState } from "react";
import api from "@/lib/axios";
import { CheckCircle, Save, Upload } from "lucide-react";
import { CldUploadWidget, type CloudinaryUploadWidgetResults } from "next-cloudinary";

const panelHeaderClassName =
    "flex items-center gap-3 border-b-4 border-ink-fg bg-paper-bg px-5 py-4 text-ink-fg";

const fieldLabelClassName = "mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-ink-fg/70";

export default function CreateStudentForm() {
    const [studentForm, setStudentForm] = useState({
        name: "",
        school: "",
        score: 0,
        examDate: "",
        imageUrl: ""
    });
    const [studentMessage, setStudentMessage] = useState("");

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setStudentMessage("");

        if (!studentForm.imageUrl) {
            setStudentMessage("Error: Please upload a student photo first.");
            return;
        }

        try {
            const res = await api.post("/api/students", studentForm);

            if (res.status === 200 || res.status === 201) {
                setStudentMessage("Student added to the Hall of Fame successfully!");
                setStudentForm({ name: "", school: "", score: 0, examDate: "", imageUrl: "" });
            } else {
                setStudentMessage(`Error: ${res.data?.error || "Could not add student."}`);
            }
        } catch (err: unknown) {
            console.error(err);
            setStudentMessage("Server connection error.");
        }
    };

    return (
        <div className="workbook-panel mt-8 overflow-hidden">
            <div className={panelHeaderClassName}>
                <div>
                    <h2 className="font-display text-2xl font-black uppercase tracking-tight">Add Hall of Fame Students</h2>
                    <p className="text-sm text-ink-fg/70">Save standout student results with a photo and score details.</p>
                </div>
            </div>

            <form className="p-6 space-y-6" onSubmit={handleCreateStudent}>
                {studentMessage && (
                    <div className={`flex items-center gap-2 rounded-2xl border-2 px-4 py-3 text-sm font-bold brutal-shadow-sm ${studentMessage.includes('successfully') ? 'justify-center border-ink-fg bg-primary text-ink-fg' : 'border-ink-fg bg-accent-3 text-white'}`}>
                        {studentMessage.includes('successfully') && <CheckCircle className="h-5 w-5" />}
                        {studentMessage}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 rounded-2xl border-2 border-ink-fg bg-paper-bg p-5 brutal-shadow-sm">
                        <div>
                            <label className={fieldLabelClassName}>Student Name *</label>
                            <input
                                type="text" required
                                value={studentForm.name}
                                onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                                className="workbook-input text-sm"
                                placeholder="e.g. Nguyen Van A"
                            />
                        </div>
                        <div>
                            <label className={fieldLabelClassName}>School *</label>
                            <input
                                type="text" required
                                value={studentForm.school}
                                onChange={(e) => setStudentForm({ ...studentForm, school: e.target.value })}
                                className="workbook-input text-sm"
                                placeholder="e.g. Hanoi Amsterdam High School"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={fieldLabelClassName}>SAT Score *</label>
                                <input
                                    type="number" required min="400" max="1600"
                                    value={Number.isNaN(studentForm.score) ? "" : studentForm.score}
                                    onChange={(e) => setStudentForm({ ...studentForm, score: parseInt(e.target.value) })}
                                    className="workbook-input text-sm"
                                    placeholder="1500"
                                />
                            </div>
                            <div>
                                <label className={fieldLabelClassName}>Exam Month / Year *</label>
                                <input
                                    type="text" required
                                    value={studentForm.examDate}
                                    onChange={(e) => setStudentForm({ ...studentForm, examDate: e.target.value })}
                                    className="workbook-input text-sm"
                                    placeholder="e.g. August 2023"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-fg bg-paper-bg p-6 brutal-shadow-sm">
                        {studentForm.imageUrl ? (
                            <div className="text-center">
                                <Image src={studentForm.imageUrl} alt="Preview" width={800} height={800} unoptimized className="mx-auto mb-4 h-48 w-auto rounded-2xl border-2 border-ink-fg object-contain bg-surface-white p-2 brutal-shadow-sm" />
                                <button 
                                    type="button" 
                                    onClick={() => setStudentForm({...studentForm, imageUrl: ""})} 
                                    className="text-sm font-bold text-accent-3 underline underline-offset-4"
                                >
                                    Remove photo and choose another
                                </button>
                            </div>
                        ) : (
                            <>
                            <CldUploadWidget     
                                uploadPreset="ronan_sat_edTech"
                                onSuccess={(result: CloudinaryUploadWidgetResults) => {
                                    const info = typeof result.info === "string" ? undefined : result.info;
                                    if (info?.secure_url) {
                                        setStudentForm(prev => ({ ...prev, imageUrl: info.secure_url }));
                                    }
                                }}
                            >
                                {({ open }) => (
                                    <div className="text-center cursor-pointer p-4" onClick={() => open?.()}>
                                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-2 border-ink-fg bg-accent-1 text-ink-fg brutal-shadow-sm transition-transform hover:-translate-y-0.5">
                                            <Upload className="h-8 w-8" />
                                        </div>
                                        <p className="font-bold text-ink-fg">Click to choose a student photo</p>
                                        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-ink-fg/60">Powered by Cloudinary</p>
                                    </div>
                                )}
                            </CldUploadWidget>
                            </>
                        )}
                        
                    </div>
                                
                </div>

                <div className="flex justify-end border-t-2 border-ink-fg pt-6">
                    <button
                        type="submit"
                        disabled={!studentForm.imageUrl} 
                        className="workbook-button workbook-press px-8 py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" /> Save Student
                    </button>
                </div>
            </form>
        </div>
    );
}
