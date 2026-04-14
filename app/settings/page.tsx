"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { CheckCircle, Lock, MonitorPlay, Save, TriangleAlert, User } from "lucide-react";

import Loading from "@/components/Loading";
import { useTestingRoomTheme } from "@/hooks/useTestingRoomTheme";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import {
    getTestingRoomThemePreset,
    listTestingRoomThemePresets,
    type TestingRoomTheme,
} from "@/lib/testingRoomTheme";

export default function SettingsPage() {
    const { data: session, status, update } = useSession();
    const { theme: testingRoomTheme, setTheme: setTestingRoomTheme, hasHydrated: testingRoomThemeHydrated } = useTestingRoomTheme();

    const [mounted, setMounted] = useState(false);

    const [name, setName] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isPasswordSaving, setIsPasswordSaving] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState("");

    useEffect(() => {
        setMounted(true);
        if (session?.user?.name) {
            setName(session.user.name);
        }
    }, [session]);

    if (status === "loading" || !mounted) {
        return <Loading />;
    }

    if (status === "unauthenticated" || !session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-paper-bg border-t-4 border-ink-fg">
                <div className="workbook-panel p-8 text-ink-fg font-bold bg-surface-white">
                    Please log in to view settings.
                </div>
            </div>
        );
    }

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage("");

        try {
            const res = await api.put(API_PATHS.USER_SETTINGS, { name });

            if (res.status === 200) {
                setMessage("Profile updated successfully!");
                await update({ name });
            } else {
                setMessage(`Error: ${res.data.error || "Failed to update profile"}`);
            }
        } catch (err: unknown) {
            console.error(err);
            const error = err as { response?: { data?: { error?: string } } };
            setMessage(`Error: ${error.response?.data?.error || "Network error. Could not update profile."}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setPasswordMessage("Error: New passwords do not match");
            return;
        }

        if (newPassword.length < 6) {
            setPasswordMessage("Error: New password must be at least 6 characters");
            return;
        }

        setIsPasswordSaving(true);
        setPasswordMessage("");

        try {
            const res = await api.put(API_PATHS.USER_PASSWORD, { currentPassword, newPassword, confirmPassword });

            if (res.status === 200) {
                setPasswordMessage("Password updated successfully!");
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setPasswordMessage(`Error: ${res.data.error || "Failed to update password"}`);
            }
        } catch (err: unknown) {
            console.error(err);
            const error = err as { response?: { data?: { error?: string } } };
            setPasswordMessage(`Error: ${error.response?.data?.error || "Network error. Could not update password."}`);
        } finally {
            setIsPasswordSaving(false);
        }
    };

    const handleDeleteAccount = () => {
        const confirmed = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
        if (confirmed) {
            console.log("Delete account triggered");
        }
    };

    return (
        <div className="min-h-screen bg-paper-bg p-8 pb-24 duration-200">
            <div className="max-w-4xl mx-auto space-y-8">
                <section className="workbook-panel-muted overflow-hidden">
                    <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
                        <div className="workbook-sticker bg-primary text-ink-fg">Settings</div>
                        <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg">Tune your workbook account.</h1>
                    </div>
                </section>

                <div className="workbook-panel overflow-hidden">
                    <div className="p-5 border-b-4 border-ink-fg bg-paper-bg flex items-center gap-2 text-ink-fg font-bold">
                        <MonitorPlay className="w-5 h-5 text-accent-2" />
                        Testing Room Theme
                    </div>

                    <div className="p-6 space-y-5">
                        <div className="max-w-3xl">
                            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-fg">Room Style</p>
                            <p className="mt-2 text-sm leading-6 text-ink-fg/70">
                                Choose which exam room chrome you want during live tests. This preference is saved locally on this device.
                            </p>
                        </div>

                        <div className="-mx-1 overflow-x-auto pb-2 sm:mx-0 sm:overflow-visible">
                            <div className="flex gap-3 px-1 sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:px-0">
                                {listTestingRoomThemePresets().map(({ theme }) => {
                                    const isActive = testingRoomThemeHydrated && testingRoomTheme === theme;

                                    return (
                                        <ThemeOptionCard
                                            key={theme}
                                            theme={theme}
                                            isActive={isActive}
                                            onSelect={() => setTestingRoomTheme(theme)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="workbook-panel overflow-hidden">
                    <div className="p-5 border-b-4 border-ink-fg bg-paper-bg flex items-center gap-2 text-ink-fg font-bold">
                        <User className="w-5 h-5 text-accent-2" />
                        Profile Details
                    </div>

                    <form className="p-6 space-y-5" onSubmit={handleUpdateProfile}>
                        {message && (
                            <div
                                className={`p-4 rounded-2xl border-2 border-ink-fg font-medium text-sm flex items-center gap-2 ${message.includes("success")
                                    ? "bg-primary text-ink-fg"
                                    : "bg-accent-3 text-white"
                                     }`}
                            >
                                {message.includes("success") && <CheckCircle className="w-5 h-5" />}
                                {message}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-ink-fg mb-1 uppercase tracking-[0.16em]">
                                Display Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="What should we call you?"
                                className="workbook-input max-w-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-ink-fg mb-1 uppercase tracking-[0.16em]">
                                Email Address
                            </label>
                            <input
                                type="email"
                                disabled
                                value={session.user.email!}
                                className="workbook-input max-w-md cursor-not-allowed bg-paper-bg text-ink-fg/60"
                            />
                        </div>

                        <div className="pt-4 flex justify-start">
                            <button
                                type="submit"
                                disabled={isSaving || name === session.user.name}
                                className="workbook-button disabled:opacity-60"
                            >
                                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Profile"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="workbook-panel overflow-hidden">
                    <div className="p-5 border-b-4 border-ink-fg bg-paper-bg flex items-center gap-2 text-ink-fg font-bold">
                        <Lock className="w-5 h-5 text-accent-1" />
                        Security
                    </div>

                    <form className="p-6 space-y-5" onSubmit={handleUpdatePassword}>
                        {passwordMessage && (
                            <div
                                className={`p-4 rounded-2xl border-2 border-ink-fg font-medium text-sm flex items-center gap-2 ${passwordMessage.includes("success")
                                    ? "bg-primary text-ink-fg"
                                    : "bg-accent-3 text-white"
                                     }`}
                            >
                                {passwordMessage.includes("success") && <CheckCircle className="w-5 h-5" />}
                                {passwordMessage}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-semibold text-ink-fg mb-1 uppercase tracking-[0.16em]">
                                Current Password
                            </label>
                            <input
                                type="password"
                                required
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="workbook-input max-w-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-ink-fg mb-1 uppercase tracking-[0.16em]">
                                New Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="workbook-input max-w-md"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-ink-fg mb-1 uppercase tracking-[0.16em]">
                                Confirm New Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="workbook-input max-w-md"
                            />
                        </div>

                        <div className="pt-4 flex justify-start">
                            <button
                                type="submit"
                                disabled={isPasswordSaving || !currentPassword || !newPassword || !confirmPassword}
                                className="workbook-button workbook-button-ink disabled:opacity-60"
                            >
                                <Lock className="w-4 h-4" /> {isPasswordSaving ? "Updating..." : "Change Password"}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="workbook-panel overflow-hidden border-accent-3">
                    <div className="p-5 border-b-4 border-ink-fg bg-accent-3 flex items-center gap-2 text-white font-bold">
                        <TriangleAlert className="w-5 h-5" />
                        Danger Zone
                    </div>

                    <div className="p-6 flex flex-col gap-4">
                        <div>
                            <h2 className="text-base font-semibold text-ink-fg">Delete Account</h2>
                            <p className="mt-1 text-sm text-ink-fg/70">
                                Permanently remove your account and all associated access. This action cannot be undone.
                            </p>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={handleDeleteAccount}
                                className="workbook-button bg-accent-3 text-white"
                            >
                                Delete Account
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ThemeOptionCard({
    theme,
    isActive,
    onSelect,
}: {
    theme: TestingRoomTheme;
    isActive: boolean;
    onSelect: () => void;
}) {
    const preset = getTestingRoomThemePreset(theme);

    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-[min(20rem,calc(100vw-4.5rem))] min-w-[min(20rem,calc(100vw-4.5rem))] shrink-0 rounded-2xl border-2 p-4 text-left transition-all active:translate-x-0.5 active:translate-y-0.5 sm:w-auto sm:min-w-0 ${isActive
                ? "border-ink-fg bg-surface-white brutal-shadow"
                : "border-ink-fg bg-paper-bg hover:-translate-x-0.5 hover:-translate-y-0.5 hover:brutal-shadow-sm"
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <span className={`workbook-sticker ${preset.accentClass}`}>{preset.label}</span>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border-2 border-ink-fg bg-surface-white">
                <ThemeRoomPreview theme={theme} isActive={isActive} />
            </div>

            <p className="mt-3 text-[15px] font-semibold text-ink-fg">{preset.cardTitle}</p>
            <p className="mt-2 text-sm leading-6 text-ink-fg/75">{preset.description}</p>
        </button>
    );
}

function ThemeRoomPreview({ theme, isActive }: { theme: TestingRoomTheme; isActive: boolean }) {
    const previewTheme = getTestingRoomThemePreset(theme).preview;

    return (
        <div className={`relative p-2.5 ${previewTheme.canvasClass}`}>
            <div
                className={`overflow-hidden rounded-lg transition-opacity ${isActive ? "opacity-55" : "opacity-100"} ${previewTheme.frameClass}`}
            >
                <div
                    className={`flex items-center justify-between px-2.5 py-1.5 ${previewTheme.topBarClass}`}
                >
                    <div className={`h-2 w-20 rounded-full ${previewTheme.topBarAccentClass}`} />
                    <div className={`h-5 w-11 rounded-full ${previewTheme.topBarControlClass}`} />
                </div>

                <div className="flex h-18">
                    <div className={`w-[46%] p-2 ${previewTheme.leftPaneClass}`}>
                        <div className={`h-full rounded-md ${previewTheme.leftPaneCardClass}`} />
                    </div>
                    <div className="flex-1 space-y-1.5 p-2">
                        <div className={`h-2.5 w-16 rounded-full ${previewTheme.rightMetaClass}`} />
                        <div className="space-y-1.5">
                            <div className={`h-5 ${previewTheme.rightAnswerSelectedClass}`} />
                            <div className={`h-5 ${previewTheme.rightAnswerIdleClass}`} />
                            <div className={`h-5 ${previewTheme.rightAnswerIdleClass}`} />
                        </div>
                    </div>
                </div>
            </div>

            {isActive ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
                    <div className="-rotate-[16deg] rounded-full border-2 border-ink-fg bg-primary px-5 py-1.5 text-xs font-black uppercase tracking-[0.28em] text-ink-fg brutal-shadow-sm">
                        Active
                    </div>
                </div>
            ) : null}
        </div>
    );
}
