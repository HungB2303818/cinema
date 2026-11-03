# Cinema Booking System — Backend (Spring Boot 3)

Hệ thống đặt vé xem phim Backend được phát triển bằng Java 17 và Spring Boot 3.3.5 theo kiến trúc **Modular Monolith** chuẩn hóa theo tài liệu thiết kế nghiệp vụ (`docs/`).

## 1. Yêu cầu môi trường

- **Java Development Kit (JDK):** Version 17+ (đã hỗ trợ chạy trên JDK 17 / JDK 22)
- **Maven:** Version 3.9+ (hoặc dùng `./mvnw` / `mvnw.cmd` đi kèm)
- **MySQL:** Version 8.0.16+ (InnoDB, UTF-8 `utf8mb4_unicode_ci`, time zone UTC)
- **Docker & Docker Compose:** Dùng để chạy MySQL container hóa (tuỳ chọn)

## 2. Cấu hình & Biến môi trường

Các biến môi trường được cấu hình trong file `.env` tại thư mục gốc:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=cinema_booking
DB_USERNAME=root
DB_PASSWORD=root

# Server
SERVER_PORT=8080

# JWT Security
JWT_SECRET=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
JWT_EXPIRATION_MS=86400000
```

## 3. Khởi chạy cơ sở dữ liệu

### Cách 1: Sử dụng MySQL cài trực tiếp trên máy
Nếu bạn đã có dịch vụ MySQL 8.0 đang chạy trên máy (mặc định cổng `3306`), tạo database nếu chưa có:
```sql
CREATE DATABASE IF NOT EXISTS cinema_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Cách 2: Sử dụng Docker Compose
Tại thư mục gốc dự án (`E:\Cinema`):
```bash
docker compose up -d mysql
```
*(Container sẽ ánh xạ sang cổng được định nghĩa trong `.env`, mặc định `3307` nếu cổng 3306 đang bị chiếm)*.

## 4. Quản lý Migration (Flyway)

Cơ sở dữ liệu được quản lý tự động bởi Flyway khi Spring Boot khởi động:
- `V1__init_schema.sql`: Khởi tạo 11 bảng chuẩn DDL (`users`, `movies`, `cinemas`, `rooms`, `seats`, `showtimes`, `bookings`, `showtime_seats`, `booking_seats`, `payments`, `ticket_checkins`).
- `V2__seed_test_data.sql`: Dữ liệu seed mẫu chuẩn gồm tài khoản Admin/Staff/Customer, rạp CGV Demo, 2 phòng chiếu, 80 ghế (Standard + VIP), và danh sách phim.

Mật khẩu mặc định cho các tài khoản seed: `Password@123`
- **Admin:** `admin@cinema.com`
- **Staff:** `staff@cinema.com`
- **Customer 1:** `customer1@cinema.com`
- **Customer 2:** `customer2@cinema.com`

## 5. Chạy ứng dụng

Di chuyển vào thư mục `backend`:
```bash
cd backend
./mvnw spring-boot:run
```
(Trên Windows Command Prompt hoặc PowerShell: `.\mvnw.cmd spring-boot:run`)

## 6. API Documentation & Swagger UI

Sau khi khởi động ứng dụng, bạn có thể truy cập:
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **OpenAPI JSON:** `http://localhost:8080/v3/api-docs`

## 7. API Movie (TASK-05)

- Public: `GET /api/movies?keyword=Phim&status=SHOWING&page=0&size=20&sort=title,asc`, `GET /api/movies/{id}`.
- ADMIN: `POST /api/admin/movies`, `PUT /api/admin/movies/{id}`; Bearer JWT bắt buộc.
- Phim HIDDEN không xuất hiện trên API public; ẩn qua PUT, không xóa dữ liệu.
- Payload và phân trang: xem `../cinema-booking-ai-kit/docs/06-API-CONTRACT.md`, mục 1.1.
- Chạy kiểm thử Movie trên Windows: `.\mvnw.cmd "-Dtest=MovieServiceTest,MovieControllerTest,MovieIntegrationTest" test`.
- Integration dùng MySQL Testcontainers và Flyway; cần Docker daemon. Khi không có Docker, các integration tests Movie được báo skipped, unit/MockMvc vẫn chạy độc lập.

## 8. Phòng, ghế, lịch chiếu (TASK-06/07/08)

**ADMIN (Bearer JWT):**
- `GET /api/admin/cinemas`, `GET /api/admin/cinemas/{id}/rooms` để lấy ID từ dữ liệu thật.
- `POST /api/admin/rooms`, `PUT /api/admin/rooms/{id}`.
- `GET /api/admin/rooms/{id}/seats`, `POST /api/admin/rooms/{id}/seats` (batch), `PUT /api/admin/rooms/{roomId}/seats/{seatId}`.
- `POST /api/admin/showtimes`, `PUT /api/admin/showtimes/{id}`.

**Public:**
- `GET /api/movies/{id}/showtimes?date=2026-11-10` (ngày Việt Nam, hỗ trợ cinemaId/page/size/sort).
- `GET /api/showtimes/{id}/seats` (giá STANDARD/VIP, trạng thái hold hiệu lực, không tiết lộ chủ ghế).

