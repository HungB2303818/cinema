# Cinema Booking System — Bộ tài liệu lập trình & AI

> **Trạng thái:** Đặc tả MVP, phiên bản 1.0 (03/11/2026). Đây là thiết kế đề xuất cho đồ án môn học, không phải mã nguồn đã triển khai.
>
> **Stack:** Java + Spring Boot, Spring Security/JWT, Spring Data JPA, MySQL 8.0.16+ (InnoDB), Vue 3, Docker Compose. **Kiến trúc:** modular monolith.

## Mục đích

Các tài liệu Markdown trong repository là **nguồn sự thật nghiệp vụ (source of truth)** để sinh code, review PR, tạo unit/integration tests, dùng với ChatGPT, GitHub Copilot, Cursor hoặc các AI coding agents. Chúng được chuẩn hóa từ `thiet_ke_he_thong_dat_ve_xem_phim.docx` và **schema SQL thực tế** `database/cinema_booking_schema.sql`.

## Đọc theo thứ tự

| Tài liệu | Nội dung | Người sử dụng |
|---|---|---|
| [`AGENTS.md`](AGENTS.md) | Quy tắc bắt buộc khi AI sửa code | AI agents / lập trình viên |
| [`docs/00-PROJECT-CONTEXT.md`](docs/00-PROJECT-CONTEXT.md) | Mục tiêu, phạm vi, vai trò, tiêu chí thành công | Tất cả |
| [`docs/01-REQUIREMENTS.md`](docs/01-REQUIREMENTS.md) | Yêu cầu chức năng, phi chức năng, phân quyền | BA, dev, QA |
| [`docs/02-BUSINESS-RULES.md`](docs/02-BUSINESS-RULES.md) | 22 business rules (BR-01…BR-22) và bất biến | Backend, AI, QA |
| [`docs/03-USE-CASES.md`](docs/03-USE-CASES.md) | 9 use cases, luồng chính/phụ, tiền/hậu điều kiện | Dev, QA |
| [`docs/04-WORKFLOWS.md`](docs/04-WORKFLOWS.md) | Mermaid sequence/state diagrams, lỗi và race conditions | Backend, frontend |
| [`docs/05-DATABASE.md`](docs/05-DATABASE.md) | ERD, data dictionary 11 bảng, constraints, indexes | Backend, DBA |
| [`docs/06-API-CONTRACT.md`](docs/06-API-CONTRACT.md) | REST API, payload, HTTP status, error code | Frontend/backend |
| [`docs/07-ARCHITECTURE.md`](docs/07-ARCHITECTURE.md) | Package, transaction, locking, auth, time | Backend |
| [`docs/08-TEST-PLAN.md`](docs/08-TEST-PLAN.md) | Acceptance criteria, test cases, concurrency tests | QA, AI |
| [`docs/09-IMPLEMENTATION-PLAN.md`](docs/09-IMPLEMENTATION-PLAN.md) | Kế hoạch triển khai theo sprint/issue | Dev |
| [`docs/10-AI-COLLABORATION.md`](docs/10-AI-COLLABORATION.md) | Prompt templates, context packs, Definition of Done | AI users |
| [`docs/11-DECISIONS-AND-GAPS.md`](docs/11-DECISIONS-AND-GAPS.md) | Quyết định kỹ thuật và điểm ngoài phạm vi/chưa xác định | Lead dev |
| [`docs/12-TEST-DATA.md`](docs/12-TEST-DATA.md) | Fixture, kịch bản demo E2E, dữ liệu mẫu | Dev, QA |
| [`database/cinema_booking_schema.sql`](database/cinema_booking_schema.sql) | **DDL chính thức**, không tự ý đổi tên cột/bảng | Backend, AI |
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Ngữ cảnh ngắn cho GitHub Copilot | Copilot |

## Quy tắc ưu tiên khi tài liệu khác nhau

1. `docs/02-BUSINESS-RULES.md` xác định **nghĩa nghiệp vụ**; nếu cần đổi, tạo quyết định rõ ràng, cập nhật traceability và tests.
2. `database/cinema_booking_schema.sql` xác định **tên bảng/cột/constraint hiện hành**; Markdown không thay thế một migration SQL.
3. `docs/06-API-CONTRACT.md` xác định **hợp đồng HTTP của MVP**.
4. `docs/04-WORKFLOWS.md` và `docs/07-ARCHITECTURE.md` mô tả cách thực hiện nghiệp vụ bằng transaction.
5. File Word gốc là **bản tham chiếu lịch sử**. Khi có khác biệt đã xác nhận, cập nhật tài liệu và mã nguồn có kiểm soát; không sửa ngầm.

> Chú ý: Bộ tài liệu này không khẳng định mã đã tồn tại. Nếu repository mới trống, hãy tạo khung ứng dụng theo từng milestone. Nếu repository có sẵn, AI phải đọc code hiện tại trước khi sửa.

## Cách dùng với AI

1. Đưa cho AI [`AGENTS.md`](AGENTS.md), [`docs/02-BUSINESS-RULES.md`](docs/02-BUSINESS-RULES.md) và tài liệu đúng module đang thực hiện.
2. Yêu cầu AI **liệt kê file dự kiến thay đổi + bất biến liên quan + test sẽ viết**, sau đó mới sinh code.
3. Triển khai từng use case; không sinh toàn bộ hệ thống cùng một lần.
4. Trước khi merge: kiểm tra `docs/08-TEST-PLAN.md`, chạy automated tests (khi dự án đã thiết lập) và cập nhật tài liệu nếu thay đổi hành vi.

**MVP không bao gồm:** cổng thanh toán thật, hoàn tiền, khuyến mãi, combo, hệ thống đa vùng, microservices hoặc Redis/WebSocket bắt buộc.
