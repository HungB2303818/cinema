# 03. Use Case Specifications — UC-01 đến UC-09

**Ký hiệu:** `S` = luồng thành công, `E` = luồng ngoại lệ/nhánh. Mọi trạng thái ở đây phải tuân thủ [`02-BUSINESS-RULES.md`](02-BUSINESS-RULES.md).

## UC-01 — Tra cứu phim, suất chiếu, sơ đồ ghế

- **Actor:** Guest/Customer/Staff/Admin.
- **Điều kiện trước:** Không cần đăng nhập; dữ liệu danh mục đã được admin cấu hình.
- **Đầu vào:** Nhánh phim: movieId, date, cinemaId tùy chọn; nhánh rạp: cinemaId, date, phân trang nhóm phim; cả hai chọn showtimeId để xem ghế.
- **S — theo phim:** (1) GET danh sách phim có thể công bố; (2) chọn phim; (3) hệ thống trả các suất `SCHEDULED` phù hợp; (4) chọn suất; (5) API trả seatLabel, seatType và trạng thái hiệu lực `AVAILABLE/HELD/BOOKED`.
- **S — theo rạp (thiết kế bổ sung 05/11/2026):** (1) Xem danh mục rạp có ảnh; (2) bấm ảnh/tên rạp hoặc “Lịch chiếu”; (3) hệ thống lấy lịch rạp theo ngày Việt Nam mặc định/đã chọn, hiển thị ngay từng phim với tên, tuổi, poster và các nút giờ chiếu; (4) bấm giờ chiếu để tới `/showtimes/:showtimeId/seats`. Không yêu cầu chọn phim trước, không phải mở chi tiết phim mới thấy giờ chiếu. Đổi ngày/Back/refresh giữ đúng rạp/ngày/trang trong URL.
- **E:** Phim/suất không có hoặc ẩn → 404/không hiển thị; tham số ngày sai → 400; ghế HELD quá hạn có thể hiển thị AVAILABLE nhưng phải tranh chấp lại khi POST.
- **Hậu điều kiện:** Không thay đổi DB. Không trả `current_booking_id`, userId người giữ ghế hoặc mã vé.
- **Quy tắc:** BR-01,04,05,06,07,08; **API:** `GET /api/movies`, `GET /api/movies/{id}/showtimes`, `GET /api/showtimes/{id}/seats`; bổ sung `GET /api/cinemas/{id}/showtimes` theo contract mục 1.4 (chưa triển khai tại thời điểm cập nhật thiết kế).

## UC-02 — Quản lý suất chiếu

- **Actor:** Admin.
- **Điều kiện trước:** Admin authenticated; phim và phòng hợp lệ, phòng ACTIVE, có ghế ACTIVE.
- **Đầu vào:** movieId, roomId, startsAt, endsAt, cleanupMinutes, basePrice, vipSurcharge.
- **S:** (1) Validate thời gian, giá và độ dài phim theo chính sách; (2) bắt đầu transaction, khóa `rooms` theo `roomId`; (3) kiểm tra các interval `SCHEDULED` giao nhau bao gồm cleanup; (4) insert `showtimes`; (5) sinh `showtime_seats` cho mọi `seats.status=ACTIVE` trong phòng; (6) commit.
- **E:** Phòng MAINTENANCE hoặc không có ghế → 422; suất trùng → 409; thay đổi suất đã có booking gây ảnh hưởng → 409; concurrent create vào cùng phòng phải được serialize theo room lock.
- **Hậu điều kiện:** Một showtime với snapshot inventory hoàn chỉnh hoặc không có dữ liệu mới.
- **Quy tắc:** BR-01…05,19,20,21; **API:** `POST /api/admin/showtimes`, `PUT /api/admin/showtimes/{id}`.

## UC-03 — Tạo booking, giữ nhiều ghế

