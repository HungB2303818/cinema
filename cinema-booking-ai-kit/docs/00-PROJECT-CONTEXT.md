# 00. Project Context — Hệ thống đặt vé xem phim

**Document status:** MVP Specification v1.0 · **Ngày:** 2026-11-03

## 1. Vấn đề và mục tiêu

Khách hàng cần xem phim và suất chiếu, lựa chọn ghế, giữ ghế tạm thời, thanh toán giả lập rồi nhận vé điện tử. Rạp cần quản lý phim/phòng/suất, ngăn trùng lịch và trùng ghế, kiểm soát check-in, xem báo cáo.

**Tiêu chí thành công đặc trưng:** Hai khách đồng thời chọn cùng một ghế → chính xác một khách giữ được ghế; không thể sinh hai vé hợp lệ cho cùng ghế/suất.

## 2. Phạm vi MVP

**Bao gồm:** 1 cụm rạp (schema hỗ trợ nhiều cụm); nhiều phòng/ghế; phim/suất chiếu; đăng ký/đăng nhập; sơ đồ ghế; đặt 1–8 ghế; giữ 5 phút; thanh toán mô phỏng; phát hành mã vé; check-in; lịch sử; báo cáo doanh thu đơn giản; Docker + automated tests.

**Không bao gồm:** thanh toán ngoài hệ thống, hoàn tiền, hủy booking `CONFIRMED`, khuyến mãi/combo, tích điểm, thanh toán chia nhiều đợt, dynamic pricing, mobile native, microservices, hệ thống đa vùng, multi-tenancy. Redis/WebSocket là mở rộng, không được thay MySQL làm source of truth.

## 3. Actors

| Actor | Quyền cơ bản |
|---|---|
| Guest | Xem phim/lịch chiếu/sơ đồ ghế không có dữ liệu cá nhân. |
| Customer | Đăng ký, đăng nhập, tạo/hủy `PENDING` booking của mình, thanh toán mô phỏng, xem vé/lịch sử. |
| Staff | Tra cứu/check-in vé hợp lệ, không chỉnh sửa phim/phòng/suất chiếu. |
| Admin | Quản lý phim, rạp, phòng, ghế, suất chiếu, tài khoản, báo cáo; có thể check-in. |
| Scheduler | Đóng booking hết hạn và giải phóng ghế còn thuộc các booking đó. |

## 4. Thuật ngữ thiết yếu

| Thuật ngữ | Định nghĩa |
|---|---|
| `Cinema` | Một địa điểm/cụm rạp. |
| `Room` | Phòng chiếu trong một `Cinema`. |
| `Seat` | Ghế vật lý thuộc phòng; trạng thái vật lý là ACTIVE/MAINTENANCE. |
| `Showtime` | Một lần chiếu của một bộ phim tại một phòng, có giờ và giá. |
| `ShowtimeSeat` | Inventory của một ghế **trong một suất chiếu cụ thể**. |
| `Booking` | Đơn của customer cho đúng một showtime, có thể chứa nhiều ghế. |
| `BookingSeat` | Chi tiết ghế đã chọn và snapshot giá; thành vé khi booking CONFIRMED. |
| `Payment` | Một lần thử thanh toán giả lập; booking có thể có nhiều attempts. |
| `TicketCheckin` | Bằng chứng một vé đã được sử dụng một lần. |

## 5. Công nghệ và nguyên tắc

- Java Spring Boot, Spring Security + JWT, Spring Data JPA/Hibernate, MySQL 8.0.16+ InnoDB, React + Vite, Docker Compose.
- Tách module theo nghiệp vụ, không cần microservices.
- MySQL là **source of truth** cho inventory và payment; API công khai không trả mật khẩu hoặc chủ ghế đang giữ.
- Tất cả thời gian lưu/so sánh theo UTC; hiển thị giờ `Asia/Ho_Chi_Minh` (+07:00).
- Không tự ý nới phạm vi khi chưa hoàn thiện MVP và integration tests.

## 6. Thước đo nghiệm thu

1. Không có double-booking khi 20 requests đồng thời giữ cùng một ghế.
2. Nhiều ghế bị xung đột → toàn bộ transaction rollback.
3. Không xác nhận booking đã hết hạn, ngay cả khi cleanup chưa chạy.
4. Idempotency không tạo trùng booking/payment/ticket.
5. Check-in chỉ một lần; role/ownership được bảo vệ bằng Spring Security và business checks.
6. Schema khớp file `../database/cinema_booking_schema.sql` và áp dụng được trên MySQL 8.0.16+.

**Đường dẫn triển khai:** xem [`09-IMPLEMENTATION-PLAN.md`](09-IMPLEMENTATION-PLAN.md). Đặc tả chuẩn: [`02-BUSINESS-RULES.md`](02-BUSINESS-RULES.md).
