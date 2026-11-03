# 08. Test Plan, Acceptance Criteria & Traceability

**Mục tiêu:** mỗi business rule quan trọng đều có test tự động, đặc biệt idempotency, expiry, optimistic/pessimistic concurrency và auth. Integration tests chạy với **MySQL thật qua Testcontainers**, không dựa riêng H2 vì locking/ENUM/generated columns có thể khác.

## 1. Danh sách test case nghiệp vụ

| TC | Kịch bản | Kỳ vọng | BR | Loại test |
|---|---|---|---|---|
| TC-01 | Customer giữ một ghế AVAILABLE | Booking PENDING, ghế HELD, TTL 5 phút | 06,07 | Integration |
| TC-02 | Chọn ghế BOOKED | 409; không tạo booking mồ côi | 06 | Integration |
| TC-03 | 20 requests đồng thời giữ ghế A1 | **Chính xác 1 thành công**, 19 xung đột | 06,10 | Concurrency |
| TC-04 | Chọn 3 ghế, 1 ghế đang BOOKED | Toàn bộ rollback; 2 ghế kia vẫn AVAILABLE | 10 | Integration |
| TC-05 | B giành ghế HELD của A đã hết hạn, job A chạy sau | Owner=B; job A không release ghế B | 06,07,15 | Integration |
| TC-06 | Payment SUCCESS đúng hạn | Payment SUCCESS + CONFIRMED + BOOKED + tất cả mã vé | 12,14,17 | Integration |
| TC-07 | Payment ngay sau TTL, scheduler chưa chạy | Không SUCCESS, không mã vé | 12,15 | Integration |
| TC-08 | Payment cùng idempotency key gửi 10 lần | Một SUCCESS, không trùng tickets | 14 | Concurrency |
| TC-09 | Owner hủy PENDING | CANCELLED + release đúng ghế thuộc booking | 15,16 | Integration |
| TC-10 | Hủy CONFIRMED | 409; ghế vẫn BOOKED, payment không thay đổi | 16 | Integration |
| TC-11 | Hai admin tạo 2 showtimes trùng room/cleanup (cả concurrent) | Chỉ một showtime thành công | 02 | Integration |
| TC-12 | Giữ ghế thuộc phòng khác | 422; không ghi booking/hold | 05 | Integration |
| TC-13 | Staff check-in vé CONFIRMED trong thời gian | Một checkin record | 18,21 | Integration |
| TC-14 | Check-in lại cùng ticket (kể cả đồng thời) | Chỉ 1 checkin record; còn lại 409 | 18 | Concurrency |
| TC-15 | Customer đọc booking user khác | 404/403 nhất quán; không lộ dữ liệu | 16,21 | Security |
| TC-16 | Mock FAILED rồi SUCCESS trước hạn | FAILED attempt, vẫn PENDING; sau đó CONFIRMED | 13,14 | Integration |
| TC-17 | clientRequestId trùng: cùng/different payload | Cùng trả booking cũ; khác trả 409 | 09,14 | Integration |
| TC-18 | Scheduler chạy lặp hoặc đồng thời | Idempotent; không release ghế sai | 15 | Integration |
| TC-19 | Đặt sát cutoff 10 phút | `now < cutoff` cho phép; `now >= cutoff` từ chối | 08 | Unit + Integration |
| TC-20 | Giá VIP vs STANDARD, admin sửa giá sau booking | Snapshot unit_price không đổi | 11 | Integration |
| TC-21 | Check-in trước 30 phút hoặc sau ends_at | 422, không ghi check-in | 18 | Integration |
| TC-22 | Thanh toán khác key sau CONFIRMED | 409; duy nhất một SUCCESS | 14 | Integration |
| TC-23 | Admin sửa lịch khi có booking | 409; lịch và seat inventory không đổi | 19,20 | Integration |
| TC-24 | Revenue tổng hợp | Chỉ cộng payments.SUCCESS theo paid_at | 22 | Integration |
| TC-25 | Đăng ký tự chọn ADMIN qua JSON | Không thể tạo ADMIN | 21 | Security |
| TC-26 | Timezone và API UTC → Vietnam | JSON đúng UTC; hiển thị +07 đúng ngày | 07,08 | Unit + E2E |

