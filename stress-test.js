import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  // Giai đoạn test (Stages)
  stages: [
    { duration: '30s', target: 100 }, // 30 giây đầu: tăng dần từ 0 lên 100 người
    { duration: '1m', target: 300 },  // 1 phút tiếp theo: duy trì và tăng lên 300 người
    { duration: '30s', target: 0 },   // 30 giây cuối: giảm dần về 0 để hệ thống hồi phục
  ],
};

export default function () {
  // 1. Gửi yêu cầu GET đến trang web của bạn
  const res = http.get('https://ronansatedtech.vercel.app');
  // 2. Kiểm tra xem trang web có trả về mã 200 (Thành công) không
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  // 3. Mỗi người dùng ảo sẽ nghỉ 1 giây trước khi bấm tiếp (giống người thật)
  sleep(1);
}