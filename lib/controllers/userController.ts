// Lấy stats của user

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { userService } from "@/lib/services/userService";

export const userController = {
    async getUserStats(req?: Request) {
        try {
            void req;
            // ktra đã đăng nhập chưa
            const session = await getServerSession(authOptions);
            if (!session) {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            // truyền vào id user và giao việc cho service
            const stats = await userService.getUserStats(session.user.id);
            return NextResponse.json(stats);
        } catch (error: unknown) {
            console.error("Error fetching user stats:", error);
            if (error instanceof Error && error.message === "User not found") {
                return NextResponse.json({ error: error.message }, { status: 404 });
            }
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    }
};
