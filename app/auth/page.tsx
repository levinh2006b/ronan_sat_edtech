// FE, trang hiá»ƒn thá»‹ form cho phÃ©p login vÃ  sign up

"use client";

import { getSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AxiosError } from "axios";
import Loading from "@/components/Loading";

export default function AuthPage() {
    const router = useRouter();
    const { status } = useSession();

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/auth/redirect");
        }
    }, [router, status]);

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isError, setIsError] = useState(false);

    if (status === "loading" || status === "authenticated") {
        return <Loading showQuote={false} />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsError(true);
        setLoading(true);

        try {
            if (isLogin) {
                const res = await signIn("credentials", {
                    email,
                    password,
                    redirect: false,
                });

                if (res?.error) {
                    setIsError(true);
                    setError(res.error);
                } else {
                    const nextSession = await getSession();
                    if (!nextSession?.user) {
                        setIsError(true);
                        setError("Login succeeded but the session is still syncing. Please try again.");
                        return;
                    }

                    window.location.assign("/auth/redirect");
                }
            } else {
                const res = await api.post(API_PATHS.AUTH_REGISTER, { email, password, name });

                if (res.status >= 200 && res.status < 300) {
                    setIsError(false);
                    setError("Register successfully! Redirecting...");
                    await signIn("credentials", { email, password, redirect: false });
                    window.location.assign("/auth/redirect");
                } else {
                    setIsError(true);
                    setError(res.data.message || "Registration failed");
                }
            }
        } catch (err: unknown) {
            setIsError(true);
            const axiosError = err as AxiosError<{ message?: string; error?: string }>;
            setError(
                axiosError.response?.data?.message ||
                axiosError.response?.data?.error ||
                "An unexpected error occurred"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full p-8 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">
                        {isLogin ? "Welcome Back" : "Create Account"}
                    </h1>
                    <p className="text-slate-500 mt-2">
                        {isLogin
                            ? "Sign in to continue your SAT practice"
                            : "Start your journey to a higher score"}
                    </p>
                </div>

                {error && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                            placeholder="********"
                        />

                        {isLogin && (
                            <div className="flex justify-end mt-1">
                                <Link href="/auth/forgot-password" className="cursor-pointer text-sm text-blue-600 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Please wait..." : isLogin ? "Sign In" : "Register"}
                    </button>
                </form>

                <Link
                    href="/auth/parent"
                    className="mt-4 flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                    Create a Parent account
                </Link>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={() => signIn("google", { callbackUrl: "/auth/redirect" })}
                        disabled={loading}
                        className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                            setIsError(false);
                        }}
                        className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {isLogin
                            ? "Don't have an account? Sign up"
                            : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}
