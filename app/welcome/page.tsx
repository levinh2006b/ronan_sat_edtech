"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { CheckCircle2, Cake, LoaderCircle, UserRound } from "lucide-react";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import { formatAppDateKey } from "@/lib/dateFormat";
import { getPostAuthRedirectPath } from "@/lib/getPostAuthRedirectPath";
import {
  USERNAME_REQUIREMENTS,
  isValidBirthDate,
  isValidUsername,
  normalizeUsername,
} from "@/lib/userProfile";

export default function WelcomePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [availabilityMessage, setAvailabilityMessage] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const deferredUsername = useDeferredValue(username);
  const normalizedUsername = useMemo(() => normalizeUsername(deferredUsername), [deferredUsername]);
  const sessionUser = session?.user;
  const hasCompletedProfile = sessionUser?.hasCompletedProfile;

  useEffect(() => {
    if (status === "authenticated" && hasCompletedProfile) {
      router.replace(getPostAuthRedirectPath(sessionUser));
    }
  }, [hasCompletedProfile, router, sessionUser, status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/auth");
    }
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    if (!normalizedUsername) {
      setAvailabilityMessage("");
      setIsUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    }

    if (!isValidUsername(normalizedUsername)) {
      setAvailabilityMessage(USERNAME_REQUIREMENTS);
      setIsUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    }

    const controller = new AbortController();
    const checkUsername = async () => {
      try {
        setIsUsernameAvailable(false);
        setIsCheckingUsername(true);

        const response = await api.get<{ isAvailable?: boolean; error?: string }>(
          API_PATHS.USER_USERNAME,
          {
            params: { value: normalizedUsername },
            signal: controller.signal,
          }
        );
        const payload = response.data;

        if (payload.isAvailable) {
          setAvailabilityMessage("Username is available.");
          setIsUsernameAvailable(true);
          return;
        }

        setAvailabilityMessage("That username is already taken.");
        setIsUsernameAvailable(false);
      } catch (error) {
        const requestError = error as {
          code?: string;
          name?: string;
          response?: { data?: { error?: string } };
        };

        if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") {
          setAvailabilityMessage(requestError.response?.data?.error || "Could not check username right now.");
          setIsUsernameAvailable(false);
        }
      } finally {
        setIsCheckingUsername(false);
      }
    };

    void checkUsername();

    return () => {
      controller.abort();
    };
  }, [normalizedUsername, status]);

  if (status !== "authenticated" || !session?.user) {
    return null;
  }

  const usernameIsValid = isValidUsername(normalizedUsername);
  const birthDateIsValid = isValidBirthDate(birthDate);
  const canSubmit = usernameIsValid && birthDateIsValid && !isSaving;

  const getSubmitErrorMessage = (error: unknown) => {
    const responseError = error as {
      message?: string;
      response?: {
        status?: number;
        data?: {
          error?: string;
          details?: string;
        };
      };
    };

    const serverError = responseError.response?.data?.error;
    const details = responseError.response?.data?.details;

    if (serverError && details) {
      return `${serverError} Details: ${details}`;
    }

    if (serverError) {
      return serverError;
    }

    if (responseError.message) {
      return responseError.message;
    }

    return "Could not save your welcome details.";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitMessage("");

    if (!isValidUsername(normalizedUsername)) {
      setSubmitMessage(USERNAME_REQUIREMENTS);
      return;
    }

    if (!birthDateIsValid) {
      setSubmitMessage("Enter a valid birthdate before continuing.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.put(API_PATHS.USER_ONBOARDING, {
        username: normalizedUsername,
        birthDate,
      });

      const nextUser = response.data.user as {
        username: string;
        birthDate: string;
        hasCompletedProfile: boolean;
      };

      try {
        await update({
          username: nextUser.username,
          birthDate: nextUser.birthDate,
          hasCompletedProfile: nextUser.hasCompletedProfile,
        });
      } catch (sessionError) {
        console.error("Welcome profile saved but session update failed", sessionError);
        setSubmitMessage("Profile saved, but session refresh failed. Refresh the page and continue.");
        return;
      }

      router.replace(
        getPostAuthRedirectPath({
          role: session.user.role,
          hasCompletedProfile: nextUser.hasCompletedProfile,
        })
      );
    } catch (error: unknown) {
      setSubmitMessage(getSubmitErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper-bg px-4 py-8 sm:px-6 lg:px-8">
      <InitialTabBootReady />
      <div className="mx-auto max-w-4xl">
        <section className="workbook-panel-muted overflow-hidden">
          <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
            <div className="workbook-sticker bg-primary text-ink-fg">Welcome</div>
            <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg md:text-5xl">
              Lock in your workbook identity.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">
              Choose a short username and add your birthdate once so your account is ready for the full workbook experience.
            </p>
          </div>

          <div className="grid gap-6 border-t-2 border-ink-fg bg-surface-white p-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(18rem,0.55fr)]">
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-ink-fg">Account</p>
                <p className="mt-2 text-lg font-bold text-ink-fg">{session.user.name || session.user.email || "Student"}</p>
                <p className="text-sm text-ink-fg/70">{session.user.email}</p>
              </div>

              {submitMessage ? (
                <div className="rounded-2xl border-2 border-ink-fg bg-accent-3 px-4 py-3 text-sm font-medium text-white">
                  {submitMessage}
                </div>
              ) : null}

              <div>
                <label className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
                  Username
                </label>
                <div className="relative max-w-md">
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value.toLowerCase())}
                    className="workbook-input pr-12"
                    placeholder="ronan_reader"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-fg/60">
                    {isCheckingUsername ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <UserRound className="h-5 w-5" />}
                  </div>
                </div>
                <p className={`mt-2 text-sm ${isUsernameAvailable ? "text-ink-fg" : "text-ink-fg/70"}`}>
                  {availabilityMessage || USERNAME_REQUIREMENTS}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
                  Birthdate
                </label>
                <div className="relative max-w-md">
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className="workbook-input pr-12"
                    max={formatAppDateKey()}
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-ink-fg/60">
                    <Cake className="h-5 w-5" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-ink-fg/70">This is locked after setup so student records stay consistent.</p>
              </div>

              <button type="submit" disabled={!canSubmit} className="workbook-button disabled:opacity-60">
                {isSaving ? "Saving..." : "Start My Workbook"}
              </button>
            </form>

            <aside className="rounded-3xl border-2 border-ink-fg bg-paper-bg p-5 brutal-shadow-sm">
              <div className="workbook-sticker bg-accent-2 text-white">One-time setup</div>
              <div className="mt-5 space-y-4 text-sm leading-6 text-ink-fg">
                <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4">
                  <p className="font-bold uppercase tracking-[0.14em]">Why username?</p>
                  <p className="mt-2">It gives you a short public identity for rankings and workbook features without exposing your email.</p>
                </div>
                <div className="rounded-2xl border-2 border-ink-fg bg-surface-white p-4">
                  <p className="font-bold uppercase tracking-[0.14em]">Why birthdate?</p>
                  <p className="mt-2">We collect it once during setup so every account has a complete profile before using the app.</p>
                </div>
                <div className="rounded-2xl border-2 border-ink-fg bg-primary p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <p className="font-medium">Once you save these details, settings will show them as locked profile details instead of editable account fields.</p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