Quy tắc an toàn: khóa room ở DB, tính overlap cả cleanup; tạo suất và inventory cùng transaction; không sửa suất có booking lịch sử; không sửa cấu hình phòng/ghế khi đã có suất. Không thêm CRUD đa cụm rạp hoặc DELETE. Payload chi tiết: `../cinema-booking-ai-kit/docs/06-API-CONTRACT.md`, mục 1.2, 1.3 và 9.1.

Chạy test mới:

```powershell
.\mvnw.cmd "-Dtest=CinemaServiceTest,ShowtimeServiceTest,ScheduleControllerTest,ScheduleIntegrationTest" test
```

Integration mặc định dùng Docker/Testcontainers MySQL 8.0.36. Nếu không dùng Docker, có thể opt-in MySQL 8 cục bộ bằng schema test riêng:

```powershell
$env:CINEMA_IT_JDBC_URL = 'jdbc:mysql://localhost:3306/cinema_tasks678_it?createDatabaseIfNotExist=true&serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true'
# CINEMA_IT_DB_USERNAME / CINEMA_IT_DB_PASSWORD: lấy từ môi trường, mặc định root/root chỉ cho máy demo.
.\mvnw.cmd "-Dtest=ScheduleIntegrationTest" test
Remove-Item Env:CINEMA_IT_JDBC_URL
```

Không trỏ URL này đến DB phát triển/production. Flyway tạo schema test; test thường rollback, concurrency commit fixture riêng và không tự xóa schema local. Không có Docker/URL opt-in thì integration mới được skip.

**Giao thức đã dùng ở TASK-09/10:** tạo booking gọi `ShowtimeRepository.findByIdForBooking` trong cùng transaction trước khi insert booking rồi khóa inventory; phải giữ bước này để chống race với sửa lịch.

## 9. Booking và concurrency (TASK-09..12)

- CUSTOMER: `POST /api/bookings`, `POST /api/bookings/{id}/cancel`, `GET /api/bookings/me`.
- CUSTOMER owner hoặc ADMIN hỗ trợ: `GET /api/bookings/{id}`; owner khác luôn 404, STAFF không xem booking.
- Request giữ ghế: `{"showtimeId":101,"seatIds":[1,2],"clientRequestId":"uuid-cua-y-dinh-dat-ve"}`; ID lấy từ API thực, không copy ID minh họa. 1–8 số nguyên dương không lặp, user/giá lấy từ server.
- Giữ 5 phút, cutoff 10 phút; snapshot giá server; shared guard với sửa lịch → insert booking → khóa từng inventory ID tăng dần. Mọi ghế cùng thành công hoặc rollback hết.
- Cùng key/cùng intent → 200 booking cũ; key mới → 201; cùng key khác showtime/tập ghế → 409. Không đổi key khi retry lỗi mạng/deadlock.
- Cancel chỉ PENDING còn hạn của chính mình; giữ lịch sử. Cleanup mỗi 30s, batch tối đa 100, mỗi đơn một transaction; chỉ release ghế còn thuộc booking. Tắt job bằng `app.booking.cleanup.enabled=false` (test profile đã tắt). Có thể cấu hình `app.booking.cleanup.delay-ms` và `initial-delay-ms`, mặc định 30000.
- GET trả effectiveStatus EXPIRED khi TTL đã qua, không ghi DB. Không có payment/ticket endpoints trong TASK-09..12.
- Chi tiết payload/error/status: `../cinema-booking-ai-kit/docs/06-API-CONTRACT.md`, mục 4.1/6/7.1.

Test trên Windows (Java 17, Docker hoặc MySQL 8 test riêng):

```powershell
# Bỏ dòng URL này nếu dùng Testcontainers/Docker.
$env:CINEMA_IT_JDBC_URL = 'jdbc:mysql://localhost:3306/cinema_booking_it?createDatabaseIfNotExist=true&serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true'
.\mvnw.cmd "-Dtest=BookingServiceTest,BookingTransactionsTest,BookingExpiryServiceTest,BookingControllerTest,BookingIntegrationTest" test
Remove-Item Env:CINEMA_IT_JDBC_URL
```

Các biến `CINEMA_IT_DB_USERNAME/PASSWORD` cấu hình credential môi trường test (default root/root chỉ cho demo). **Không dùng DB dev/production**: fixture concurrency được commit. Integration gồm 20 request cùng ghế, 20 request cùng key, rollback, cleanup/reclaim và cancel/create đồng thời. Không có Docker/URL thì integration bị skip. Chạy toàn bộ và đóng gói bằng `.\mvnw.cmd verify` với cùng cấu hình DB test.

## 10. Cấu trúc Package Modular Monolith

```
src/main/java/com/example/cinema/
  ├── CinemaApplication.java
  ├── auth/            # Xác thực, JWT, User, Role, Spring Security
  ├── catalog/         # Quản lý phim (Movies)
  ├── cinema/          # Rạp, phòng chiếu (Rooms), ghế vật lý (Seats)
  ├── showtime/        # Lịch chiếu (Showtimes) & Kho ghế theo suất (ShowtimeSeats)
  ├── booking/         # Đơn đặt vé (Bookings) & Chi tiết ghế đặt (BookingSeats)
  ├── payment/         # Thanh toán mô phỏng (Payments) & Idempotency
  ├── ticket/          # Quản lý vé & Soát vé (Ticket Check-in)
  ├── report/          # Báo cáo doanh thu
  └── common/          # Error handling, UTC Clock, OpenAPI, Security Config
```
