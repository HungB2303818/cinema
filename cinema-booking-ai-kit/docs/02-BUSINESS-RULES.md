# 02. Business Rules — Nguồn sự thật nghiệp vụ

**Quy ước:** `now` = thời gian UTC nhất quán (ưu tiên đồng hồ DB cho điều kiện hết hạn); khoảng thời gian `[start, end)` có đầu gồm và cuối không gồm. BR ID ổn định, không tái sử dụng ID cho quy tắc khác.

## 1. Danh mục, rạp, suất chiếu

| Mã | Quy tắc bất biến | Thực thi / kiểm thử |
|---|---|---|
| BR-01 | Mỗi suất thuộc đúng một phim và một phòng. | `showtimes.movie_id`, `room_id` NOT NULL FK. |
| BR-02 | Hai suất cùng phòng không được trùng khoảng chiếm dụng `[starts_at, ends_at + cleanup_minutes)`. | Khóa row `rooms` trong transaction, kiểm tra overlap; TC-11. |
| BR-03 | Trong một phòng, vị trí ghế `(seat_row, seat_number)` là duy nhất. | `UNIQUE(room_id, seat_row, seat_number)`. |
| BR-04 | Mỗi cặp `(showtime_id, seat_id)` có đúng tối đa một bản ghi trạng thái. | `UNIQUE(showtime_id, seat_id)` và khởi tạo khi tạo suất. |
| BR-05 | Ghế chọn phải thuộc đúng phòng của suất và không ở `seats.status=MAINTENANCE`. | Validate liên bảng trong service, TC-12. |

**Overlap công thức:** `new.starts_at < existing.ends_at + existing.cleanup_minutes` **AND** `existing.starts_at < new.ends_at + new.cleanup_minutes`. Chỉ so với showtime `SCHEDULED`. Kiểm tra lại dưới khóa room trước insert.

## 2. Giữ ghế và tạo booking

| Mã | Quy tắc bất biến | Thực thi / kiểm thử |
|---|---|---|
| BR-06 | `AVAILABLE` hoặc `HELD` **đã hết hạn** có thể được giữ; `HELD` còn hạn và `BOOKED` không thể bị khách khác lấy. | MySQL row lock; TC-01/02/03/05. |
| BR-07 | Mỗi lần giữ kéo dài **5 phút**, tính từ lúc tạo booking và thống nhất UTC. | `bookings.expires_at`, `showtime_seats.hold_expires_at`; TC-01/05. |
| BR-08 | Không tạo giữ ghế mới nếu `now >= starts_at - 10 minutes`. | Validate khi POST; không chỉ ẩn nút ở frontend. |
| BR-09 | Một booking thuộc **một** showtime, chứa **1–8 ghế** (configurable cap). Không có ghế lặp trong request. | Validate request, đúng showtime. |
| BR-10 | Tạo booking nhiều ghế là **all-or-nothing**. | `@Transactional`, rollback khi một ghế không khả dụng; TC-04. |
| BR-11 | Giá tại thời điểm giữ được ghi `booking_seats.unit_price`; `bookings.total_amount` là tổng server tính. | Không tin giá từ client. |

**Inventory effective state:** Nếu `status=HELD` nhưng `hold_expires_at <= now`, API GET có thể hiển thị ghế như `AVAILABLE` về mặt đặt chỗ. Database record chỉ thực sự chuyển chủ trong một **giao dịch ghi được khóa**; frontend không được coi GET là cam kết giữ ghế.

## 3. Thanh toán và vòng đời đơn

| Mã | Quy tắc bất biến | Thực thi / kiểm thử |
|---|---|---|
| BR-12 | Chỉ `PENDING`, `expires_at > now`, và **mọi ghế** vẫn `HELD` bởi chính booking thì mới được `CONFIRMED`. | Lock booking + toàn bộ ghế, TC-06/07. |
| BR-13 | Payment mô phỏng `FAILED` **không** chuyển booking sang `FAILED`; đơn còn hạn vẫn `PENDING` để thử lại. | TC-16. |
| BR-14 | Một booking có **tối đa một** payment SUCCESS. Lặp idempotency key cùng payload trả kết quả cũ; key trùng khác payload trả 409. | UNIQUE generated col + business compare, TC-08. |
| BR-15 | Booking hết hạn không thể xác nhận; cleanup **chỉ giải phóng ghế mà `current_booking_id` vẫn là booking hết hạn**. | TC-05/07. |
| BR-16 | Customer chỉ hủy booking `PENDING` của mình; booking `CONFIRMED` không được hủy trong MVP. | TC-09/10/15. |
| BR-17 | Sau khi booking CONFIRMED, mỗi `booking_seats` có `ticket_code` ngẫu nhiên, không đoán được, duy nhất. | Nên dùng ≥128 bit entropy; DB UNIQUE. |

