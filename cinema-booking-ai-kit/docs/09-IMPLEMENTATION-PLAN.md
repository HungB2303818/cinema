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

**Cập nhật triển khai backend 2026-11-03:** TASK-05/06/07/08 đã có DTO → repository → service → REST → tests. TASK-06 dùng cinema seed, quản lý phòng/ghế và chính sách maintenance bảo thủ theo GAP-08/11. TASK-07 có room row lock, cleanup overlap, atomic inventory, chặn sửa lịch sử booking và shared booking guard. TASK-08 có lịch theo ngày Việt Nam, seat map giờ DB, không lộ chủ ghế. Chi tiết payload/lock/test trong docs 06/07/08. Chưa có UI (TASK-17/18); kiểm thử POST booking sai phòng/cutoff được bổ sung trong TASK-09/10 bên dưới, không suy ra từ test seat map.

- **TASK-05** Public movie list/detail; admin movie create/update; validate metadata.
- **TASK-06** Quản lý cinema, rooms và sơ đồ ghế; unique vị trí ghế và maintenance.
- **TASK-07** Admin tạo showtime với row-lock room + overlap query + tạo showtime_seats.
- **TASK-08** Public showtime list/seat map; trạng thái HELD quá hạn được trả effective AVAILABLE.
- **DoD:** TC-11/12/23; mọi showtime tạo thành công có inventory đúng phòng, không trùng lịch kể cả concurrent create.

## Tuần 3 — Booking và concurrency

**Cập nhật triển khai 2026-11-03:** TASK-09/10/11/12 đã có API tạo/cancel/history/detail, DTO + service validation, principal-derived owner, shared showtime guard, khóa từng inventory tăng dần, atomic hold/snapshot, idempotency scoped theo user và retry deadlock tối đa 3 transaction. Cleanup batch 100 mỗi 30s, từng booking một transaction và conditional release; GET effective expiry không ghi DB. Không thay DDL, không xóa lịch sử. Đã chạy 62 test booking mới gồm 31 integration MySQL thật; TC-01..05/09/10/12/15/17..20 có coverage phù hợp. `mvnw.cmd verify` Java 17: 160 tổng, 156 đạt, 4 Movie integration skipped do Docker không chạy. Payment/ticket ở Tuần 4 và UI ở Tuần 5 chưa hoàn thành.

- **TASK-09** Booking DTO/idempotency, 1–8 ghế, cutoff 10 phút, snapshot giá.
- **TASK-10** `BookingService.createBooking` nguyên tử, lock showtime seats tăng dần, 5 phút hold.
- **TASK-11** Cancel PENDING + expiry cleanup 30–60 giây, conditional release.
- **TASK-12** Booking GET/self history và các integration tests đồng thời.
- **DoD:** TC-01…05,09,10,17…20 pass; MySQL row locking bảo vệ chống bán/giữ trùng.

## Tuần 4 — Payment, vé, check-in

**Cập nhật backend 2026-11-04:** TASK-13/14/15/16 đã triển khai repository → transaction service → REST DTO → tests; FR-08/11/12/13/14/15, UC-04/07/08/09, BR-12..15/17/18/21/22. Payment mock SUCCESS/FAILED, global idempotency + replay sau rollback, khóa booking → inventory tăng dần, DB UTC sau chờ khóa; SUCCESS/CONFIRMED/BOOKED/vé 192-bit CSPRNG nguyên tử. GET vé owner/ADMIN, check-in STAFF/ADMIN một lần trong cửa sổ bao gồm hai biên; báo cáo SUCCESS theo paid_at và ngày Việt Nam. Giữ nguyên DDL/generated UNIQUE, lịch sử và thay đổi Cloudinary. Đã chạy `mvnw.cmd verify` Java 17 + MySQL 8 local: **251 tổng, 247 đạt, 4 Movie integration skipped do Docker**; **59/59 test tuần 4 đạt**, gồm 29 MySQL integration. TC-06/07/08/13/14/16/21/22/24 có coverage; chi tiết command/traceability ở docs 08. UI vẫn thuộc Tuần 5.

- **TASK-13** Payment mock SUCCESS/FAILED, idempotency, generated unique column, chuyển booking CONFIRMED trong cùng transaction.
- **TASK-14** Phát hành ticket codes CSPRNG và GET tickets theo owner.
- **TASK-15** STAFF/ADMIN check-in và bảo vệ UNIQUE.
- **TASK-16** Revenue từ payments.SUCCESS, truy vấn theo paid_at.
- **DoD:** TC-06…08,13,14,16,21,22,24 pass; không xuất hiện payment SUCCESS trùng hoặc vé trùng.

## Tuần 5 — UI, test, demo

- **TASK-17** React + Vite UI phim → suất → sơ đồ ghế → booking → mock payment → vé.
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

## Mở rộng theo yêu cầu: Cloudinary poster (2026-11-04)

Đã thêm SDK/config server env, upload multipart ADMIN, kiểm tra nội dung JPEG/PNG và giới hạn 5 MiB/pixel, attach secure_url vào cột poster_url có sẵn sau upload (không giữ DB transaction trong mạng). Giữ API JSON Movie, không đổi schema, không tự xóa asset cũ/orphan. API contract mục 1.1.1; cách cấu hình/export env và curl trong backend/README.md mục 10. Đã chạy `mvnw.cmd verify` Java 17 + MySQL test riêng: 192 tổng, 188 đạt, 4 Movie integration skipped do Docker; 32 test poster mới đều đạt. Chưa chạy upload với tài khoản Cloudinary thật. Không thay trạng thái các task payment/ticket còn lại.

## Git workflow đề xuất

- `main`: trạng thái có thể demo.
- `feature/auth`, `feature/showtime`, `feature/booking-hold`, `feature/payment`, `feature/ticket-checkin`.
- Một PR nên giải quyết một use case hoặc nhóm việc nhỏ; trích BR/UC/TC trong PR.
- Không merge nếu thay đổi nghiệp vụ nhưng chưa cập nhật docs/tests tương ứng.
