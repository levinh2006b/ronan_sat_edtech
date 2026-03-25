// app/auth/reset-password/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { useEffect } from "react"; // Thêm useEffect
import { useSession } from "next-auth/react"; // Thêm dòng này để kiểm tra máy quét đăng nhập


function ResetPasswordForm() {
    const router = useRouter();

    const { data: session, status } = useSession(); // Lấy trạng thái xem đã đăng nhập chưa

    // HIỆU ỨNG CHẶN CỬA: Nếu phát hiện đã đăng nhập (authenticated), lập tức đá về trang chủ ("/")
    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);

    const searchParams = useSearchParams();
    const email = searchParams.get("email"); // Lấy email từ URL được truyền từ trang trước
    const code = searchParams.get("code");   // Lấy mã code từ URL được truyền từ trang trước

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");


    // TRÁNH LỘ GIAO DIỆN: Trong lúc 1 giây hệ thống đang load kiểm tra, không hiện HTML của trang này ra
    if (status === "loading" || status === "authenticated") {
        return null; 
    }

    const handleSubmit = async () => {
        if (newPassword !== confirmPassword) {
            setMessage("Mật khẩu không khớp!");
            return;
        }

        try {
            await axios.post("/api/auth/reset-password", { email, code, newPassword });
            setMessage("Đổi mật khẩu thành công! Đang chuyển hướng...");
            setTimeout(() => router.push("/auth"), 2000); // Chuyển về trang đăng nhập sau 2s
        } catch (error: any) {
            setMessage(error.response?.data?.message || "Lỗi khi đặt lại mật khẩu");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="max-w-md w-full p-8 bg-white rounded-xl border border-slate-100">
                <h1 className="text-2xl font-bold mb-4">Tạo Mật Khẩu Mới</h1>
                {message && <p className="mb-4 text-blue-600 text-sm">{message}</p>}

                <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới"
                    className="w-full mb-4 px-4 py-2 border rounded-lg"
                />
                
                <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Xác nhận mật khẩu mới"
                    className="w-full mb-4 px-4 py-2 border rounded-lg"
                />

                <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">
                    Cập nhật mật khẩu
                </button>
            </div>
        </div>
    );
}

// Bọc component trong Suspense vì Next.js yêu cầu khi dùng useSearchParams
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Đang tải...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}