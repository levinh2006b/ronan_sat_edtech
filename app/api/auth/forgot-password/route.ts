import { NextResponse } from "next/server";
import { z } from "zod";

import { sendEmail } from "@/lib/email";
import { createVerificationEmail } from "@/lib/emailTemplates";
import connectDB from "@/lib/mongodb";
import User from "@/lib/models/User";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { generateNumericCode, hashToken, isValidEmail, normalizeEmail } from "@/lib/security";

const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1),
});

const GENERIC_RESPONSE = {
  message: "If the account exists, a reset code has been sent.",
};

export async function POST(req: Request) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const email = normalizeEmail(parsed.data.email);
    const ip = getClientIp(req);
    const limitKey = `forgot-password:${ip}:${email}`;
    const rateLimit = checkRateLimit(limitKey, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json({ message: "Too many reset requests. Please try again later." }, { status: 429 });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    await connectDB();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
    }

    const resetCode = generateNumericCode(6);
    user.resetPasswordToken = hashToken(resetCode);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const emailContent = createVerificationEmail({
      heading: "Reset your password",
      intro: "We received a request to reset your password. Enter the code below to continue securely.",
      code: resetCode,
      footer: "If you did not request a password reset, you can safely ignore this email.",
    });

    await sendEmail({
      to: email,
      subject: "Password reset code",
      ...emailContent,
    });

    return NextResponse.json(GENERIC_RESPONSE, { status: 200 });
  } catch (error) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json({ message: "Server error while handling reset request" }, { status: 500 });
  }
}
