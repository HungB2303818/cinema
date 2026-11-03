# 11. Architecture Decisions & Open Questions

Trang này phân biệt **quyết định đã khóa cho MVP** với **chủ đề chưa được xác định**. AI không được tự coi open question là yêu cầu mới.

## 1. Quyết định đã thống nhất (ADR)

| ADR | Quyết định | Lý do/hệ quả |
|---|---|---|
| ADR-001 | Modular Monolith, Spring Boot, một MySQL | MVP đủ chiều sâu, dễ demo/test, tránh hạ tầng microservices. |
| ADR-002 | MySQL InnoDB `showtime_seats` là source of truth | Hỗ trợ row-lock và ACID khi nhiều user đặt ghế đồng thời. |
| ADR-003 | Giữ ghế 5 phút; cutoff 10 phút trước suất | BR-07/08, phải enforce backend. |
| ADR-004 | Tạo multi-seat booking all-or-nothing | Không giữ một phần ghế làm khách hàng bối rối. |
| ADR-005 | Payment **mô phỏng** trong DB | Tập trung business flow; không đối soát cổng thật. |
| ADR-006 | Một SUCCESS/booking; idempotency create/pay | Tránh duplicate do retry/concurrency. |
| ADR-007 | Không hủy booking CONFIRMED/không hoàn tiền MVP | Giữ phạm vi phù hợp môn học. |
| ADR-008 | Giữ lịch sử expired/cancelled trong `booking_seats` | Audit/reports, không unique riêng trên inventory ID. |
| ADR-009 | Pessimistic locking, key constraints, service validation | Ngăn double-booking; chạy tests trên MySQL thực. |
| ADR-010 | Thời gian UTC khi lưu/xử lý, API ISO 8601 | Không nhầm timezone Việt Nam. |
| ADR-011 | Một booking thuộc một suất, 1–8 ghế | Giảm phức tạp giỏ hàng qua nhiều suất. |
| ADR-012 | Không xóa dữ liệu đã phát sinh giao dịch | Bảo toàn khóa ngoại, lịch sử và audit. |
| ADR-013 | HTTP 200 cho retry payment FAILED giả lập; 409 cho payment key mới sau CONFIRMED | Hợp đồng nhất quán, không tạo payment SUCCESS mới. |

## 2. Điểm dễ cần chốt khi viết code

| Mã | Vấn đề | Mặc định MVP được chọn | Khi nào cần bàn lại |
|---|---|---|---|
| GAP-01 | Thời điểm điều kiện `HELD` hết hạn | `hold_expires_at <= dbNow` coi là hết hiệu lực; so sánh UTC | Nếu DB/JVM có nguồn giờ khác nhau |
| GAP-02 | Hủy booking quá hạn nhưng scheduler chưa chạy | Không cho CANCELLED; trả `409 BOOKING_EXPIRED`, scheduler xử lý EXPIRED | Nếu muốn API đồng thời trigger expire |
| GAP-03 | Staff/Admin xem thông tin booking | Staff chỉ tra cứu vé phục vụ check-in; Admin xem hỗ trợ có audit | Nếu bổ sung màn hình quản lý đơn |
| GAP-04 | Cập nhật showtime đã có dữ liệu lịch sử | Không cho update lịch/phòng nếu đã có booking bất kỳ | Nếu thêm quản lý đổi suất/hoàn vé |
| GAP-05 | Payment SUCCESS retry với key mới | `409 BOOKING_STATE_CONFLICT` | Nếu muốn trả kết quả CONFIRMED idempotent theo booking |
| GAP-06 | Định dạng booking_code | Server-generated unique, ví dụ `BK0001001` | Khi cần quy tắc số chứng từ thực |
| GAP-07 | Giá tiền | Giá STANDARD + surcharge VIP snapshot; không tax/discount | Nếu thêm thuế/phí/khuyến mãi |
| GAP-08 | Thay đổi ghế maintenance sau khi đã tạo showtime | Chỉ cho thay đổi không ảnh hưởng booking/suất tương lai, hoặc cấm hoàn toàn trong MVP | Khi cần workflow ngừng ghế |
| GAP-09 | Lịch phim và cleanup | Admin cung cấp endsAt hợp lệ; cleanupMinutes default 15; validate thời lượng theo policy | Nếu tự tính từ runtime/trailer |
| GAP-10 | Token check-in | Random ≥128-bit; lưu chuỗi duy nhất; không chứa thông tin cá nhân | Nếu thêm QR/signature/hết hạn riêng |
| GAP-11 | Endpoint admin ngoài danh sách hiện tại | Chỉ yêu cầu minimum movie/room/showtime; `cinemas` seed một rạp | Nếu cần UI quản lý nhiều cụm |

## 3. Ngoài phạm vi — không tự thêm

Cổng thanh toán online, webhooks, hoàn tiền, đổi vé/đổi suất sau xác nhận, xử lý giá vé trẻ em/sinh viên, combo, loyalty, coupon, thuế và hóa đơn điện tử, tích hợp SMS/email, mobile native, Kafka, kiến trúc phân tán, triển khai high availability, redis giữ ghế là source of truth.

## 4. Cách thay đổi quyết định

Khi muốn thay một BR/ADR:

1. Mở issue trình bày **hiện trạng**, **đề xuất**, tác động đến DB/API/UI/concurrency.
2. Sửa `02-BUSINESS-RULES.md` và tài liệu liên quan; ghi ADR mới ở đây.
3. Tạo migration tương ứng nếu schema thay đổi, không chỉnh DB thủ công.
4. Bổ sung test cases xác nhận hành vi cũ/mới và traceability.
5. Chỉ triển khai khi những điểm không còn mơ hồ.
