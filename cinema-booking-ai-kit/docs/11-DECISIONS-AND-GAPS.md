# 11. Architecture Decisions & Open Questions

Trang này phân biệt **quyết định đã khóa cho MVP** với **chủ đề chưa được xác định**. AI không được tự coi open question là yêu cầu mới.

## 1. Quyết định đã thống nhất (ADR)

| ADR | Quyết định | Lý do/hệ quả |
|---|---|---|
| ADR-001 | Modular Monolith, Spring Boot, một MySQL | MVP đủ chiều sâu, dễ demo/test, tránh hạ tầng microservices. |
| ADR-002 | MySQL InnoDB `showtime_seats` là source of truth | Hỗ trợ row-lock và ACID khi nhiều user đặt ghế đồng thời. |
| ADR-003 | Giữ ghế 5 phút; cutoff 10 phút trước suất | BR-07/08, phải enforce backend. |
| ADR-004 | Tạo multi-seat booking all-or-nothing | Không giữ một phần ghế làm khách hàng bối rối. |
| ADR-005 | Payment **mô phỏng** trong DB | Tập trung business flow; không đối soát cổng thật. |
| ADR-006 | Một SUCCESS/booking; idempotency create/pay | Tránh duplicate do retry/concurrency. |
| ADR-007 | Không hủy booking CONFIRMED/không hoàn tiền MVP | Giữ phạm vi phù hợp môn học. |
| ADR-008 | Giữ lịch sử expired/cancelled trong `booking_seats` | Audit/reports, không unique riêng trên inventory ID. |
| ADR-009 | Pessimistic locking, key constraints, service validation | Ngăn double-booking; chạy tests trên MySQL thực. |
| ADR-010 | Thời gian UTC khi lưu/xử lý, API ISO 8601 | Không nhầm timezone Việt Nam. |
| ADR-011 | Một booking thuộc một suất, 1–8 ghế | Giảm phức tạp giỏ hàng qua nhiều suất. |
| ADR-012 | Không xóa dữ liệu đã phát sinh giao dịch | Bảo toàn khóa ngoại, lịch sử và audit. |
| ADR-013 | HTTP 200 cho retry payment FAILED giả lập; 409 cho payment key mới sau CONFIRMED | Hợp đồng nhất quán, không tạo payment SUCCESS mới. |
| ADR-014 | Chọn rạp/ngày hiển thị ngay các phim kèm poster và nút giờ, không bắt chọn phim trước | Yêu cầu bố cục người dùng 05/11/2026; bổ sung API đọc theo rạp, phân trang nhóm phim; chưa triển khai khi ghi nhận. |

## 2. Điểm dễ cần chốt khi viết code

| Mã | Vấn đề | Mặc định MVP được chọn | Khi nào cần bàn lại |
|---|---|---|---|
| GAP-01 | Thời điểm điều kiện `HELD` hết hạn | `hold_expires_at <= dbNow` coi là hết hiệu lực; so sánh UTC | Nếu DB/JVM có nguồn giờ khác nhau |
| GAP-02 | Hủy booking quá hạn nhưng scheduler chưa chạy | Không cho CANCELLED; trả `409 BOOKING_EXPIRED`, scheduler xử lý EXPIRED | Nếu muốn API đồng thời trigger expire |
| GAP-03 | Staff/Admin xem thông tin booking | Staff chỉ tra cứu vé phục vụ check-in; Admin xem hỗ trợ có audit | Nếu bổ sung màn hình quản lý đơn |
| GAP-04 | Cập nhật showtime đã có dữ liệu lịch sử | Không cho update lịch/phòng nếu đã có booking bất kỳ | Nếu thêm quản lý đổi suất/hoàn vé |
| GAP-05 | Payment SUCCESS retry với key mới | `409 BOOKING_STATE_CONFLICT` | Nếu muốn trả kết quả CONFIRMED idempotent theo booking |
| GAP-06 | Định dạng booking_code | Server-generated unique, ví dụ `BK0001001` | Khi cần quy tắc số chứng từ thực |
| GAP-07 | Giá tiền | Giá STANDARD + surcharge VIP snapshot; không tax/discount | Nếu thêm thuế/phí/khuyến mãi |
| GAP-08 | Thay đổi ghế maintenance sau khi đã tạo showtime | Chỉ cho thay đổi không ảnh hưởng booking/suất tương lai, hoặc cấm hoàn toàn trong MVP | Khi cần workflow ngừng ghế |
| GAP-09 | Lịch phim và cleanup | Admin cung cấp endsAt hợp lệ; cleanupMinutes default 15; validate thời lượng theo policy | Nếu tự tính từ runtime/trailer |
| GAP-10 | Token check-in | Random ≥128-bit; lưu chuỗi duy nhất; không chứa thông tin cá nhân | Nếu thêm QR/signature/hết hạn riêng |
| GAP-11 | Endpoint admin ngoài danh sách hiện tại | Chỉ yêu cầu minimum movie/room/showtime; `cinemas` seed một rạp | Nếu cần UI quản lý nhiều cụm |

