interface SkeletonProps {
    isSectional?: boolean;
}

export default function TestCardSkeleton({ isSectional = false }: SkeletonProps) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col h-full">
            <div className="p-5 flex-1">
                {/* Giả lập Tiêu đề bài test */}
                <div className="h-7 bg-slate-200 rounded-md animate-pulse w-3/4 mb-6"></div>
                
                {/* Giả lập phần thông số (Time, Questions) */}
                <div className="space-y-4 mt-4">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-100 rounded-full animate-pulse"></div>
                        <div className="h-4 bg-slate-100 rounded-md animate-pulse w-1/2"></div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-slate-100 rounded-full animate-pulse"></div>
                        <div className="h-4 bg-slate-100 rounded-md animate-pulse w-1/3"></div>
                    </div>
                </div>
            </div>

            {/* Giả lập phần nút bấm ở dưới cùng */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto space-y-3">
                {isSectional ? (
                    <>
                        {/* Hiện 2 thanh xám cho Module 1 và 2 */}
                        <div className="h-10 bg-slate-200 rounded-lg animate-pulse w-full"></div>
                        <div className="h-10 bg-slate-200 rounded-lg animate-pulse w-full"></div>
                    </>
                ) : (
                    /* Hiện 1 thanh xám cho Start Practice */
                    <div className="h-10 bg-slate-200 rounded-lg animate-pulse w-full"></div>
                )}
            </div>
        </div>
    );
}