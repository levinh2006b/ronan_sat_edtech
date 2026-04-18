"use client";

import { useRouter } from "next/navigation";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import AuthWorkbookShell from "@/components/auth/AuthWorkbookShell";
import Loading from "@/components/Loading";
import { getPostAuthRedirectPath } from "@/lib/getPostAuthRedirectPath";

type MessageTone = "success" | "error" | "info";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(getPostAuthRedirectPath(session?.user));
    }
  }, [router, session?.user, session?.user?.hasCompletedProfile, session?.user?.role, status]);

  if (status === "loading" || status === "authenticated") {
    return <Loading showQuote={false} />;
  }

  const handleSendCode = async () => {
    if (!email) {
      setMessageTone("error");
      setMessage("Enter your email first.");
      return;
    }

    setIsSending(true);
    setMessageTone("info");
    setMessage("Sending your verification code...");

    try {
      await axios.post("/api/auth/forgot-password", { email });
      setMessageTone("success");
      setMessage("A 6-digit code has been sent to your email.");
    } catch (error: unknown) {
      setMessageTone("error");
      setMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.message || "Unable to send the verification code."
          : "Unable to send the verification code."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = () => {
    if (!code || code.length !== 6) {
      setMessageTone("error");
      setMessage("Enter a valid 6-digit code.");
      return;
    }

    router.push(`/auth/reset-password?email=${encodeURIComponent(email)}&code=${code}`);
  };

  return (
    <AuthWorkbookShell
      badge="Password Reset"
      title="Recover your study flow without losing momentum."
      description="Request a short verification code, then move straight into a secure password reset."
      accentClass="bg-accent-3"
      notes={[
        "Codes are short-lived and meant for fast recovery.",
        "Use the same email you used to create your Ronan SAT account.",
      ]}
      cardTitle="Send your code"
      cardDescription="We will email a 6-digit verification code, then you can continue to the reset screen."
      backHref="/auth"
      backLabel="Back to sign in"
    >
      <InitialTabBootReady />
      {message ? (
        <div
          className={`mb-5 rounded-2xl border-2 border-ink-fg px-4 py-3 text-sm font-medium leading-6 ${
            messageTone === "error"
              ? "bg-accent-3 text-white"
              : messageTone === "success"
                ? "bg-primary text-ink-fg"
                : "bg-surface-white text-ink-fg"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
            Account Email
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="workbook-input flex-1"
              autoComplete="email"
            />
            <button
              onClick={handleSendCode}
              className="workbook-button whitespace-nowrap"
              disabled={isSending}
              type="button"
            >
              {isSending ? "Sending..." : "Send Code"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
            Verification Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="workbook-input"
          />
        </div>

        <button onClick={handleVerifyCode} className="workbook-button w-full" type="button">
          Continue to Reset
        </button>
      </div>
    </AuthWorkbookShell>
  );
}
