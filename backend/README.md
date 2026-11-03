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

## 7. Cấu trúc Package Modular Monolith

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
