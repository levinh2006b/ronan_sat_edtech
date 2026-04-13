"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";

import AuthWorkbookShell from "@/components/auth/AuthWorkbookShell";
import Loading from "@/components/Loading";

type ParentAuthView = "link" | "verify";

type ApiError = {
  error?: string;
  message?: string;
};

const messageClassName =
  "mb-5 rounded-2xl border-2 border-ink-fg px-4 py-3 text-sm font-medium leading-6";

export default function ParentAuthPage() {
  const router = useRouter();
  const { status } = useSession();

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
  }, [router, status]);

  if (status === "loading" || status === "authenticated") {
    return <Loading showQuote={false} />;
  }

  const getErrorMessage = async (response: Response): Promise<string> => {
    try {
      const data = (await response.json()) as ApiError;
      return data.error || data.message || "Something went wrong.";
    } catch {
      return "Something went wrong.";
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

  const handleRequestCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      setError("Unable to send the verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      setError("Unable to verify the code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
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
      setError("Unable to resend the verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWorkbookShell
      badge={view === "link" ? "Parent Access" : "Parent Verification"}
      title={
        view === "link"
          ? "Link your view to your student in two steps."
          : "Finish verification and open the parent workbook."
      }
      description={
        view === "link"
          ? "Enter your student’s email first. We’ll send a short verification code to the student inbox before parent access is created."
          : `A secure code was sent to ${studentEmail}. Enter it here with your parent login details to complete the link.`
      }
      accentClass={view === "link" ? "bg-accent-2" : "bg-accent-1"}
      notes={
        view === "link"
          ? [
              "Parents verify through the student email instead of creating access blindly.",
              "The flow mirrors password recovery so the handoff stays simple and secure.",
            ]
          : [
              "Codes expire quickly and should be used soon after sending.",
              "Once verification succeeds, you will be signed in immediately as the parent user.",
            ]
      }
      cardTitle={view === "link" ? "Request student code" : "Verify and create access"}
      cardDescription={
        view === "link"
          ? "Start with the student email."
          : "Confirm the code, then create the parent credentials in one step."
      }
      backHref="/auth"
      backLabel="Back to student sign in"
    >
      <div className="mb-5 rounded-2xl border-2 border-ink-fg bg-paper-bg px-4 py-4 text-sm font-medium leading-6 text-ink-fg">
        {view === "link"
          ? "Step 1: enter the student's email. Step 2: the student receives a 6-digit code. Step 3: use that code to finish parent access."
          : "For security, verification codes expire after a short window and are removed after too many incorrect attempts."}
      </div>

      {error ? (
        <div className={`${messageClassName} bg-accent-3 text-white`}>
          {error}
        </div>
      ) : null}

      {message ? (
        <div className={`${messageClassName} bg-primary text-ink-fg`}>
          {message}
        </div>
      ) : null}

      {view === "link" ? (
        <form onSubmit={handleRequestCode} className="space-y-5">
          <div>
            <label htmlFor="studentEmail" className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
              Student Email
            </label>
            <input
              id="studentEmail"
              type="email"
              value={studentEmail}
              onChange={(event) => setStudentEmail(event.target.value)}
              placeholder="student@example.com"
              required
              autoComplete="email"
              className="workbook-input"
            />
          </div>

          <button type="submit" disabled={loading} className="workbook-button w-full disabled:opacity-60">
            {loading ? "Sending..." : "Send 6-Digit Code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-5">
          <div>
            <label htmlFor="otpCode" className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
              Verification Code
            </label>
            <input
              id="otpCode"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              required
              className="workbook-input"
            />
          </div>

          <div>
            <label htmlFor="parentEmail" className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
              Parent Email
            </label>
            <input
              id="parentEmail"
              type="email"
              value={parentEmail}
              onChange={(event) => setParentEmail(event.target.value)}
              placeholder="parent@example.com"
              required
              autoComplete="email"
              className="workbook-input"
            />
          </div>

          <div>
            <label htmlFor="parentPassword" className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
              Parent Password
            </label>
            <input
              id="parentPassword"
              type="password"
              value={parentPassword}
              onChange={(event) => setParentPassword(event.target.value)}
              placeholder="Create your password"
              required
              autoComplete="new-password"
              className="workbook-input"
            />
          </div>

          <button type="submit" disabled={loading} className="workbook-button workbook-button-ink w-full disabled:opacity-60">
            {loading ? "Verifying..." : "Verify & Create Account"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleResendCode}
            className="workbook-button workbook-button-secondary w-full disabled:opacity-60"
          >
            Resend Code
          </button>
        </form>
      )}

      {view === "verify" ? (
        <div className="mt-6 border-t-2 border-ink-fg pt-5 text-center text-sm font-medium text-ink-fg">
          <button type="button" onClick={resetLinkFlow} className="underline decoration-2 underline-offset-4">
            Change student email
          </button>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                setView("link");
                setCode("");
                setError("");
                setMessage("");
              }}
              className="underline decoration-2 underline-offset-4"
            >
              Back one step
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-5 text-center text-sm text-ink-fg">
        <Link href="/auth" className="font-medium underline decoration-2 underline-offset-4">
          Back to Student Login
        </Link>
      </div>
    </AuthWorkbookShell>
  );
}
