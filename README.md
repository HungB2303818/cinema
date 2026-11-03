# Cinema Booking System (Hệ Thống Đặt Vé Xem Phim)

Hệ thống đặt vé xem phim trực tuyến được xây dựng với kiến trúc **Modular Monolith** chuẩn hóa theo tài liệu đặc tả nghiệp vụ, đáp ứng các tiêu chuẩn khắt khe về đồng thời (concurrency), giữ ghế (seat hold TTL), thanh toán mô phỏng (idempotent payment), và phân quyền vai trò (RBAC).

## 1. Công nghệ sử dụng

- **Backend:** Java 17, Spring Boot 3.3.5
- **Security:** Spring Security 6, JWT (JSON Web Token), BCrypt
- **Cơ sở dữ liệu:** MySQL 8.0 (InnoDB, Collation `utf8mb4_unicode_ci`, Timezone UTC)
- **Quản lý Schema Migration:** Flyway (`V1__init_schema.sql`, `V2__seed_test_data.sql`)
- **Tài liệu API:** OpenAPI 3 / Swagger UI (`springdoc-openapi`)
- **Kiểm thử:** JUnit 5, AssertJ, Mockito, Testcontainers MySQL
- **Container:** Docker & Docker Compose
- **Frontend (dự kiến):** Vue 3 + Vite

## 2. Cấu trúc thư mục

```text
.
├── backend/                       # Source code backend Spring Boot
│   ├── src/main/java/com/example/cinema/
│   │   ├── auth/                  # Module xác thực & người dùng
│   │   ├── catalog/               # Quản lý phim
│   │   ├── cinema/                # Rạp, phòng chiếu, ghế vật lý
│   │   ├── showtime/              # Lịch chiếu & kho ghế suất chiếu
│   │   ├── booking/               # Đơn đặt vé & giữ ghế tạm thời
│   │   ├── payment/               # Thanh toán & kiểm tra idempotency
│   │   ├── ticket/                # Quản lý vé & soát vé (check-in)
│   │   ├── report/                # Báo cáo & thống kê
│   │   └── common/                # Cấu hình chung, xử lý lỗi, Clock UTC
│   ├── src/main/resources/
│   │   ├── application.yml        # Cấu hình chính
│   │   └── db/migration/          # Flyway SQL migrations
│   └── pom.xml
├── cinema-booking-ai-kit/         # Bộ tài liệu đặc tả nghiệp vụ & AI
│   ├── AGENTS.md                  # Quy tắc nghiệp vụ bắt buộc
│   ├── database/                  # Schema SQL gốc
│   └── docs/                      # 13 tài liệu đặc tả chi tiết (00 - 12)
├── docker-compose.yml             # Cấu hình MySQL container
├── .env.example                   # Mẫu cấu hình biến môi trường
└── README.md
```

## 3. Khởi chạy nhanh

### Bước 1: Chuẩn bị cơ sở dữ liệu
Có thể chọn một trong hai cách:
1. **Dùng MySQL cục bộ:** Tạo database `cinema_booking` trên MySQL 8.0:
   ```sql
   CREATE DATABASE IF NOT EXISTS cinema_booking CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. **Dùng Docker Compose:**
   ```bash
   docker compose up -d mysql
   ```

### Bước 2: Cấu hình biến môi trường
Sao chép `.env.example` thành `.env` và điều chỉnh thông tin nếu cần:
```bash
cp .env.example .env
```

### Bước 3: Chạy Backend Spring Boot
```bash
cd backend
./mvnw spring-boot:run
```
*(Trên Windows: `.\mvnw.cmd spring-boot:run`)*

### Bước 4: Truy cập ứng dụng & Tài liệu API
- **Swagger UI:** [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)
- **OpenAPI JSON:** [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

### Tài khoản mẫu (Seed data):
- **Admin:** `admin@cinema.com` / `Password@123`
- **Staff:** `staff@cinema.com` / `Password@123`
- **Customer:** `customer1@cinema.com` / `Password@123`
