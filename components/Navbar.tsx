/**
 * Thanh điều hướng
 * Tàng hình nếu chưa login, đổi màu chữ của trang hiện tại trên NavBar (biết mình ở trang nào), là Admin thì hiện thêm nút riêng đến trang tạo đề
 */


"use client";

import Image from "next/image";
import logo from "@/assets/logo.png";
import { useSession, signOut } from "next-auth/react";   // signOut để signOut -> Hủy session đăng nhập, và điều hướng về trạng thái chưa đăng nhập
import Link from "next/link";
import { LogOut, Settings, BarChart2, Trophy, Target, BookOpen  } from "lucide-react";
import { usePathname } from "next/navigation";          // Công cụ để đọc url hiện tại -> Biết user ở trang nào -> Tô đậm ô đó  
import { LayoutGrid } from "lucide-react";


export default function Navbar() {
    const { data: session, status } = useSession();    // Lấy thông tin phiên đăng nhập
    const pathname = usePathname();                    // Cất cái đuôi của url hiện tại vd  web/edtech -> pathname = edtech

    if (pathname.startsWith("/auth")) {
            return null;
     }

    if (                                               // Các trường hợp cất navBar đi: chưa login or đang load or loadin (chưa check user xong) or đường link starts with "test" => Đang test or url = auth (đang đăng nhập)
        status === "loading" ||
        status === "unauthenticated" ||
        !session ||
        pathname.startsWith("/test/") ||
        pathname === "/auth"
    ) {
        return null;
    }

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="font-bold text-xl text-slate-900 hover:text-blue-600">
                                Ronan SAT           {/** Bấm vào Logo và tên thì đưa user về trang chủ */}
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        {session.user.role === "admin" && (         // Check if role = admin
                            <Link
                                href="/admin"                       // đưa về trang admin
                                className={`flex items-center gap-1 text-sm font-medium hover:text-blue-600 ${pathname === "/admin" ? "text-blue-600" : "text-slate-600"}`}
                            >
                                <Settings className="w-4 h-4" />
                                Admin
                            </Link>
                        )}




                        {/* Nút Full-length tests (Trang chủ hiện tại) */}
                        <Link
                            href="/"
                            className={`flex items-center gap-1 text-sm font-medium hover:text-blue-600 ${pathname === "/" ? "text-blue-600" : "text-slate-600"}`}
                        >
                            <BookOpen className="w-4 h-4" /> {/* Đừng quên import BookOpen từ lucide-react */}
                            Full-length tests
                        </Link>

                        {/* Nút Sectional tests (Trang mới) */}
                        <Link
                            href="/sectional"
                            className={`flex items-center gap-1 text-sm font-medium hover:text-blue-600 ${pathname === "/sectional" ? "text-blue-600" : "text-slate-600"}`}
                        >
                            <Target className="w-4 h-4" /> {/* Đừng quên import Target từ lucide-react */}
                            Sectional tests
                        </Link>

                        <Link
                            href="/review"                                                                             // Liên tục check trang hiện tại có phải review không để hiện màu đậm hơn => Các trang khác tương tự
                            className={`flex items-center gap-1 text-sm font-medium hover:text-blue-600 ${pathname === "/review" ? "text-blue-600" : "text-slate-600"}`}
                        >
                            <BarChart2 className="w-4 h-4" />
                            Review Mistakes
                        </Link>



                         <Link 
                            href="/hall-of-fame" 
                            className={`flex items-center gap-1 text-sm font-medium hover:text-blue-600 ${pathname === "/hall-of-fame" ? "text-blue-600" : "text-slate-600"}`}
                        >   
                           <Trophy className="w-4 h-4" />
                            Hall of Fame
                        </Link>



                        <Link
                            href="/settings"
                            className={`flex items-center gap-1 text-sm font-medium hover:text-blue-600 ${pathname === "/settings" ? "text-blue-600" : "text-slate-600"}`}
                        >
                            <Settings className="w-4 h-4" />
                            Settings
                        </Link>

                       

                        <div className="h-6 w-px bg-slate-200 mx-2" />

                        <span className="text-sm font-medium text-slate-700 hidden sm:block">  
                            Hi, {session.user.name || session.user.email?.split('@')[0]}         {/** Trên navBar có phần Hi + tên, nếu user chưa điền tên thì dùng email, cắt ở @ để chỉ lấy phần tên trước @ */}
                        </span>
                        <button
                            onClick={() => signOut({ callbackUrl: '/auth' })}   // của lda callbackUrl là / nhưng fix thành auth để đưa tới trang login
                            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Log out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