### Chi tiết hóa khi triển khai TASK-06/07/08

- GAP-08: chọn nhánh bảo thủ được cho phép — không sửa/thêm ghế hoặc sửa cấu hình phòng khi phòng đã có bất kỳ suất nào. Cùng room row lock ở codepath sửa ghế/phòng và tạo/sửa lịch.
- GAP-09: admin cung cấp endsAt; kiểm tra endsAt >= startsAt + durationMinutes, không tự thêm trailer; cleanup mặc định 15, không âm. API mô tả rõ lỗi 400/422 và giới hạn DATETIME/DECIMAL.
- GAP-11: dùng rạp seed, cung cấp danh sách rạp/phòng/ghế cho quản trị; không tự thêm workflow CRUD đa cụm.
- Không bổ sung trạng thái hay cột schema; các endpoint phụ trong TASK-06 chỉ phục vụ minimum quản trị phòng/ghế. Xem API contract mục 1.2/1.3/9.1 và giao thức lock trong Architecture.

### Chi tiết hóa TASK-09..12

- GAP-01/02: DB now là nguồn giờ; expiry tại mốc được coi hết hạn. Cancel quá hạn trả BOOKING_EXPIRED và không đổi state trong transaction sắp rollback; job riêng commit EXPIRED.
- GAP-03: CUSTOMER chỉ xem đơn của mình; STAFF không dùng booking GET; ADMIN được xem chi tiết hỗ trợ và có audit. Chưa có màn hình quản trị đơn/impersonation.
- GAP-06: bookingCode UUID 32 ký tự, server-generated, UNIQUE; không dùng làm token check-in.
- Giá tổng phải vừa DECIMAL(12,2), nếu vượt miền trả 422 và rollback, không cắt/round sai giá. Không đổi schema để tăng giới hạn hoặc thêm policy tax/discount.
- TTL tính từ DB createdAt trước insert; không gia hạn khi chờ khóa, replay hoặc retry sau đã commit. Bounded retry chỉ cho deadlock/lock conflict, cùng intent/key; cleanup không expose API mới.
- Payment, GET tickets và phát hành/check-in vé vẫn là TASK-13..15, không đánh dấu hoàn tất bởi test fixture CONFIRMED của booking.

### Mở rộng theo yêu cầu — Cloudinary poster (2026-11-04)

- Người dùng yêu cầu lưu poster qua Cloudinary. Bổ sung upload multipart ADMIN cho FR-04/15, UC-02; dùng SDK cloudinary-http5 2.6.0, credential server env, signed upload, không unsigned preset.
- Giữ movies.poster_url và API Movie JSON hiện hành, không thêm DDL/migration. Chỉ JPEG/PNG 5 MiB, validate/decode/re-encode và giới hạn pixel trước khi gửi ra ngoài.
- Không giữ DB transaction trong mạng; upload asset UUID độc lập rồi transaction attach URL. Chọn giữ asset cũ và asset có thể orphan khi lỗi/commit không rõ, thay vì tự xóa asset dựa trên URL; quản trị cleanup trên Console. Chưa thêm lifecycle/asset table/reconciliation job.
- SDK HTTP5/core5/commons-lang3 được pin theo POM của Cloudinary để tránh Spring Boot 3.3 BOM hạ xuống phiên bản không khớp. Không gửi dữ liệu lên Cloudinary thật trong test; chỉ provider mock và loopback HTTP stub.