### Tập trạng thái chính thức

| Entity | Trạng thái | Nghĩa |
|---|---|---|
| `bookings` | `PENDING` | Đã giữ ghế, chờ thanh toán; nếu đã quá `expires_at` thì **hết hiệu lực** dù scheduler chưa cập nhật. |
| `bookings` | `CONFIRMED` | Payment SUCCESS, ghế BOOKED, mã vé đã phát hành. |
| `bookings` | `EXPIRED` | Không còn quyền thanh toán; giữ lịch sử. |
| `bookings` | `CANCELLED` | Customer hủy trước thanh toán; giữ lịch sử. |
| `bookings` | `FAILED` | Lỗi nghiệp vụ không thể phục hồi, không dùng cho một lần payment thất bại. |
| `showtime_seats` | `AVAILABLE` | `current_booking_id=NULL`, `hold_expires_at=NULL`. |
| `showtime_seats` | `HELD` | `current_booking_id!=NULL`, `hold_expires_at!=NULL`. |
| `showtime_seats` | `BOOKED` | `current_booking_id!=NULL`, `hold_expires_at=NULL`. |
| `payments` | `INITIATED/FAILED/SUCCESS` | Lần thử thanh toán; một booking có thể có nhiều FAILED nhưng tối đa một SUCCESS. |

### Chuyển trạng thái được phép

- `Booking`: `PENDING → CONFIRMED | EXPIRED | CANCELLED | FAILED`; trạng thái kết thúc không chuyển lại `PENDING`.
- `ShowtimeSeat`: `AVAILABLE → HELD`; `HELD → BOOKED | AVAILABLE`; `HELD(expired) → HELD(new booking)`; **không** `BOOKED → AVAILABLE` trong MVP.
- `Payment`: `INITIATED → SUCCESS | FAILED` nếu mô hình lưu trạng thái trung gian; khi trả kết quả tức thì có thể ghi terminal status ngay. Không ghi SUCCESS rồi đổi FAILED.
- Idempotency của `POST /bookings`: `UNIQUE(user_id, client_request_id)`; API yêu cầu key nonblank dù DB cho phép NULL. Service cần so sánh **showtimeId + tập seatIds chuẩn hóa** để phát hiện key khác payload.

## 4. Vé, bảo mật, báo cáo

| Mã | Quy tắc bất biến | Thực thi / kiểm thử |
|---|---|---|
| BR-18 | Mỗi vé check-in tối đa 1 lần, từ `starts_at - 30 phút` đến `ends_at` (bao gồm hai mốc), và không thuộc showtime bị hủy. | `UNIQUE(ticket_checkins.booking_seat_id)`; TC-13/14. |
| BR-19 | Không xóa vật lý dữ liệu có giao dịch; vô hiệu hóa hoặc đổi trạng thái. | Soft status, FK RESTRICT. |
| BR-20 | Không thay đổi cấu hình phòng/ghế/lịch chiếu nếu có thể ảnh hưởng booking hiện hữu. | Admin service validate dưới lock, lịch sử giữ nguyên. |
| BR-21 | Chỉ Admin tạo/sửa suất chiếu; Staff chỉ xử lý check-in (Admin có thể check-in). | Spring Security + method auth. |
| BR-22 | Doanh thu = tổng `payments.amount` với `payments.status=SUCCESS`, gộp theo `paid_at`, không cộng FAILED/INITIATED. | TC báo cáo. |

## 5. Những quy tắc dễ bị AI triển khai sai

1. **Không đặt `seats.status=BOOKED`.** Bảng `seats` chỉ có ACTIVE/MAINTENANCE.
2. Không `UNIQUE(showtime_seat_id)` trên `booking_seats`; mục đích bảng này là lịch sử các lần đặt.
3. Không dựa riêng vào scheduler để từ chối thanh toán quá hạn. Kiểm tra `expires_at > now` ngay trong transaction.
4. Không giải phóng ghế `current_booking_id` đã đổi chủ.
5. Không coi payment FAILED là booking FAILED.
6. Không lấy `price`, `role`, `userId` đáng tin từ request client.
7. Không cho check-in chỉ vì tồn tại ticket_code: kiểm tra CONFIRMED, showtime, thời gian, duplicate.
8. Không tạo showtime chỉ với `SELECT` kiểm tra overlap bên ngoài transaction; hai admin có thể race.

**Đối chiếu:** [`03-USE-CASES.md`](03-USE-CASES.md), [`08-TEST-PLAN.md`](08-TEST-PLAN.md).
