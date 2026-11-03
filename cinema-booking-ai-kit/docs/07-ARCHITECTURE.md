# 07. Kiến trúc Backend & hướng dẫn triển khai Spring Boot

## 1. Kiến trúc logic — Modular Monolith

```mermaid
flowchart LR
    FE[Vue 3 Web App] -->|HTTPS JSON + JWT| API[Spring Boot REST API]
    API --> AUTH[auth]
    API --> CAT[catalog / cinema / showtime]
    API --> BOOK[booking]
    API --> PAY[payment]
    API --> TICK[ticket]
    API --> REPORT[report]
    BOOK --> DB[(MySQL InnoDB)]
    PAY --> DB
    CAT --> DB
    TICK --> DB
    REPORT --> DB
    JOB[Scheduled Expiry Job] --> BOOK
```

Một Spring Boot app, một MySQL database. Tách theo **business feature** để có thể đổi công nghệ mà không phá vỡ nghiệp vụ. Không cần Kafka, Redis, microservices cho MVP.

## 2. Gợi ý package

```text
src/main/java/com/example/cinema/
  CinemaApplication.java
  auth/          controller/, service/, security/, dto/, entity/, repository/
  catalog/       controller/, service/, dto/, entity/, repository/   # movies
  cinema/        controller/, service/, dto/, entity/, repository/   # cinema, room, seat
  showtime/      controller/, service/, dto/, entity/, repository/
  booking/       controller/, service/, dto/, entity/, repository/, job/
  payment/       controller/, service/, dto/, entity/, repository/
  ticket/        controller/, service/, dto/, entity/, repository/
  report/        controller/, service/, dto/, repository/
  common/        error/, config/, time/, util/
src/main/resources/
  application.yml
  db/migration/V1__init_schema.sql
src/test/java/com/example/cinema/
  ... # unit + integration tests
```

`src/main/resources/db/migration/V1__init_schema.sql` cần được tạo từ file `database/cinema_booking_schema.sql` và hiệu chỉnh phần `CREATE DATABASE/USE` cho migration framework đang sử dụng; **không** tạo hai đường chạy schema độc lập trong môi trường thực tế.

## 3. Trách nhiệm module

| Module | Chức năng | Quy tắc chủ chốt |
|---|---|---|
| `auth` | Password hashing, JWT validation, principal, role | Không tin `userId`/`role` gửi từ client. |
| `catalog` | Quản lý phim | Soft status, không xóa lịch sử. |
| `cinema` | Cụm rạp/phòng/ghế vật lý | Physical seat status độc lập inventory. |
| `showtime` | Tạo/sửa lịch, initialize inventory | Lock room, reject overlap, không sửa suất có booking ảnh hưởng. |
| `booking` | Giữ ghế, cancel, expire, lịch sử | Bảo vệ atomicity, current_booking_id, TTL. |
| `payment` | Mock result, idempotency, confirm tickets | Một SUCCESS/booking; FAILED không làm FAILED booking. |
| `ticket` | Lấy vé, check-in | Random ticket code; one checkin per ticket. |
| `report` | Revenue/aggregate | Chỉ tính payments SUCCESS. |
| `common` | Error format, time, validation, logging | UTC & error codes thống nhất. |

## 4. Transaction boundaries

| Operation | Bao gồm trong transaction | Thứ tự khóa | Hậu điều kiện |
|---|---|---|---|
| Create showtime | Lock room; overlap query; insert showtime + inventory | `room` trước | Không trùng lịch, inventory đầy đủ. |
| Create booking | Insert PENDING; lock các showtime-seat; update HELD; insert booking_seats, total | New booking rồi `showtime_seats.id ASC` | All-or-nothing. |
| Pay SUCCESS | Lock booking; lock seats; validate TTL/owner; insert SUCCESS; issue tickets; update statuses | `booking` → `showtime_seats.id ASC` | Payment + vé + booking thống nhất. |
| Pay FAILED | Lock booking; verify TTL; insert FAILED | `booking` → ghế nếu cần validation | Booking tiếp tục PENDING. |
| Cancel | Lock booking; lock seats; update CANCELLED; conditional release | `booking` → `showtime_seats.id ASC` | Không release ghế mới đổi chủ. |
| Expire | Lock booking; lock seats; update EXPIRED; conditional release | `booking` → `showtime_seats.id ASC` | Idempotent, safe to retry. |
| Check-in | Validate ticket & booking/showtime; insert unique checkin | ticket/booking tùy thiết kế, không đảo thứ tự với payment | Tối đa một check-in. |

**Ràng buộc khó:** MySQL `REPEATABLE READ` là mặc định và một số query có thể nhận snapshot cũ. Những kiểm tra trạng thái cần sử dụng locking reads trong transaction. Service phải phân biệt entity state đã load trong JPA persistence context và giá trị thay đổi bởi native SQL.

## 5. Pseudocode quan trọng

### Create booking (UC-03)

