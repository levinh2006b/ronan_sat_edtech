// app/auth/forgot-password/page.tsx
"use client";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useSession } from "next-auth/react"; // Thêm dòng này để kiểm tra máy quét đăng nhập
import { useState, useEffect } from "react"; // Thêm useEffect

export default function ForgotPasswordPage() {
    const router = useRouter();
    const { data: session, status } = useSession(); // Lấy trạng thái xem đã đăng nhập chưa

    useEffect(() => {
            if (status === "authenticated") {
                router.push("/");
            }
        }, [status, router]);

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [message, setMessage] = useState("");

   
    // HIỆU ỨNG CHẶN CỬA: Nếu phát hiện đã đăng nhập (authenticated), lập tức đá về trang chủ ("/")
    useEffect(() => {
        if (status === "authenticated") {
            router.push("/");
        }
    }, [status, router]);


// TRÁNH LỘ GIAO DIỆN: Trong lúc 1 giây hệ thống đang load kiểm tra, không hiện HTML của trang này ra
    if (status === "loading" || status === "authenticated") {
        return null; 
    }


    

    const handleSendCode = async () => {
        try {
            setMessage("Đang gửi mã...");
            await axios.post("/api/auth/forgot-password", { email });
            setMessage("Mã đã được gửi đến Gmail của bạn!");
        } catch (error: any) {
            setMessage(error.response?.data?.message || "Lỗi khi gửi mã");
        }
    };

    const handleVerifyCode = () => {
        if (!code || code.length !== 6) {
            setMessage("Vui lòng nhập mã 6 số hợp lệ.");
            return;
        }
        // Nếu nhập mã thành công, chuyển hướng sang trang đặt lại mật khẩu và mang theo email + mã
        router.push(`/auth/reset-password?email=${email}&code=${code}`);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="max-w-md w-full p-8 bg-white rounded-xl border border-slate-100">
                <h1 className="text-2xl font-bold mb-4">Quên Mật Khẩu</h1>
                {message && <p className="mb-4 text-blue-600 text-sm">{message}</p>}
                
                <div className="mb-4 flex gap-2">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Nhập email của bạn"
                        className="flex-1 px-4 py-2 border rounded-lg"
                    />
                    <button onClick={handleSendCode} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        Gửi mã
                    </button>
                </div>

                <div className="mb-4">
                    <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Nhập mã 6 số từ Gmail"
                        className="w-full px-4 py-2 border rounded-lg"
                    />
                </div>

                <button onClick={handleVerifyCode} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
                    Tiếp tục
                </button>
            </div>
        </div>
    );
}