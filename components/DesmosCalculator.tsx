"use client";   // Desmos cần tương tác user

import React, { useEffect, useRef, useState } from "react";     // useRef sử dụng khi chỉ muốn thay đổi thông tin của 1 component mà k làm cả giao diện web phải thay đổi như useState
import { X, Maximize2, Minimize2 } from "lucide-react";   // 3 icon để đóng, phóng to, thu nhỏ

interface DesmosCalculatorProps {    // Thông tin cần cung cấp cho máy tính Desmos
    isOpen: boolean;                 // Kiểm tra xem nó có đang đc mở ra k
    onClose: () => void;             // Hành động khi user ấn X
}

  // Desmos k có trong hệ thống Window -> Khi dùng desmos cần xin phép cho biến desmos
declare global {            // Thông báo Desmos dùng được cho mọi file, k chỉ file này
    interface Window {      // trình duyệt đã có interface Window chứa các thông tin cơ bản, khi viết vậy, nó chỉ thêm vào interface Window cũ
        Desmos: any;        // Desmos rất nhiều kiểu file, nếu k đặt any phải cấu hình chi tiết từng phần 1 => Rất mất tgian
    }
}

export default function DesmosCalculator({ isOpen, onClose }: DesmosCalculatorProps) {

    const desmosUrl = process.env.NEXT_PUBLIC_DESMOS_URL; 
    
    // Các bộ nhớ trạng thái 
    const calculatorRef = useRef<HTMLDivElement>(null);            // Đánh dấu vị trí trên trang web để đặt bộ máy Desmos vào        
    
    // Đã sửa thành useRef thay vì useState để tránh lỗi màn hình trắng tinh khi tắt/mở lại
    const calculatorInst = useRef<any>(null);       // Nhớ máy đã đc bật chưa, null là chưa bật còn khi bật thì truyền window.Desmos.GraphingCalculator(...) vào biến này => Dữ liệu phức tạp => Use any
    
    const [isExpanded, setIsExpanded] = useState(false);           // Nhớ xem đang phóng to full màn hình k

    const [position, setPosition] = useState({ x: 0, y: 0 });      // Nhớ tọa độ của góc trên cùng bên trái của window Desmos
    const [isDragging, setIsDragging] = useState(false);           // Công tắc check chuột có đang drag Desmos không
    const dragStart = useRef({ x: 0, y: 0, baseLeft: 0, baseTop: 0, width: 0 });
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isExpanded) return;
    if ((e.target as HTMLElement).closest('button')) return;
    
    setIsDragging(true);

    // 1. Tìm thẻ <div> chứa toàn bộ máy tính Desmos (là thẻ cha của thanh tiêu đề)
    const modalElement = (e.currentTarget as HTMLElement).parentElement;
    
    let baseLeft = 0;
    let baseTop = 0;
    let width = 0;

    // 2. Đo đạc kích thước và vị trí gốc
    if (modalElement) {
        // getBoundingClientRect() lấy tọa độ thực tế của cửa sổ trên màn hình lúc này
        const rect = modalElement.getBoundingClientRect();
        
        // Trừ đi position.x / position.y đang có để tìm ra vị trí "gốc" khi chưa bị kéo thả
        baseLeft = rect.left - position.x;
        baseTop = rect.top - position.y;
        width = rect.width; // Lấy chiều rộng hiện tại của cửa sổ
    }

    dragStart.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
        baseLeft: baseLeft,
        baseTop: baseTop,
        width: width
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
};

    //  update vị trí của window desmos liên tục khi user drag
    // e: thông tin sự kiện drag (vị trí mới của pointer)
    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isExpanded) return;

    // TÍNH TOÁN DỊCH CHUYỂN TƯƠNG ĐỐI
    let newX = e.clientX - dragStart.current.x;
    let newY = e.clientY - dragStart.current.y;

    // Lấy thông tin đã đo đạc ở hàm Down
    const { baseLeft, baseTop, width } = dragStart.current;

    // TÍNH TOÁN VỊ TRÍ THỰC TẾ TRÊN MÀN HÌNH (TUYỆT ĐỐI)
    const absoluteLeft = baseLeft + newX;
    const absoluteTop = baseTop + newY;

    // 1. CHẶN MÉP TRÁI: Không cho mép trái của cửa sổ nhỏ hơn tọa độ 0
    if (absoluteLeft < 0) {
        newX = -baseLeft; // Ép dừng ngay tại sát lề trái
    }

    // 2. CHẶN MÉP PHẢI: Mép trái (absoluteLeft) + Chiều rộng cửa sổ (width) không được lớn hơn chiều rộng màn hình (window.innerWidth)
    if (absoluteLeft + width > window.innerWidth) {
        newX = window.innerWidth - width - baseLeft; // Ép dừng ngay sát lề phải
    }

    // 3. CHẶN MÉP TRÊN: Không cho mép trên nhỏ hơn tọa độ 0
    if (absoluteTop < 0) {
        newY = -baseTop; // Ép dừng sát lề trên
    }

    // 4. CHẶN MÉP DƯỚI (MỚI): 
