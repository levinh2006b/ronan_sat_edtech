// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
    try {
        const { email, code, newPassword } = await req.json();
        await connectDB();

        const user = await User.findOne({
            email,
            resetPasswordToken: code,
            resetPasswordExpires: { $gt: Date.now() }, // Kiểm tra xem mã còn hạn (lớn hơn giờ hiện tại) không
        });

        if (!user) {
            return NextResponse.json({ message: "Mã không hợp lệ hoặc đã hết hạn" }, { status: 400 });
        }

        // Mã hóa (hash) mật khẩu mới
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Lưu mật khẩu mới và xóa mã OTP đi để không dùng lại được
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return NextResponse.json({ message: "Đổi mật khẩu thành công!" }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Lỗi hệ thống" }, { status: 500 });
    }
}