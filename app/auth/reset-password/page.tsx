"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useSession } from "next-auth/react";

import AuthWorkbookShell from "@/components/auth/AuthWorkbookShell";
import Loading from "@/components/Loading";

type MessageTone = "success" | "error";

function ResetPasswordForm() {
  const router = useRouter();
  const { status } = useSession();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const code = searchParams.get("code");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/auth/redirect");
    }
  }, [router, status]);

  if (status === "loading" || status === "authenticated") {
    return <Loading showQuote={false} />;
  }

  const handleSubmit = async () => {
    if (!email || !code) {
      setMessageTone("error");
      setMessage("This reset link is incomplete. Go back and request a new code.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessageTone("error");
      setMessage("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post("/api/auth/reset-password", { email, code, newPassword });
      setMessageTone("success");
      setMessage("Password updated. Redirecting you back to sign in...");
      window.setTimeout(() => router.push("/auth"), 2000);
    } catch (error: unknown) {
      setMessageTone("error");
      setMessage(
        axios.isAxiosError(error)
          ? error.response?.data?.message || "Unable to reset your password."
          : "Unable to reset your password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthWorkbookShell
      badge="New Password"
      title="Lock in a clean reset and get back to practice."
      description="Choose a new password, confirm it once, and step back into your SAT workflow."
      accentClass="bg-accent-2"
      notes={[
        "Use a password you will remember during busy study weeks.",
        "After reset, you will return to the main sign-in screen automatically.",
      ]}
      cardTitle="Set your new password"
      cardDescription="Finish the reset with a new password for this account."
      backHref="/auth/forgot-password"
      backLabel="Back to code request"
    >
      {message ? (
        <div
          className={`mb-5 rounded-2xl border-2 border-ink-fg px-4 py-3 text-sm font-medium leading-6 ${
            messageTone === "error" ? "bg-accent-3 text-white" : "bg-primary text-ink-fg"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="Create a new password"
            className="workbook-input"
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat your new password"
            className="workbook-input"
            autoComplete="new-password"
          />
        </div>

        <button onClick={handleSubmit} className="workbook-button w-full" disabled={isSubmitting} type="button">
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </div>
    </AuthWorkbookShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading showQuote={false} />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