// - Footer của bạn cao 64px (h-16).
// - Thanh tiêu đề Desmos cao khoảng 40px.
// => Tổng cộng ta cần giữ cửa sổ cách mép dưới cùng của màn hình ít nhất 104px (64 + 40).
if (absoluteTop + 104 > window.innerHeight) {
    newY = window.innerHeight - 104 - baseTop; // Ép thanh tiêu đề dừng lại ngay sát trên mép của Footer
}

    // Cập nhật vị trí mới đã được lọc qua 4 bức tường chặn
    setPosition({ 
        x: newX, 
        y: newY 
    });
};

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;                                           // Hàm chỉ chạy nếu trước đó đang drag, nếu trước k drag thì 
        setIsDragging(false);                                              // Nhấc ngón tay => k drag nữa
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);      // Trước dùng setPointerCapture để trói chuột vào tiêu đề, bây giờ mở trói cho nó đi tự do
    };

    /*
    useEffect(() => {    // Chạy khi vừa mở cửa sổ lên và khi isOpen bị thay đổi
        if (!isOpen) return;    // Nếu desmos đang đóng => Dừng, k phí thời gian chạy máy tính ngầm

        const initCalculator = () => {   // Hàm khởi động Desmos
            if (window.Desmos && calculatorRef.current && !calculatorInst.current) {    // Điều kiện bắt buộc để khởi động lắp Desmos
                // window.Desmos, trình duyệt phải có Desmos
                // calculatorRef.current : trình duyệt phải có chỗ để đặt Desmos
                // !calculatorInst.current : chỉ khởi động khi chưa có Desmos nào được bật, tránh tạo ra 2 3 cái thừa
                calculatorInst.current = window.Desmos.GraphingCalculator (calculatorRef.current, {     // calculatorRef.current -> vị trí muốn đặt máy tính vào 
                    keypad: true,                       // cho phép các đặc tính của Desmos
                    expressions: true,
                    settingsMenu: true,
                    zoomButtons: true,
                    expressionsTopbar: true,
                    lockViewport: false,          // không lock => Cho phép user kéo chuột đi xung quanh đồ thị
                });
            }
        };

        const existingScript = document.getElementById("desmos-script");
        // document là đại diện trang web chứa tất cả các components
        // Tìm xem desmos script đã được tải về web chưa, để tránh tải đi tải lại nhiều lần phí tài nguyên

        if (existingScript) {    // Nếu chưa tải desmos thì tải về
            // Chỉnh sửa lại một chút: Đảm bảo mạng đã tải xong thật sự mới đúc máy tính
            if (window.Desmos) {
                initCalculator();
            } else {
                existingScript.addEventListener('load', initCalculator);
            }
        } else {
            // Load the script dynamically if it doesn't exist
            const script = document.createElement("script");    // Tạo ra 1 thẻ <script> trong document chuyên lấy code từ bên ngoài vào web  
            script.src = `${desmosUrl}`;  // Lấy từ api này
            script.id = "desmos-script";       // đặt id để lần sau gặp id này thì k tải lại Desmos vào web
            script.async = true;               // Cho phép async => Bất đồng bộ -> Tải web này trong lúc các thứ khác được chạy
            script.onload = () => {            // onload = khi tải xong
                initCalculator();              // Tải xong dữ liệu thì cấu hình đúc máy tính
            };
            document.body.appendChild(script);    // Các bước trên chỉ là viết yêu cầu, bước này mới thực sự gán máy tính vào body của trang web -> Ở bước này mới kết nối internet và tải
        }

        return () => {                // trong useEffect(), bất cứ thứ gì sau return được gọi là hàm dọn dẹp (Clean up func) -> Chạy khi bấm X hoặc tắt web
            if (calculatorInst.current) {    
                calculatorInst.current.destroy();       // Xóa hết các phương trình, thông tin, ... trả lại Ram tránh Desmos chạy ngầm
                calculatorInst.current = null;        // Xóa bộ nhớ về máy tính để lần sau mở thì tạo 1 Desmos mới
            }
            if (existingScript) {
                existingScript.removeEventListener('load', initCalculator);
            }
        };
    }, [isOpen]);   // Chỉ chạy khi isOpen bị thay đổi
*/


