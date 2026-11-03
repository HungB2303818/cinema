# 09. Lộ trình lập trình theo milestone / issue

**Giả định:** làm cá nhân, 5 tuần × 10–15 giờ. Cắt scope nếu thiếu thời gian; không dời test concurrency sang sau khi hoàn thành toàn bộ frontend.

## Nguyên tắc ưu tiên

1. Đúng business rules và schema trước giao diện đẹp.
2. Hoàn thiện từng **vertical slice**: entity/repository → service → REST → test → UI.
3. Không dùng Redis, WebSocket, Kafka, thanh toán thật trước khi UC-03/UC-04 pass concurrency tests.

## Tuần 1 — Nền tảng dữ liệu, auth

- **TASK-01** Thiết lập Spring Boot, cấu hình MySQL/Docker Compose, Flyway; chuyển DDL vào `V1__init_schema.sql` với chỉnh sửa phù hợp cho migration (và đảm bảo cấu trúc tương đương).
- **TASK-02** Tạo JPA entities/repositories theo **chính xác** 11 bảng và enum MySQL; không trả entity ở API.
- **TASK-03** Auth register/login, password hashing, JWT + Spring Security role/ownership.
- **TASK-04** Seed data cố định và dựng Testcontainers MySQL.
- **DoD:** DB init sạch, đăng ký chỉ tạo CUSTOMER, login JWT hoạt động, migration có thể chạy lại trên DB mới, test auth pass.

## Tuần 2 — Movie/Cinema/Showtime

- **TASK-05** Public movie list/detail; admin movie create/update; validate metadata.
- **TASK-06** Quản lý cinema, rooms và sơ đồ ghế; unique vị trí ghế và maintenance.
- **TASK-07** Admin tạo showtime với row-lock room + overlap query + tạo showtime_seats.
- **TASK-08** Public showtime list/seat map; trạng thái HELD quá hạn được trả effective AVAILABLE.
- **DoD:** TC-11/12/23; mọi showtime tạo thành công có inventory đúng phòng, không trùng lịch kể cả concurrent create.

## Tuần 3 — Booking và concurrency

- **TASK-09** Booking DTO/idempotency, 1–8 ghế, cutoff 10 phút, snapshot giá.
- **TASK-10** `BookingService.createBooking` nguyên tử, lock showtime seats tăng dần, 5 phút hold.
- **TASK-11** Cancel PENDING + expiry cleanup 30–60 giây, conditional release.
- **TASK-12** Booking GET/self history và các integration tests đồng thời.
- **DoD:** TC-01…05,09,10,17…20 pass; MySQL row locking bảo vệ chống bán/giữ trùng.

## Tuần 4 — Payment, vé, check-in

- **TASK-13** Payment mock SUCCESS/FAILED, idempotency, generated unique column, chuyển booking CONFIRMED trong cùng transaction.
- **TASK-14** Phát hành ticket codes CSPRNG và GET tickets theo owner.
- **TASK-15** STAFF/ADMIN check-in và bảo vệ UNIQUE.
- **TASK-16** Revenue từ payments.SUCCESS, truy vấn theo paid_at.
- **DoD:** TC-06…08,13,14,16,21,22,24 pass; không xuất hiện payment SUCCESS trùng hoặc vé trùng.

## Tuần 5 — UI, test, demo

- **TASK-17** Vue UI phim → suất → sơ đồ ghế → booking → mock payment → vé.
- **TASK-18** UI Admin quản lý phim/suất, Staff check-in, report.
- **TASK-19** Docker Compose, env sample, README setup, OpenAPI/Swagger, Postman collection nếu cần.
- **TASK-20** E2E manual demo, concurrency test, export báo cáo test, hoàn thành báo cáo đồ án.
- **DoD:** Có video/kịch bản demo R1/R2 và một run tests rõ ràng; không còn bug blocker.

## Phân chia backlog theo mức độ

| Mức | Nội dung | Có thể bỏ nếu thiếu thời gian? |
|---|---|---|
| P0 | Auth, phim/phòng/ghế/suất, booking hold + timeout, thanh toán mock, vé, check-in | **Không** |
| P0 | Unique constraints, lock, transaction, tests đặt trùng | **Không** |
| P1 | Lịch sử, báo cáo ngày, giao diện admin đẹp | Rút gọn UI được, không bỏ quyền |
| P2 | Email, QR scan camera, thống kê nâng cao, WebSocket | Có |
| P3 | Redis, Kafka, payment gateway thực, multi-cinema admin workflow, microservices | Ngoài MVP |

## Mẫu issue (copy vào GitHub Issues)

```markdown
## Mục tiêu
Implement UC-03 Create Booking (BR-05…11, BR-14…15).

## Phạm vi
- [ ] Validate DTO/ownership/showtime/cutoff
- [ ] All-or-nothing row locking + price snapshot
- [ ] clientRequestId idempotency
- [ ] Error response 409/422

## Acceptance
- [ ] TC-01,02,03,04,05,12,17,19,20 pass với MySQL Testcontainers
- [ ] Không đổi schema/API ngoài contract nếu chưa cập nhật ADR

## Tài liệu
- docs/02-BUSINESS-RULES.md
- docs/03-USE-CASES.md (UC-03)
- docs/04-WORKFLOWS.md
- docs/05-DATABASE.md
- docs/06-API-CONTRACT.md
```

## Git workflow đề xuất

- `main`: trạng thái có thể demo.
- `feature/auth`, `feature/showtime`, `feature/booking-hold`, `feature/payment`, `feature/ticket-checkin`.
- Một PR nên giải quyết một use case hoặc nhóm việc nhỏ; trích BR/UC/TC trong PR.
- Không merge nếu thay đổi nghiệp vụ nhưng chưa cập nhật docs/tests tương ứng.
