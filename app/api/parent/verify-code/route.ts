import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authOptions } from "@/lib/authOptions";
import dbConnect from "@/lib/mongodb";
import ParentVerificationCode from "@/lib/models/ParentVerificationCode";
import User from "@/lib/models/User";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { hashToken, normalizeEmail, validatePasswordStrength } from "@/lib/security";

type SessionUserWithId = {
  id?: string;
};

const verifyCodeSchema = z.object({
  studentEmail: z.string().trim().min(1),
  code: z.string().trim().regex(/^\d{6}$/),
  parentEmail: z.string().trim().optional(),
  parentPassword: z.string().optional(),
});

function isStudentLikeRole(role: string | undefined): boolean {
  return !role || role === "STUDENT" || role === "user" || role === "admin";
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const parsed = verifyCodeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "studentEmail and code are required" }, { status: 400 });
    }

    const studentEmail = normalizeEmail(parsed.data.studentEmail);
    const code = parsed.data.code;
    const rawParentEmail = parsed.data.parentEmail?.trim();
    const parentPassword = parsed.data.parentPassword;
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`parent-verify-code:${ip}:${studentEmail}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        { status: 429 }
      );
    }

    await dbConnect();

    const otpDoc = await ParentVerificationCode.findOne({ studentEmail });

    if (!otpDoc) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    if (otpDoc.expiresAt.getTime() <= Date.now()) {
      await ParentVerificationCode.deleteOne({ _id: otpDoc._id });
      return NextResponse.json({ error: "Verification code has expired" }, { status: 400 });
    }

    if (otpDoc.code !== hashToken(code)) {
      otpDoc.attemptCount += 1;

      if (otpDoc.attemptCount >= 5) {
        await ParentVerificationCode.deleteOne({ _id: otpDoc._id });
        return NextResponse.json(
          { error: "Too many incorrect attempts. Please request a new code." },
          { status: 400 }
        );
      }

      await otpDoc.save();
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    const student = await User.findOne({ email: studentEmail });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const studentRole = student.role as unknown as string | undefined;
    if (!isStudentLikeRole(studentRole)) {
      return NextResponse.json({ error: "This account is not a student account" }, { status: 400 });
    }

    if (studentRole !== "STUDENT") {
      student.role = "STUDENT";
      await student.save();
    }

    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as SessionUserWithId | undefined;

    if (sessionUser?.id) {
      const currentUser = await User.findById(sessionUser.id).select("+password");

      if (!currentUser) {
        return NextResponse.json({ error: "Current user not found" }, { status: 404 });
      }

      const alreadyLinked = currentUser.childrenIds.some(
        (childId) => childId.toString() === student._id.toString()
      );

      if (!alreadyLinked) {
        currentUser.childrenIds.push(student._id);
      }

      if (!currentUser.role || currentUser.role === "STUDENT") {
        currentUser.role = "PARENT";
      }

      await currentUser.save();
    } else {
      if (!rawParentEmail || !parentPassword) {
        return NextResponse.json(
          { error: "parentEmail and parentPassword are required" },
          { status: 400 }
        );
      }

      const parentEmail = normalizeEmail(rawParentEmail);
      const passwordError = validatePasswordStrength(parentPassword);

      if (passwordError) {
        return NextResponse.json({ error: passwordError }, { status: 400 });
      }

      const existingParent = await User.findOne({ email: parentEmail });
      if (existingParent) {
        return NextResponse.json({ error: "Parent email already exists" }, { status: 409 });
      }

      const hashedPassword = await bcrypt.hash(parentPassword, 10);

      await User.create({
        email: parentEmail,
        password: hashedPassword,
        role: "PARENT",
        childrenIds: [student._id],
      });
    }

    await ParentVerificationCode.deleteOne({ _id: otpDoc._id });

    return NextResponse.json(
      { message: "Parent verification completed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/parent/verify-code error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
