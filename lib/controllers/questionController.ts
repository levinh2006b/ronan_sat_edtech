    // Tiếp nhận yêu cầu từ API rồi giao cho service xử lý
    // Trả về danh sách câu hỏi cho everyone yêu cầu
    // Cho phép admin tạo thêm câu hỏi mới


    import { NextResponse } from "next/server";
    import { getServerSession } from "next-auth";
    import { ZodError } from "zod";
    import { authOptions } from "@/lib/authOptions";
    import { questionService } from "@/lib/services/questionService";  // Công nhân được Controller giao việc

    export const questionController = {
        async getQuestions(req: Request) {  
            try {
                const { searchParams } = new URL(req.url);       // Tương tự chatController, nó lấy testId=123 trong url
                const testId = searchParams.get("testId");       // testId = 123 lấy từ searchParams

                const questions = await questionService.getQuestions(testId);   // Gọi service lấy mảng câu hỏi và gán vào questions
                return NextResponse.json(
                    { questions },
                    {
                        headers: {
                            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                            Pragma: "no-cache",
                            Expires: "0",
                        },
                    }
                );
            } catch (error: unknown) {
                return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch questions" }, { status: 500 });
            }
        },

        async createQuestion(req: Request) {
            try {
                const session = await getServerSession(authOptions);           // lấy session đăng nhập
                if (!session || session.user.role !== "ADMIN") {               // Nếu chưa đăng nhập hoặc role k phải admin => Error
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                }

                const body = await req.json();    // Dịch nội dung câu hỏi admin gửi lên thành JSON

                try {
                    const newQuestion = await questionService.createQuestion(body);            // Gửi nội dung câu dạng JSON đi
                    return NextResponse.json({ question: newQuestion }, { status: 201 });
                } catch (error: unknown) {
                    if (error instanceof ZodError) {                                           // Zod là thư hiện rà soát lỗi chính tả gắt gao, nếu thiếu thông tin required thì báo lỗi
                        return NextResponse.json({ error: error.issues }, { status: 400 });
                    }
                    if (error instanceof Error && error.message === "Test not found") {                 // Không tìm thấy bài thi cần bổ sung câu hỏi
                        return NextResponse.json({ error: "Test not found" }, { status: 404 });
                    }
                    throw error;
                }
            } catch (error: unknown) {
                console.error("POST /api/questions error:", error);   
                return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create question" }, { status: 500 });
            }
        }
    };
