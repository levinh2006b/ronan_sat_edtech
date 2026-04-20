import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const studentSchema = z.object({
  name: z.string().trim().min(2).max(100),
  school: z.string().trim().min(2).max(150),
  score: z.number().int().min(400).max(1600),
  examDate: z.string().trim().min(4).max(50),
  imageUrl: z.string().trim().url(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "8", 10)));
    const skip = (page - 1) * limit;
    const supabase = createSupabaseAdminClient();

    const { data: students, count, error } = await supabase
      .from("hall_of_fame_students")
      .select("id,name,school,score,exam_date,image_url", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(skip, skip + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      students: (students ?? []).map((student) => ({
        _id: student.id,
        name: student.name,
        school: student.school,
        score: student.score,
        examDate: student.exam_date,
        imageUrl: student.image_url,
      })),
      totalPages: Math.ceil((count ?? 0) / limit),
      currentPage: page,
    });
  } catch (error) {
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = studentSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid student payload" }, { status: 400 });
    }

    const supabase = createSupabaseAdminClient();
    const { data: newStudent, error } = await supabase
      .from("hall_of_fame_students")
      .insert({
        name: parsed.data.name,
        school: parsed.data.school,
        score: parsed.data.score,
        exam_date: parsed.data.examDate,
        image_url: parsed.data.imageUrl,
      })
      .select("id,name,school,score,exam_date,image_url")
      .single();

    if (error || !newStudent) {
      throw error ?? new Error("Failed to create student.");
    }

    return NextResponse.json(
      {
        message: "Student created successfully",
        student: {
          _id: newStudent.id,
          name: newStudent.name,
          school: newStudent.school,
          score: newStudent.score,
          examDate: newStudent.exam_date,
          imageUrl: newStudent.image_url,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/students error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
