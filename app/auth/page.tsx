// FE, trang hiển thị form cho phép login và sign up

"use client";

import { signIn } from "next-auth/react";       // để kiểm tra email và pass
import { useRouter } from "next/navigation";    // Chuyển hướng routing
import api from "@/lib/axios";                  // gửi api từ FE tới BE
import { API_PATHS } from "@/lib/apiPaths";
import Link from "next/link";
import { useState, useEffect } from "react"; // Thêm useEffect
import { useSession } from "next-auth/react"; // Thêm dòng này để kiểm tra máy quét đăng nhập

export default function AuthPage() {
    const router = useRouter();                     // Máy routing
    const { data: session, status } = useSession(); // Lấy trạng thái xem đã đăng nhập chưa, nếu rồi thì đá về trang chủ
    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);



    const [isLogin, setIsLogin] = useState(true);   // Chế độ ban đầu là màn hình login, false thì chuyển sang sign up
    const [email, setEmail] = useState("");         // Quản lý ndung nhập ô email
    const [password, setPassword] = useState("");   // Quản lý ndung nhập ô pass
    const [name, setName] = useState("");           // Quản lý ndung nhập ô name
    const [error, setError] = useState("");         // Tbao lỗi
    const [loading, setLoading] = useState(false);  // Trạng thái loading để bật/tắt animation, mặc định là đang k load
    const [isError, setIsError] = useState(false); // Thêm dòng này: mặc định không phải lỗi


// TRÁNH LỘ GIAO DIỆN: Trong lúc 1 giây hệ thống đang load kiểm tra, không hiện HTML của trang này ra
    if (status === "loading" || status === "authenticated") {    
        return null; 
    }

    const handleSubmit = async (e: React.FormEvent) => {   // Khi ấn nút login/sign up
        e.preventDefault();
        setError("");            // reset thông báo lỗi trước cho sạch
        setIsError(true);        // reset lại mặc định là lỗi (chuẩn bị sẵn màu đỏ)
        setLoading(true);        // Hiển thị đang load và chặn k cho gửi nữa tránh yêu cầu rác

        try {
            if (isLogin) {     // Nếu bấm submit mà đang ở trang login
                const res = await signIn("credentials", {     // Dùng a bảo vệ signIn đi vào DB, tìm email và check pass có đúng không
                    email,
                    password,
                    redirect: false,                          // Mặc định khi NextAuth kiểm tra xong thì sẽ redirect sang trang khác => Disable tính năng đó
                });

                if (res?.error) {               // Nếu res có tồn tại (để tránh xập) và có error thì báo error
                    setIsError(true);
                    setError(res.error);
                } else {
                    router.push("/");    // Nếu k có lỗi thì route user về trang chủ
                    router.refresh();    // Ấn refresh: Báo server không dùng bản nháp (chứa thông tin trang login) nữa mà F5 tải lại thông tin của trang chủ
                }
            } else {     // Tức là đang ở trang sign up
                const res = await api.post(API_PATHS.AUTH_REGISTER, { email, password, name });   // Lấy các thông tin email pass name để gửi 1 yêu cầu post về BE, mất tgian nên await
                // Ở đây dùng api nên yêu cầu được gửi tới file api để lưu vào DB luôn ở dòng này
                
                //Nếu BE bảo kết quả thành công thì tự động route về trang chủ luôn, k cần điền lại ở Login
                if (res.status === 200) {
                    setIsError(false);  // Báo rằng đây KHÔNG PHẢI lỗi (để hiển thị nền xanh)
                    setError("Register successfully! Redirecting..."); // Set thông báo thành công
                    await signIn("credentials", { email, password, redirect: false });
                    router.push("/");
                    router.refresh();
                } else {        // BE báo lỗi
                    setIsError(true);
                    setError(res.data.message || "Registration failed");
                }
            }
        } catch (err: any) {    
            setIsError(true);
            setError(err.response?.data?.message || err.response?.data?.error || "An unexpected error occurred");
        } finally {     // Tắt animation lỗi và trả lại function cho nút gửi
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="max-w-md w-full p-8 bg-white rounded-xl border border-slate-100">
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
                    <div className={`mb-4 p-3 rounded-lg text-sm ${isError ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
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
                                value={name}  // value quyết định ô nhập liệu hiển thị gì ra màn hình
                                onChange={(e) => setName(e.target.value)}    // Quản lý việc điền name vào ô nhập email
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
                            value={email}                                  // Hiện những gì user đang type ra ô email   
                            onChange={(e) => setEmail(e.target.value)}     // Quản lý việc điền email vào ô email
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
                            value={password}                                   // Hiện những gì user đang type ra ô pass 
                            onChange={(e) => setPassword(e.target.value)}      // Quản lý việc điền pass vào ô pass
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />

                        {isLogin && (
                            <div className="flex justify-end mt-1">
                                <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg duration-200 disabled:opacity-50"
                    >
                        {loading ? "Please wait..." : isLogin ? "Sign In" : "Register"}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                            setIsError(false); // Trả lại trạng thái bình thường khi đổi form
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
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