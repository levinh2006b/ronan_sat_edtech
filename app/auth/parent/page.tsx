"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Loading from "@/components/Loading";

type ParentAuthView = "link" | "verify";

type ApiError = {
  error?: string;
  message?: string;
};

export default function ParentAuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [view, setView] = useState<ParentAuthView>("link");
  const [studentEmail, setStudentEmail] = useState("");
  const [code, setCode] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPassword, setParentPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/auth/redirect");
    }
  }, [router, session?.user?.role, status]);

  if (status === "loading" || status === "authenticated") {
    return <Loading showQuote={false} />;
  }

  const getErrorMessage = async (response: Response): Promise<string> => {
    try {
      const data = (await response.json()) as ApiError;
      return data.error || data.message || "Something went wrong";
    } catch {
      return "Something went wrong";
    }
  };

  const resetLinkFlow = () => {
    setView("link");
    setStudentEmail("");
    setCode("");
    setParentEmail("");
    setParentPassword("");
    setError("");
    setMessage("");
  };

  const handleRequestCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/parent/request-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentEmail }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response));
        return;
      }

      setMessage(`A 6-digit verification code was sent to ${studentEmail}.`);
      setView("verify");
    } catch {
      setError("Unable to send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const verifyResponse = await fetch("/api/parent/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentEmail,
          code,
          parentEmail,
          parentPassword,
        }),
      });

      if (!verifyResponse.ok) {
        setError(await getErrorMessage(verifyResponse));
        return;
      }

      const signInResult = await signIn("credentials", {
        email: parentEmail,
        password: parentPassword,
        redirect: false,
      });

      if (signInResult?.error) {
        setError(signInResult.error);
        return;
      }

      window.location.assign("/auth/redirect");
    } catch {
      setError("Unable to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#dbeafe,_#f8fafc_40%,_#ffffff_75%)] px-4 py-12">
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[-8rem] top-[-6rem] h-56 w-56 rounded-full bg-sky-200/50 blur-3xl" />
        <div className="absolute bottom-[-7rem] right-[-6rem] h-72 w-72 rounded-full bg-cyan-100 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-2xl shadow-slate-200/60 backdrop-blur">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-100 text-xl font-bold text-sky-700">
              P
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {view === "link" ? "Parent Portal - Link to your Child" : "Enter Verification Code"}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {view === "link"
                ? "Enter your child's email and we'll send a secure 6-digit code to their Gmail, just like a password recovery flow."
                : `We sent a secure code to ${studentEmail}. Enter it below to verify and finish creating your parent access.`}
            </p>
          </div>
          <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 whitespace-pre-line">
            {view === "link"
              ? "Step 1: Parent enters the student's email. \nStep 2: Student receives a Gmail verification code.\nStep 3: Parent enters the code to complete the link."
              : "For security, the code expires after 15 minutes and is deleted after too many incorrect attempts."}
          </div>
          {error && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {view === "link" ? (
            <form onSubmit={handleRequestCode} className="space-y-5">
              <div>
                <label
                  htmlFor="studentEmail"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Student&apos;s Email
                </label>
                <input
                  id="studentEmail"
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-sky-600 px-4 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending..." : "Send 6-Digit Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div>
                <label htmlFor="otpCode" className="mb-2 block text-sm font-medium text-slate-700">
                  6-digit OTP Code
                </label>
                <input
                  id="otpCode"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  required
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="parentEmail"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Parent Email
                </label>
                <input
                  id="parentEmail"
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="parent@example.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <div>
                <label
                  htmlFor="parentPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Your Password
                </label>
                <input
                  id="parentPassword"
                  type="password"
                  value={parentPassword}
                  onChange={(e) => setParentPassword(e.target.value)}
                  placeholder="Create your password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={async () => {
                  setError("");
                  setMessage("");
                  setLoading(true);

                  try {
                    const response = await fetch("/api/parent/request-code", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({ studentEmail }),
                    });

                    if (!response.ok) {
                      setError(await getErrorMessage(response));
                      return;
                    }

                    setMessage(`A new verification code was sent to ${studentEmail}.`);
                  } catch {
                    setError("Unable to resend verification code. Please try again.");
                  } finally {
                    setLoading(false);
                  }
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resend Code
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-600">
            {view === "verify" ? (
              <button
                type="button"
                onClick={resetLinkFlow}
                className="font-medium text-sky-700 hover:text-sky-800 hover:underline"
              >
                Change student email
              </button>
            ) : null}
          </div>

          <div className="mt-4 text-center text-sm text-slate-600">
            {view === "verify" ? (
              <button
                type="button"
                onClick={() => {
                  setView("link");
                  setCode("");
                  setError("");
                }}
                className="font-medium text-slate-600 hover:text-slate-900 hover:underline"
              >
                Back
              </button>
            ) : null}
          </div>

          <div className="mt-4 text-center text-sm text-slate-600">
            <Link href="/auth" className="font-medium text-sky-700 hover:text-sky-800 hover:underline">
              Back to Student Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
