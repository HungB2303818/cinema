# 10. Hướng dẫn dùng AI để lập trình đúng nghiệp vụ

**Mục tiêu:** AI là trợ lý viết code/review/test; con người vẫn quyết định policy, review transaction và xác nhận tests. `AGENTS.md` ở root là chỉ dẫn ưu tiên cho mọi coding agent.

## 1. Tập context tối thiểu cho mỗi loại công việc

| Công việc | Đưa cho AI các file |
|---|---|
| Khởi tạo dự án/JPA | `AGENTS.md`, `docs/00-PROJECT-CONTEXT.md`, `docs/05-DATABASE.md`, `database/cinema_booking_schema.sql`, `docs/07-ARCHITECTURE.md` |
| Booking/giữ ghế | `AGENTS.md`, `docs/02-BUSINESS-RULES.md`, `docs/03-USE-CASES.md` UC-03, `docs/04-WORKFLOWS.md`, `docs/05-DATABASE.md`, `docs/08-TEST-PLAN.md` |
| Mock payment | Rules BR-12…17, UC-04, workflows, schema payments, API contract, TC-06…08/16/22 |
| Showtime/room | Rules BR-01…05/20, UC-02, DB, TC-11/23 |
| Frontend | Requirements, `docs/06-API-CONTRACT.md`, flows, test data |
| Code review | `AGENTS.md`, business rules, architecture, tests, `git diff` |
| Viết test | Rules, use cases, fixtures, test matrix, mã thực tế của repository |

**Cách gửi context:** nếu dùng AI chat bên ngoài IDE, đính kèm đúng các file nói trên hoặc paste nội dung. Với coding agent có quyền đọc repository, bảo đọc các đường dẫn này trước khi sửa.

## 2. Prompt mẫu — thực hiện một use case

```text
Bạn là Java Spring Boot backend developer. Hãy triển khai UC-03 Create Booking.
Đầu tiên đọc AGENTS.md, docs/02-BUSINESS-RULES.md,
docs/03-USE-CASES.md, docs/04-WORKFLOWS.md,
docs/05-DATABASE.md, docs/06-API-CONTRACT.md,
docs/07-ARCHITECTURE.md và docs/08-TEST-PLAN.md.

Yêu cầu làm lần lượt:
1) Tóm tắt BR/UC/TC liên quan và 5 bất biến không được vi phạm.
2) Kiểm tra cấu trúc code/migration hiện có. Không giả định file đã tồn tại.
3) Liệt kê file sẽ thêm/sửa và transaction boundary.
4) Code từng lớp DTO → repository → service → controller.
5) Viết integration tests MySQL Testcontainers, gồm 20 request cùng ghế,
   multi-seat rollback, hold hết hạn bị booking mới chiếm.
6) Chạy tests nếu môi trường cho phép. Báo rõ đã chạy/chưa chạy,
   câu lệnh và kết quả.
7) Không thay đổi DDL hoặc hợp đồng API khi chưa nêu lý do.
```

## 3. Prompt mẫu — review concurrency

```text
Hãy review đoạn diff Spring Boot bên dưới dựa trên AGENTS.md,
BR-06, BR-07, BR-10, BR-12, BR-14, BR-15 và R1–R5 trong
04-WORKFLOWS.md.

Tập trung vào:
- Race condition và lost update; row-lock order; deadlock
- Booking/payment idempotency; duplicate tickets
- Atomicity của nhiều ghế
- Scheduler release sai ghế sau khi owner thay đổi
- UTC cutoff/TTL, stale state trong JPA
- @Transactional, rollback và unique constraint

Trả theo format: [Severity] File:line | Scenario | Vi phạm BR | Fix | Test.
Không khẳng định code an toàn nếu chưa có integration tests.
```

## 4. Prompt mẫu — sinh test trước code (TDD)