### Chi tiết hóa TASK-13..16 (2026-11-04)

- ADR-005/006/013, GAP-05: payment chỉ MOCK trong DB; cùng key trả attempt cũ; key mới sau CONFIRMED luôn 409. Replay FAILED giữ response PENDING/FAILED lịch sử, không biểu diễn trạng thái booking mới nhất; GET booking là nguồn trạng thái hiện tại. Ownership được kiểm tra trước global-key lookup.
- GAP-10: ticket 192 bit SecureRandom, mã hex 48 ký tự vừa VARCHAR(48), không chứa PII. Collision/write failure rollback toàn bộ payment, không tự đổi key. Không có QR camera/email trong tuần 4.
- GAP-03: owner/ADMIN GET vé, ADMIN support read có audit; STAFF chỉ check-in. Check-in serialize trên booking row và vẫn có UNIQUE DB, cửa sổ bao gồm hai biên. Không thêm quyền impersonation/payment cho ADMIN.
- Báo cáo nhóm ngày UTC+07, chỉ ngày có SUCCESS, tổng từ paid_at trong khoảng nửa mở. Không đổi schema: generated UNIQUE payment, ticket UNIQUE và check-in UNIQUE đã có trong V1; không cần migration mới.

### Cập nhật thiết kế lịch theo rạp và FE-05 (05/11/2026)

- ADR-014 mở rộng FR-02/UC-01; không thay đổi các bất biến giữ ghế. Giữ `/showtimes?cinemaId=...&date=...` làm điểm vào từ rạp; có movieId thì giữ nhánh theo phim hiện hữu. Bố cục poster trái/giờ phải theo ảnh tham chiếu, không yêu cầu đổi theme.
- Chọn bổ sung `GET /api/cinemas/{id}/showtimes` với page các nhóm phim và đầy đủ suất trong từng nhóm, thay vì fan-out API theo từng phim hoặc nhóm từ một trang suất bị cắt. Contract tại mục 1.4; controller hiện chưa có endpoint này. Chỉ đọc các bảng hiện có nên không cần migration.
- Không tự bổ sung định dạng chiếu/ngôn ngữ/phụ đề hoặc hardcode nhãn trong ảnh mẫu; schema chưa có các trường đó. Ảnh rạp và poster phim là hai metadata khác nhau; giữ ảnh đúng danh tính, fallback không tạo dữ liệu giao dịch giả.
- FE-05 lưu intent theo tài khoản trong phiên, không tự POST khi mount. Retry kỹ thuật giữ nguyên key/payload, timeout là kết quả chưa xác định; checkout GET detail và expiresAt/effectiveStatus là nguồn dữ liệu, không reset TTL. Payment/vé vẫn ở FE-06; hủy ở FE-07. Không thêm API cleanup/extend hold hay thay policy cutoff/TTL.
- Toàn bộ phần này là cập nhật thiết kế và acceptance (TC-46…49 cùng các TC booking hiện có), không xác nhận implementation hoặc test đã chạy.

## 3. Ngoài phạm vi — không tự thêm

Cổng thanh toán online, webhooks, hoàn tiền, đổi vé/đổi suất sau xác nhận, xử lý giá vé trẻ em/sinh viên, combo, loyalty, coupon, thuế và hóa đơn điện tử, tích hợp SMS/email, mobile native, Kafka, kiến trúc phân tán, triển khai high availability, redis giữ ghế là source of truth.

## 4. Cách thay đổi quyết định

Khi muốn thay một BR/ADR:

1. Mở issue trình bày **hiện trạng**, **đề xuất**, tác động đến DB/API/UI/concurrency.
2. Sửa `02-BUSINESS-RULES.md` và tài liệu liên quan; ghi ADR mới ở đây.
3. Tạo migration tương ứng nếu schema thay đổi, không chỉnh DB thủ công.
4. Bổ sung test cases xác nhận hành vi cũ/mới và traceability.
5. Chỉ triển khai khi những điểm không còn mơ hồ.
