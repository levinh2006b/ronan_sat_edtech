"use client";

import { AxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSession, signIn } from "next-auth/react";
import { useSession } from "next-auth/react";

import InitialTabBootReady from "@/components/InitialTabBootReady";
import AuthWorkbookShell from "@/components/auth/AuthWorkbookShell";
import Loading from "@/components/Loading";
import { API_PATHS } from "@/lib/apiPaths";
import api from "@/lib/axios";
import { getPostAuthRedirectPath } from "@/lib/getPostAuthRedirectPath";

const FIELD_CLASS_NAME = "workbook-input";
const MESSAGE_CLASS_NAME =
  "mb-5 rounded-2xl border-2 border-ink-fg px-4 py-3 text-sm font-medium leading-6";

export default function AuthPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(getPostAuthRedirectPath(session?.user));
    }
  }, [router, session?.user, session?.user?.hasCompletedProfile, session?.user?.role, status]);

  if (status === "loading" || status === "authenticated") {
    return <Loading showQuote={false} />;
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setIsError(true);
          setMessage(result.error);
          return;
        }

        const nextSession = await getSession();
        if (!nextSession?.user) {
          setIsError(true);
          setMessage("Sign-in succeeded, but the session is still syncing. Please try again.");
          return;
        }

        router.replace(getPostAuthRedirectPath(nextSession.user));
        return;
      }

      const response = await api.post(API_PATHS.AUTH_REGISTER, { email, password, name });

      if (response.status >= 200 && response.status < 300) {
        setMessage("Account created. Redirecting into your workbook...");
        await signIn("credentials", { email, password, redirect: false });
        const nextSession = await getSession();
        if (!nextSession?.user) {
          setIsError(true);
          setMessage("Account created, but the session is still syncing. Please try signing in again.");
          return;
        }

        router.replace(getPostAuthRedirectPath(nextSession.user));
        return;
      }

      setIsError(true);
      setMessage(response.data.message || "Registration failed.");
    } catch (error: unknown) {
      setIsError(true);
      const axiosError = error as AxiosError<{ message?: string; error?: string }>;
      setMessage(
        axiosError.response?.data?.message ||
          axiosError.response?.data?.error ||
          "An unexpected error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWorkbookShell
      badge={isLogin ? "Student Sign-In" : "New Student Access"}
      title={isLogin ? "Step back into your workbook." : "Open a fresh score-building notebook."}
      description={
        isLogin
          ? "Jump straight into full-length tests, targeted review, and the vocab system without losing your place."
          : "Create your account to unlock timed practice, mistake analysis, and the SAT study flows that match the new workbook redesign."
      }
      accentClass={isLogin ? "bg-primary" : "bg-accent-1"}
      notes={
        isLogin
          ? []
          : [
              "Build a daily SAT rhythm with full-length, sectional, and vocab practice.",
              "Track your weak spots and turn every mistake into the next study target.",
            ]
      }
      cardTitle={isLogin ? "Welcome back" : "Create your account"}
      cardDescription={
        isLogin
          ? "Sign in to continue where you left off."
          : "Set up your profile and start the redesigned workbook experience."
      }
    >
      <InitialTabBootReady />
      {message ? (
        <div className={`${MESSAGE_CLASS_NAME} ${isError ? "bg-accent-3 text-white" : "bg-primary text-ink-fg"}`}>
          {message}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        {!isLogin ? (
          <div>
            <label className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={FIELD_CLASS_NAME}
              placeholder="Ronan Student"
            />
          </div>
        ) : null}

        <div>
          <label className="mb-2 block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={FIELD_CLASS_NAME}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="block text-sm font-bold uppercase tracking-[0.16em] text-ink-fg">
              Password
            </label>
            {isLogin ? (
              <Link href="/auth/forgot-password" className="text-sm font-medium underline decoration-2 underline-offset-4">
                Forgot password?
              </Link>
            ) : null}
          </div>
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={FIELD_CLASS_NAME}
            placeholder="Enter your password"
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
        </div>

        <button type="submit" disabled={loading} className="workbook-button w-full disabled:opacity-60">
          {loading ? "Please wait..." : isLogin ? "Enter Workbook" : "Create Account"}
        </button>
      </form>

      <div className="mt-4 grid gap-3">
        <Link href="/auth/parent" className="workbook-button workbook-button-secondary w-full justify-center">
          Open Parent Access
        </Link>

        <button
          onClick={() => signIn("google", { callbackUrl: "/auth/redirect" })}
          disabled={loading}
          className="workbook-button workbook-button-secondary w-full justify-center disabled:opacity-60"
          type="button"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>

      <div className="mt-6 border-t-2 border-ink-fg pt-5 text-center text-sm font-medium text-ink-fg">
        <button
          onClick={() => {
            setIsLogin((current) => !current);
            setMessage("");
            setIsError(false);
          }}
          className="underline decoration-2 underline-offset-4"
          type="button"
        >
          {isLogin ? "New here? Create one." : "Already enrolled? Sign in instead."}
        </button>
      </div>
    </AuthWorkbookShell>
  );
}
