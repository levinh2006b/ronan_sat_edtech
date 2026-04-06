import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { sendEmail } from "@/lib/email";
import { createVerificationEmail } from "@/lib/emailTemplates";
import dbConnect from "@/lib/mongodb";
import ParentVerificationCode from "@/lib/models/ParentVerificationCode";
import User from "@/lib/models/User";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { generateNumericCode, hashToken, isValidEmail, normalizeEmail } from "@/lib/security";

const requestCodeSchema = z.object({
  studentEmail: z.string().trim().min(1),
});

function isStudentLikeRole(role: string | undefined): boolean {
  return !role || role === "STUDENT" || role === "user" || role === "admin";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const parsed = requestCodeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "studentEmail is required" }, { status: 400 });
    }

    const studentEmail = normalizeEmail(parsed.data.studentEmail);
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`parent-request-code:${ip}:${studentEmail}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many verification requests. Please try again later." },
        { status: 429 }
      );
    }

    if (!isValidEmail(studentEmail)) {
      return NextResponse.json({ error: "Please enter a valid student email" }, { status: 400 });
    }

    await dbConnect();

    const student = await User.findOne({ email: studentEmail });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const currentRole = student.role as unknown as string | undefined;
    if (!isStudentLikeRole(currentRole)) {
      return NextResponse.json({ error: "This account is not a student account" }, { status: 400 });
    }

    if (currentRole !== "STUDENT") {
      student.role = "STUDENT";
      await student.save();
    }

    const code = generateNumericCode(6);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await ParentVerificationCode.findOneAndUpdate(
      { studentEmail },
      {
        studentEmail,
        code: hashToken(code),
        expiresAt,
        attemptCount: 0,
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
      }
    );

    const emailContent = createVerificationEmail({
      heading: "Confirm your parent link request",
      intro:
        "A parent is trying to connect to this student account. Enter the code below on the verification screen to approve the link.",
      code,
      footer:
        "If you were not expecting this request, do not share the code with anyone and you can ignore this email.",
    });

    await sendEmail({
      to: studentEmail,
      subject: "Your parent verification code",
      ...emailContent,
    });

    return NextResponse.json(
      { message: "Verification code sent successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/parent/request-code error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