- **Actor:** Customer.
- **Điều kiện trước:** JWT customer hợp lệ; showtime SCHEDULED; `now < starts_at - 10 min`.
- **Đầu vào:** `showtimeId`, `seatIds` (1–8 số nguyên dương, không lặp), `clientRequestId` (unique theo user).
- **S:**
  1. Kiểm tra idempotency trước tiên: nếu key cũ và payload tương đương → trả booking cũ; nếu payload khác → 409.
  2. Bắt đầu transaction; validate showtime và phòng/ghế; xác định đồng hồ UTC.
  3. Tạo `bookings(PENDING)` với `expires_at=now+5m`.
  4. Truy vấn `showtime_seats` phù hợp và **khóa từng row theo ID tăng dần**; xác minh số lượng và phòng.
  5. Từ chối nếu một ghế BOOKED hoặc HELD còn hạn; HELD đã hết hạn được phép thay chủ.
  6. Cập nhật toàn bộ sang `HELD`, `current_booking_id = newBooking.id`, `hold_expires_at = expires_at`, version++.
  7. Tạo `booking_seats` với `unit_price` snapshot; tính tổng ở server và cập nhật `bookings.total_amount`; commit.
- **E:** Không đủ ghế, timeout/khóa xung đột → rollback toàn bộ, trả 409 hoặc lỗi có thể retry; lịch đã qua cutoff → 422; ghế thuộc phòng khác → 422; key trùng payload khác → 409.
- **Hậu điều kiện:** 1 booking PENDING có đủ ghế HELD **hoặc không có thay đổi**.
- **Quy tắc:** BR-05…11,14,15; **API:** `POST /api/bookings`; **Tests:** TC-01…05, TC-12, TC-17.

## UC-04 — Thanh toán mô phỏng, phát hành vé

- **Actor:** Customer (owner của booking).
- **Điều kiện trước:** Booking của user, trạng thái PENDING, `expires_at > now`, tất cả ghế HELD còn hiệu lực và thuộc đơn.
- **Đầu vào:** `bookingId`, `simulatedResult` = SUCCESS/FAILED, `idempotencyKey` unique toàn hệ thống.
- **S:** (1) kiểm tra key cũ/payload; (2) transaction, khóa booking row rồi ghế theo ID tăng; (3) validate thời hạn, quyền sở hữu, giá trị, ghế; (4) nếu FAILED, insert payment FAILED, booking vẫn PENDING; (5) nếu SUCCESS, insert payment SUCCESS; update toàn bộ ghế BOOKED, `hold_expires_at=NULL`; sinh `ticket_code` cho `booking_seats`; update booking CONFIRMED; commit; trả vé.
- **E:** Booking hết hạn → không ghi SUCCESS, không phát hành vé; không là owner → 403/404; thanh toán lặp key khác nội dung → 409; payment khác key sau CONFIRMED → trả trạng thái CONFIRMED hoặc 409 theo contract, **không thêm payment SUCCESS**.
- **Hậu điều kiện:** Đơn CONFIRMED với đúng 1 SUCCESS và mã vé đầy đủ, hoặc trạng thái ban đầu không bị xác nhận nhầm.
- **Quy tắc:** BR-12…15,17; **API:** `POST /api/bookings/{id}/payments/mock`.

## UC-05 — Customer hủy booking PENDING

- **Actor:** Customer owner.
- **Điều kiện trước:** Booking tồn tại và được phép truy cập.
- **S:** (1) khóa booking trong transaction; (2) nếu PENDING, khóa các row ghế theo ID tăng; (3) đổi booking `CANCELLED`; (4) với mỗi ghế `current_booking_id = bookingId` và `status = HELD`, cập nhật AVAILABLE + xóa owner/hạn; (5) commit.
- **E:** Đã CANCELLED → trả trạng thái hiện tại (idempotent); đã CONFIRMED → 409; đã EXPIRED → không hồi sinh; không owner → 403/404.
- **Hậu điều kiện:** Booking history còn nguyên; không giải phóng ghế đã được booking khác reclaim.
- **Quy tắc:** BR-15,16,19; **API:** `POST /api/bookings/{id}/cancel`.