```text
Hãy thiết kế các integration tests cho UC-04 (mock payment) trên
MySQL Testcontainers dựa trên BR-12…17.
Tạo test cases trước, chưa viết business service.
Bao gồm: success, failed-then-success, expired hold,
concurrent duplicate idempotency key, different key after CONFIRMED,
missing seat ownership, forged userId, ticket code uniqueness.
Đối với mỗi test: Given/When/Then và DB assertions.
Không dùng H2 làm bằng chứng về row lock hoặc generated unique column.
```

## 5. Prompt mẫu — xây UI theo hợp đồng

```text
Hãy xây Vue 3 booking page từ docs/06-API-CONTRACT.md.
Các màn hình: movie list, showtime details, seat map, hold timer,
mock payment result, issued ticket.
Không tự định nghĩa lại endpoint/JSON field. Không gửi userId hoặc price.
Khi POST booking bị 409 hãy reload seat map và báo ghế không còn trống.
Dùng clientRequestId ổn định cho retry cùng hành động; tạo key mới
cho hành động đặt vé mới. UI timer không thay backend expiry check.
```

## 6. Prompt mẫu — tạo pull request summary

```text
Dựa trên git diff hiện tại và các file docs, hãy viết PR summary:
- Mục đích và phạm vi thay đổi
- BR/UC/TC đã đáp ứng
- Schema/API changes (nếu có)
- Phân tích concurrency/transaction/authorization
- Tests đã chạy: ghi tên lệnh và kết quả thật
- Rủi ro và hạn chế còn lại
Không nói 'pass' nếu chưa chạy tests.
```

## 7. Quy tắc ngăn AI hallucination / drift

- **Không bịa cột:** `current_booking_id`, không phải `held_by_booking_id`; `starts_at`, không phải `start_time`.
- **Không bịa trạng thái:** `seats` dùng ACTIVE/MAINTENANCE; `showtime_seats` dùng AVAILABLE/HELD/BOOKED.
- Không ép `UNIQUE(showtime_seat_id)` trên `booking_seats`.
- Không tạo migration lén lút hoặc đổi `payments.successful_booking_id` generated column.
- Không dùng `synchronized` đơn lẻ thay InnoDB transaction/locks.
- Không bỏ kiểm tra quyền sở hữu với GET bookings, cancel/payment.
- Không dùng email hoặc bookingCode làm mã vé có thể quét.
- Không tự suy đoán chính sách hoàn tiền, đổi phòng sau đặt, tính thuế, chính sách trẻ em, hỗ trợ đa rạp.

## 8. Checklist trước khi chấp nhận code AI

- [ ] AI trích đúng BR/UC/TC.
- [ ] Đổi file có phạm vi vừa đủ, không refactor không liên quan.
- [ ] Tên bảng/cột/enum khớp SQL.
- [ ] Transaction bao phủ tất cả dữ liệu cần cập nhật đồng thời.
- [ ] `current_booking_id` được kiểm tra trước release.
- [ ] Không thay đổi contract với frontend không thông báo.
- [ ] Tests chứng minh không bán trùng / không duplicate payment.
- [ ] Báo cáo thực nghiệm rõ đã chạy vs chưa chạy.

## 9. Gợi ý bố trí rule trong công cụ AI

- **GitHub Copilot:** dùng `.github/copilot-instructions.md` ở repo.
- **Codex và các coding agents hỗ trợ AGENTS.md:** dùng `AGENTS.md` ở root.
- **Cursor/IDE khác:** có thể trỏ agent/project rules đến `AGENTS.md` và các file trong `docs/`; cấu hình tùy phiên bản IDE.
- **ChatGPT:** đính kèm ZIP tài liệu và yêu cầu đọc `README.md` trước khi bắt đầu một use case.

Không cần sao chép toàn bộ tài liệu vào prompt mỗi lần nếu agent có quyền đọc file trong workspace; hãy trỏ đúng đường dẫn và yêu cầu báo những file đã đọc.