**Lưu ý:** TC-17…TC-26 mở rộng so với 16 TC trong tài liệu Word gốc để rõ acceptance và lỗi AI thường mắc.

## 2. Fixture tối thiểu

- Một cinema ACTIVE, hai room ACTIVE; mỗi room 30–50 ghế STANDARD/VIP.
- 3 movies; ít nhất 4 showtime không trùng lịch.
- 1 ADMIN, 1 STAFF, 2 CUSTOMER; hash passwords (không commit tài khoản thật).
- Showtime A ngày 10/11/2026: `startsAt=2026-11-10T12:00:00Z`, `endsAt=2026-11-10T14:00:00Z`, `cleanup=15`, `basePrice=75000`, `vipSurcharge=20000`.
- Ghế A1, A2 STANDARD; B1 VIP; các ID sinh từ seed, **không hardcode ID trong tests**.

## 3. Concurrency test mẫu (đặc tả, không phải kết quả đã chạy)

```text
Given Showtime A và seat A1 đang AVAILABLE
When khởi động 20 threads cùng lúc bằng CountDownLatch
  mỗi thread dùng 1 user/clientRequestId khác nhau
  gọi createBooking(showtimeA, [A1]) qua Spring service/HTTP
Then tổng số booking create thành công = 1
  các request còn lại = 409 hoặc domain conflict
  showtime_seats(A1).current_booking_id trỏ tới booking duy nhất
  không tồn tại booking PENDING với thiếu booking_seats
```

**Test stack:** JUnit 5, Spring Boot Test, `@SpringBootTest`, Testcontainers MySQL, Awaitility (tùy chọn), ExecutorService/CountDownLatch. **Không dùng `@Transactional` bao ngoài test concurrency** khiến data visibility không phản ánh thực tế: thread khác không thấy dữ liệu uncommitted của test thread.

## 4. Ma trận traceability theo use case

| UC | BR chính | API chính | TC |
|---|---|---|---|
| UC-01 | 01,04,05,06 | GET movies/showtimes/seats | 12,19,26 |
| UC-02 | 01,02,03,04,05,19,20,21 | POST/PUT admin showtimes | 11,23 |
| UC-03 | 05,06,07,08,09,10,11,14 | POST bookings | 01,02,03,04,05,12,17,19,20 |
| UC-04 | 12,13,14,15,17 | POST payments/mock | 06,07,08,16,22 |
| UC-05 | 15,16 | POST cancel | 09,10 |
| UC-06 | 06,07,15 | Scheduled job | 05,07,18 |
| UC-07 | 17,18,21 | POST ticket check-in | 13,14,21 |
| UC-08 | 16,17,21 | GET bookings/me, {id}, tickets | 15 |
| UC-09 | 22 | GET revenue | 24 |

## 5. Definition of Done cho một use case

- [ ] Business logic phù hợp BR được trích rõ.
- [ ] DTO input validation; role + ownership đầy đủ.
- [ ] DB migration/repository/entity đúng schema.
- [ ] Nếu nhiều bảng thay đổi: transaction và rollback tests.
- [ ] Success, business errors và invalid auth có integration tests.
- [ ] Nếu có race/idempotency: Testcontainers concurrency test.
- [ ] Error JSON và HTTP status phù hợp API contract.
- [ ] Các thay đổi hợp đồng API/DB đã cập nhật trong Markdown.
- [ ] Chạy tests (hoặc báo rõ test chưa chạy, không suy đoán kết quả).

## 6. Kiểm thử thủ công trên demo

1. Browser A và B mở cùng showtime; A/B cùng bấm ghế A1.
2. A giữ thành công. B nhận thông báo ghế không còn khả dụng; UI B cập nhật.
3. A thanh toán FAILED; booking vẫn giữ và có thể retry trong TTL.
4. A retry với **key khác** để mô phỏng SUCCESS; nhận ticket code.
5. Staff check-in vé một lần; lần hai nhận 409.
6. Admin xem revenue; kiểm tra chỉ SUCCESS được tính.
7. Lặp với một booking khác để thời hạn 5 phút kết thúc; xác minh có thể giành ghế an toàn.
