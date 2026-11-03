# 01. Yêu cầu phần mềm — SRS rút gọn

## 1. Yêu cầu chức năng (Functional Requirements)

| ID | Yêu cầu | Vai trò | Độ ưu tiên | UC |
|---|---|---|---|---|
| FR-01 | Khách xem, tìm kiếm, lọc danh sách phim và xem chi tiết. | Guest+ | Must | UC-01 |
| FR-02 | Khách xem suất theo phim/ngày và sơ đồ ghế với trạng thái **hiệu lực**. | Guest+ | Must | UC-01 |
| FR-03 | Đăng ký customer, đăng nhập JWT và kiểm tra quyền. | Guest/Customer | Must | — |
| FR-04 | Admin quản lý phim, cụm rạp, phòng và ghế vật lý. | Admin | Must | UC-02 |
| FR-05 | Admin tạo/sửa suất chiếu và chống trùng phòng/thời gian dọn phòng. | Admin | Must | UC-02 |
| FR-06 | Customer tạo đơn `PENDING`, giữ 1–8 ghế trong 5 phút theo kiểu all-or-nothing. | Customer | Must | UC-03 |
| FR-07 | Ngăn giữ trùng ghế khi các requests chạy đồng thời. | System | Must | UC-03 |
| FR-08 | Customer thanh toán mô phỏng, retry khi FAILED, phát hành vé sau SUCCESS. | Customer | Must | UC-04 |
| FR-09 | Customer hủy booking PENDING của chính mình; không hủy CONFIRMED. | Customer | Must | UC-05 |
| FR-10 | Scheduler hết hạn PENDING và giải phóng ghế vẫn thuộc booking. | System | Must | UC-06 |
| FR-11 | Staff/Admin check-in vé theo mã duy nhất trong thời gian hợp lệ, tối đa một lần. | Staff/Admin | Must | UC-07 |
| FR-12 | Customer xem booking và mã vé của chính mình; Admin có truy cập hỗ trợ có kiểm soát. | Customer/Admin | Must | UC-08 |
| FR-13 | Admin xem doanh thu tổng hợp từ payments SUCCESS theo khoảng ngày. | Admin | Must | UC-09 |
| FR-14 | Idempotency cho tạo booking và payment; trùng key khác payload phải bị từ chối. | System | Must | UC-03,04 |
| FR-15 | API lỗi có mã máy đọc được, xác thực dữ liệu, phân trang danh sách. | All | Must | All |
| FR-16 | Gửi thông báo, websocket ghế, quét QR bằng camera. | Various | Could | — |

`Guest+` = các vai trò cũng có thể xem dữ liệu public.

## 2. Ma trận phân quyền

| Chức năng | Guest | Customer | Staff | Admin |
|---|:---:|:---:|:---:|:---:|
| Tra cứu phim/suất/ghế | ✓ | ✓ | ✓ | ✓ |
| Tạo/hủy booking của mình | — | ✓ | — | — |
| Thanh toán mô phỏng của mình | — | ✓ | — | — |
| Xem lịch sử/vé của mình | — | ✓ | — | — |
| Check-in vé | — | — | ✓ | ✓ |
| Quản lý phim/phòng/ghế/suất | — | — | — | ✓ |
| Xem báo cáo | — | — | — | ✓ |

Admin truy cập đơn của khách để hỗ trợ phải có authorization + audit; không coi quyền Admin là quyền lấy JWT của người khác.

## 3. Yêu cầu phi chức năng (NFR)

| ID | Yêu cầu | Cách nghiệm thu |
|---|---|---|
| NFR-01 | Không bán trùng ghế ở cùng suất. | Chạy 20 yêu cầu giữ A1 đồng thời với MySQL thực. |
| NFR-02 | Multi-seat booking atomic. | Một ghế xung đột → không còn booking/hold nửa vời. |
| NFR-03 | GET danh sách có phân trang, giới hạn `size`. | Kiểm thử parameter validation. |
| NFR-04 | Error response nhất quán, không lộ stack trace/secret. | Test 400, 401, 403, 404, 409, 422. |
| NFR-05 | Có business logging và correlation ID cho yêu cầu quan trọng. | Kiểm tra log test/demo. |
| NFR-06 | Backup/restore DB thử nghiệm được. | Restore dữ liệu seed. |
| NFR-07 | UTC trong DB và timestamps offset-aware trong JSON. | Test hiển thị +07:00. |
| NFR-08 | Mục tiêu tham khảo: p95 các API đọc thông thường < 800 ms trên bộ dữ liệu demo, với môi trường/tải được ghi lại. | Benchmark nội bộ, không là cam kết production. |
| NFR-09 | Password hash, JWT validation, phân quyền/ownership, validation đầu vào. | Security/integration tests. |
| NFR-10 | DB migration có kiểm soát, không `ddl-auto=update` trong môi trường triển khai. | Review config và migration. |

## 4. Giới hạn và quy ước

- `bookings` luôn gắn một `showtime_id`; `seatIds` trong API là ID của `seats` thuộc phòng của showtime, **không** phải `showtime_seats.id`.
- Giá STANDARD = `showtimes.base_price`; VIP = `base_price + vip_surcharge`.
- Các loại giảm giá, bán combo, đa vé điện tử cho một ghế, hủy vé sau thanh toán là ngoài MVP.
- Sửa schema hoặc API phải cập nhật đồng thời các tài liệu và test liên quan.
