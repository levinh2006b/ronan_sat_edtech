// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";

export async function POST(req: Request) {
    try {
        const { email } = await req.json();
        await connectDB();

        const user = await User.findOne({ email });
        if (!user) {
            return NextResponse.json({ message: "Không tìm thấy người dùng với email này" }, { status: 404 });
        }

        // Tạo mã 6 chữ số ngẫu nhiên
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Lưu mã vào DB và cho hết hạn sau 15 phút
        user.resetPasswordToken = resetCode;
        user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        // Cấu hình người gửi email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Gửi email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Mã đặt lại mật khẩu của Ronan SAT",
            html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Yêu cầu đặt lại mật khẩu</h2>
            <p>Chào bạn,</p>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản SAT EdTech của bạn. Mã xác nhận của bạn là:</p>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
                ${resetCode}
            </div>
            <p style="color: #ef4444; font-size: 14px;">Mã này sẽ hết hạn trong vòng 15 phút.</p>
            <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
    `,
        });

        return NextResponse.json({ message: "Mã đã được gửi thành công!" }, { status: 200 });
    } catch (error) {
        console.log("CHI TIẾT LỖI GỬI EMAIL: ", error); // In lỗi ra terminal để đọc
        return NextResponse.json({ message: "Lỗi server khi gửi mail" }, { status: 500 });
    }
}