// Xử lý yêu cầu đổi tên từ FE
// lấy tên mới từ FE, kiểm tra có quyền k, mở DB để đổi tên -> Báo kết quả

    import { NextResponse } from "next/server";     // Thông báo kết quả
    import { getServerSession } from "next-auth";   // useSession là của FE còn getServerSession là của BE để bảo mật dữ liệu -> The latter bảo mật cao, không phải load vì chạy ngầm từ trước
    import { authOptions } from "@/lib/authOptions";
    import dbConnect from "@/lib/mongodb";
    import User from "@/lib/models/User";

    export async function PUT(req: Request) {    // Xử lý yêu cầu đổi tên => Use PUT
        try {
            const session = await getServerSession(authOptions);       // Lấy thông tin lần đăng nhập theo bản quy tắc của authOptions

            if (!session || !session.user || !session.user.email) {                   // Check tuần tự tới email xem đã login chưa
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); // Chưa login => Unauthorized
            }

            const body: unknown = await req.json();     // lấy request đc gửi từ FE đổi về JSON
            const name = typeof body === "object" && body !== null ? (body as { name?: unknown }).name : undefined;             // Lấy tên mới từ req từ FE

            if (!name || typeof name !== "string") {     // Nếu k tồn tại name hoặc sai định dạng => Báo lỗi luôn
                return NextResponse.json({ error: "Invalid name provided" }, { status: 400 });
            }

            await dbConnect();

            // Update the user's name
            const updatedUser = await User.findOneAndUpdate(    // findOneAndUpdate là hàm của MongoDB, tìm và update thông tin 
                { email: session.user.email },   // tìm user có email giống email của người đang đăng nhập, đây là bước find
                { name },                        // update name: name mới -> Bước update
                { new: true }                    // Mặc định thì MongoDB sẽ trả về thông tin cũ (trước khi update), dòng này bảo MongoDB trả về hồ sơ mới (sau khi updated)     
            );

            if (!updatedUser) {     // Nếu k tìm thấy user có email hiện tại
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            return NextResponse.json({ message: "Profile updated successfully", user: { name: updatedUser.name } }, { status: 200 });

        } catch (error: unknown) {
            console.error("PUT /api/user/settings error:", error);
            return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
        }
    }