// Trong components/DesmosCalculator.tsx
useEffect(() => {
    if (!isOpen) return; // Nếu đang đóng thì không làm gì cả

    let checkInterval: NodeJS.Timeout; // Tạo một biến để hẹn giờ kiểm tra

    // Hàm thực hiện việc đúc máy tính
    const initCalculator = () => {
        // Kiểm tra xem bộ code Desmos đã tải ngầm xong chưa
        if (window.Desmos && calculatorRef.current && !calculatorInst.current) {
            calculatorInst.current = window.Desmos.GraphingCalculator(calculatorRef.current, {
                keypad: true,
                expressions: true,
                settingsMenu: true,
                zoomButtons: true,
                expressionsTopbar: true,
                lockViewport: false,
            });
            
            // Nếu đúc xong máy tính rồi thì xóa bỏ cái vòng lặp hẹn giờ đi
            if (checkInterval) clearInterval(checkInterval);
        }
    };

    // Kiểm tra và tải Script nếu chưa có
    const existingScript = document.getElementById("desmos-script");
    if (!existingScript && !window.Desmos) {
        const script = document.createElement("script");
        script.src = desmosUrl || "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
        script.id = "desmos-script";
        script.async = true;
        script.onload = () => {
            initCalculator();
        };
        document.body.appendChild(script);
    }

    // Bước 1: Vừa mở cửa sổ lên là cố gắng khởi động ngay lập tức
    if (window.Desmos) {
        initCalculator(); // Nếu mạng nhanh, tải xong rồi thì lắp luôn
    } else {
        // Bước 2: Nếu mạng chậm, Desmos chưa về kịp, ta thiết lập chế độ chờ
        // Cứ mỗi 500 mili-giây (nửa giây), hệ thống lại tự động gọi hàm initCalculator 1 lần
        checkInterval = setInterval(initCalculator, 500);
    }

    // Hàm dọn dẹp khi học sinh bấm nút X tắt cửa sổ
    return () => {
        // Tắt vòng lặp kiểm tra để đỡ tốn tài nguyên máy
        if (checkInterval) {
            clearInterval(checkInterval);
        }
        
        // Đập bỏ máy tính cũ
        if (calculatorInst.current) {
            calculatorInst.current.destroy();
            calculatorInst.current = null;
        }
    };
}, [isOpen, desmosUrl]);

    // Don't render anything if not open
    if (!isOpen) return null;   // Code dưới sẽ vẽ ra 1 khung cho window Desmos, dòng này chặn, nếu Desmos đang đóng/bị tắt thì không vẽ khung

    return (
        <div
            className={`fixed bg-white shadow-2xl rounded-lg border border-slate-300 z-50 flex flex-col ${!isDragging ? "transition-all duration-300 ease-in-out" : ""} ${isExpanded
                ? "top-16 left-0 right-0 bottom-16 w-full h-[calc(100vh-8rem)] rounded-none"
                : "top-20 right-6 w-[450px] h-[600px] sm:w-[500px]"
                }`}
            style={{
                transform: isExpanded ? 'none' : `translate(${position.x}px, ${position.y}px)`
            }}
        >
            {/* Header / Drag Handle area */}
            <div
                className="bg-slate-800 text-white p-2 rounded-t-lg flex justify-between items-center cursor-move select-none"
                onPointerDown={handlePointerDown}      //  Các lệnh onPointer xử lý hành động của pointer
                onPointerMove={handlePointerMove} 
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <span className="font-semibold text-sm pl-2">Desmos Graphing Calculator</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                        title={isExpanded ? "Restore size" : "Maximize"}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 hover:text-red-400 rounded transition-colors"
                        title="Close calculator"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Calculator Container */}
            <div
                ref={calculatorRef}
                className="flex-1 w-full rounded-b-lg overflow-hidden"
            >
                {/* Desmos will inject its DOM here */}
            </div>
        </div>
    );
}   