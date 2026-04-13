import http from 'k6/http';
import { sleep, check, group } from 'k6';

// 1. Cấu hình bài test
export const options = {
  // Giai đoạn test (Stages)
  stages: [
    { duration: '30s', target: 50 },  // 30s đầu: Tăng từ từ lên 50 người dùng
    { duration: '1m', target: 150 },  // 1 phút tiếp theo: Tăng sốc lên 150 người dùng cùng lúc
    { duration: '30s', target: 0 },   // 30s cuối: Giảm dần về 0 để server xả hơi
  ],
  // Tiêu chuẩn đậu/trượt (Thresholds)
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // 95% các yêu cầu phải phản hồi nhanh hơn 1 giây (1000ms)
    'http_req_failed': ['rate<0.01'],    // Tỉ lệ lỗi phải dưới 1%
  },
};

const BASE_URL = 'https://ronansatedtech.vercel.app';

// 2. Kịch bản người dùng (User Journey)
export default function stressTest() {
  
  // Hành động 1: Người dùng truy cập Trang chủ
  group('1. Truy cap Trang Chu', function () {
    const res = http.get(`${BASE_URL}/`);
    check(res, {
      'Trang chu tai thanh cong (status 200)': (r) => r.status === 200,
    });
  });

  // Nghỉ 2 giây: Giả lập thời gian người dùng thực tế đang đọc chữ trên trang chủ
  sleep(2); 

  // Hành động 2: Người dùng bấm sang xem Bảng xếp hạng (API nặng)
  group('2. Xem Bang Xep Hang', function () {
    const res = http.get(`${BASE_URL}/api/leaderboard`);
    check(res, {
      'Bang xep hang tai thanh cong (status 200)': (r) => r.status === 200,
    });
  });

  // Nghỉ 3 giây: Người dùng nán lại xem ai đang top 1
  sleep(3); 

  // Hành động 3: Người dùng bấm sang trang thi để lấy danh sách Test
  group('3. Xem Danh sach Bai Test', function () {
    const res = http.get(`${BASE_URL}/api/tests`);
    check(res, {
      'Danh sach bai test tai thanh cong (status 200)': (r) => r.status === 200,
    });
  });

  // Nghỉ 2 giây trước khi vòng lặp lặp lại (người dùng làm xong hoặc thoát)
  sleep(2); 
}