## UC-06 — Cleanup booking hết hạn

- **Actor:** Scheduler; đề xuất mỗi 30–60 giây.
- **Điều kiện trước:** Có các booking `PENDING` với `expires_at <= now`.
- **S:** (1) query theo index `bookings(status,expires_at)` có batch limit; (2) xử lý mỗi booking trong transaction riêng; (3) khóa booking, xác thực còn PENDING và quá hạn; (4) khóa `showtime_seats` theo thứ tự; (5) chuyển booking EXPIRED; (6) chỉ giải phóng ghế vẫn HELD và `current_booking_id=bookingId`; commit.
- **E:** Đơn đã CONFIRMED/CANCELLED → bỏ qua; row đã được booking khác lấy → **không release**; lỗi job → retry an toàn, không làm state hỏng.
- **Hậu điều kiện:** Đơn hết hạn có state EXPIRED sau khi cleanup; tính hợp lệ của hold không phụ thuộc thời điểm job chạy.
- **Quy tắc:** BR-06,07,12,15; **Tests:** TC-05,07,18.

## UC-07 — Check-in vé

- **Actor:** Staff/Admin.
- **Điều kiện trước:** Auth hợp lệ, ticket có `ticket_code` chỉ được cấp khi booking CONFIRMED.
- **S:** (1) nhập/scan mã; (2) lấy `booking_seats` và booking/showtime; (3) xác thực booking CONFIRMED, showtime không CANCELLED; (4) kiểm tra `starts_at-30m <= now <= ends_at`; (5) insert `ticket_checkins` với staff id; (6) trả CHECKED_IN.
- **E:** Mã không tồn tại → 404; chưa/đã quá giờ → 422; vé đã check-in → 409; race check-in → UNIQUE DB ngăn duplicate.
- **Hậu điều kiện:** Tối đa 1 record check-in/vé.
- **Quy tắc:** BR-17,18,21; **API:** `POST /api/staff/tickets/check-in`.

## UC-08 — Lịch sử đặt vé

- **Actor:** Customer, Admin hỗ trợ.
- **S:** (1) xác thực user; (2) filter `bookings.user_id = authenticatedUserId`, hoặc Admin đã được ủy quyền; (3) paginate, join phim/suất/ghế; (4) chỉ hiển thị ticket code với CONFIRMED.
- **E:** Customer yêu cầu booking người khác → 403/404; không bao giờ leak thông tin thanh toán hoặc user khác.
- **Quy tắc:** BR-16,17,21; **API:** `GET /api/bookings/me`, `GET /api/bookings/{id}`, `GET /api/bookings/{id}/tickets`.

## UC-09 — Báo cáo doanh thu

- **Actor:** Admin.
- **S:** (1) chọn range UTC/khung ngày local được chuyển sang UTC; (2) query `payments.status=SUCCESS`, group theo `paid_at`, join showtime/phim/rạp nếu cần; (3) trả tổng tiền, tổng giao dịch và biểu đồ theo ngày.
- **E:** Không cộng INITIATED/FAILED; không lấy `bookings.total_amount` của PENDING làm doanh thu.
- **Quy tắc:** BR-22; **API:** `GET /api/admin/reports/revenue`.

## 10. Quy tắc chung về lỗi

- Validation request → 400; unauthenticated → 401; thiếu quyền → 403; không thấy/không được xem resource → 404; xung đột state hoặc uniqueness → 409; dữ liệu hợp lệ cú pháp nhưng không đáp ứng nghiệp vụ (cutoff/giờ check-in/phòng bảo trì) → 422.
- Trả error JSON thống nhất và **không** để lộ stacktrace, SQL, token, hash hoặc thông tin chủ sở hữu ghế.
- **Transaction failure** không để lại booking PENDING/`booking_seats` mồ côi.