```text
createBooking(principal, request):
  validate DTO (1-8 unique seat IDs, request ID)
  find existing idempotency request; if found compare normalized payload
  begin TX
    verify showtime SCHEDULED + now < startsAt - 10m
    create booking PENDING, expiresAt = dbNow + 5m
    resolve showtimeSeat IDs by (showtimeId, seatIds)
    validate all seats belong to room and physical seat ACTIVE
    for each showtimeSeatId in sorted ascending order:
      SELECT ... FOR UPDATE  # lock row
      if BOOKED OR (HELD AND expiresAt > dbNow): rollback + 409
      assign owner=newBookingId, status=HELD, holdExpiresAt=booking.expiresAt
    insert bookingSeats with BigDecimal price snapshots
    booking.totalAmount = sum(unitPrice)
  commit TX
  return 201
```

**Khi gặp `clientRequestId` đang được transaction khác tạo:** unique constraint có thể chặn request sau; sau khi conflict cần **đọc lại** booking hiện hữu (trong transaction/persistence context mới nếu cần), so sánh payload rồi trả kết quả ổn định. Không retry bằng cách tạo booking mới với key khác tự động.

### Confirm mock payment (UC-04)

```text
pay(owner, bookingId, result, key):
  check idempotency key (and compare owner + booking + simulated result)
  begin TX
    SELECT booking FOR UPDATE; validate owner
    lock referenced showtimeSeat rows in ascending order
    assert booking.status == PENDING
    assert dbNow < booking.expiresAt
    assert every requested seat HELD, owned by booking, and not expired
    if result == FAILED:
      insert FAILED payment; commit; return PENDING
    else:
      insert SUCCESS payment (DB prevents second SUCCESS)
      for each showtimeSeat: set BOOKED + null holdExpiresAt
      for each bookingSeat: create unique, CSPRNG ticketCode
      set booking CONFIRMED + confirmedAt
  commit TX
  return tickets
```

### Expire booking (UC-06)

```text
expire(bookingId):
  begin TX
    lock booking; if status != PENDING or expiresAt > dbNow: return
    lock booking's inventory rows ascending
    set booking EXPIRED
    for seat row:
      if status == HELD && currentBookingId == bookingId:
        set AVAILABLE + null currentBookingId + null holdExpiresAt
  commit TX
```

**Cảnh báo:** Nếu payment phát hiện hết hạn nhưng lập tức `throw` trong cùng transaction, trạng thái EXPIRED vừa set cũng bị rollback. Có thể để scheduler xử lý việc chuyển EXPIRED, hoặc thực thi `expire` ở transaction riêng đã được commit. Quy tắc BR-12 vẫn phải chặn payment ngay lập tức.

## 6. Row locking & concurrency

- Repository có thể dùng `@Lock(PESSIMISTIC_WRITE)` / `SELECT ... FOR UPDATE`; với nhiều ghế, khóa từng ID tăng dần để giảm deadlock.
- Không chỉ dùng `synchronized`, optimistic check tại browser, hoặc GET seat map làm bảo đảm.
- `UNIQUE(showtime_id,seat_id)` giữ mỗi ghế/suất một inventory row. `current_booking_id` xác định owner hiện tại.
- Đăng ký nhiều ghế: transaction rollback nếu bất kỳ ghế nào lỗi. Không commit từng ghế.
- Dự phòng deadlock (`SQLState 40001`, lock wait timeout): log, retry có giới hạn và chỉ cho operation idempotent; xác minh kết quả trước khi retry.
- `payments.successful_booking_id` generated UNIQUE bảo vệ payment thứ hai. Trùng idempotency key → đọc lại kết quả cũ hoặc 409 nếu payload khác.
- Khi cập nhật `showtimes`, phải phối hợp với booking creation để tránh thay lịch sau khi đã tạo booking. Chính sách MVP: **không cho sửa suất nếu đã có booking**, kiểm tra trong transaction và áp dụng cơ chế khóa thích hợp ở cả hai codepath.

## 7. Time & money

- DB: `DATETIME(3)` theo UTC; MySQL session timezone `+00:00`; ở API trả `Instant` hoặc `OffsetDateTime` với `Z`; frontend đổi sang Vietnam local time.
- Sử dụng `Clock` injectable ở service để unit test **nhưng** giao dịch đa instance cần có chuẩn thời gian DB; không trộn JVM local zone vào điều kiện SQL.
- Tiền: `BigDecimal`, scale 2, không `double`; VND có thể hiển thị không phần thập phân trong UI nhưng vẫn lưu DECIMAL(12,2).
- Cutoff và TTL: dùng **cùng nguồn giờ** khi tạo booking, kiểm tra seat hold và payment.

## 8. Security & audit

- JWT subject = ID/account claim đã được server xác thực; role server-generated, không đọc role từ request.
- Mật khẩu bcrypt/argon2; token/secret đặt trong env variables, không commit `.env` thật.
- Authorization: STAFF/ADMIN check-in, ADMIN CRUD lịch, CUSTOMER/owner create/pay/cancel.
- Mọi action ghi quan trọng (create booking, payment, cancel, check-in, admin schedule) có log gồm correlation ID, actorId, resourceId, outcome; không log thông tin tài khoản thanh toán hay token.
- API công khai chỉ hiển thị trạng thái ghế, không hiển thị chủ ghế.

## 9. Lời khuyên triển khai

Ưu tiên MySQL + Testcontainers trước; nếu phần concurrency chưa đúng, **không** chuyển sang thêm Redis/WebSocket. WebSocket sau này chỉ là cơ chế đồng bộ UI, không là nguồn xác nhận ghế còn trống.
