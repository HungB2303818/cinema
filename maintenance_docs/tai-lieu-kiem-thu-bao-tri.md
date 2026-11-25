# TÀI LIỆU KIỂM THỬ BẢO TRÌ
## Hệ thống đặt vé xem phim Cinema – HC-01, HC-02, HC-03

**Học phần:** Bảo trì phần mềm – CT244  
**Dự án:** Cinema – hệ thống đặt vé xem phim  
**Phiên bản:** 0.1 – Draft  
**Ngày lập:** 25/11/2026  
**Trạng thái:** Kế hoạch và test case đã soạn; **chưa thực thi**. Mọi kết quả là `Not Run` hoặc `Blocked` khi ghi nhận môi trường.

> Không ghi `Pass`/`Fail` cho test chưa chạy. Kết quả thực tế chỉ được cập nhật sau khi chạy trên commit xác định, có log/minh chứng.

## 1. Giới thiệu

### Mục tiêu

Xác minh HC-01/02/03 đáp ứng SRS/SDD, không làm hồi quy luồng hiện có (đặt vé, giữ ghế, cutoff booking, check-in, public schedule, phân quyền).

### Phạm vi

**Kiểm thử:** validate create/update showtime theo `releaseDate` và lead time 10 phút; bảo vệ đổi `releaseDate`; DTO booking additive; UI thông báo phim ẩn; endpoint/UI hide-impact; hồi quy liên quan.

**Không kiểm thử:** hoàn tiền, đổi vé, hủy suất hàng loạt, payment gateway thật, load/perf quy mô lớn ngoài đo nhẹ cần thiết.

### Tài liệu tham khảo

- `maintenance_docs/dac-ta-yeu-cau-bao-tri.md`
- `maintenance_docs/thiet-ke-phan-mem-bao-tri.md`
- `maintenance_docs/phan-tich-tac-dong-hieu-chinh.md`

## 2. Chi tiết kế hoạch

### 2.1. Tính năng sẽ kiểm thử

| Nhóm | Mức ưu tiên | Loại |
|---|---|---|
| HC-01 releaseDate validate + protect | Cao | Unit, integration, API, UI |
| HC-03 lead time 10 phút | Cao | Unit, integration, UI |
| HC-02 booking DTO additive | Cao | Integration, API contract, UI |
| HC-02 hide-impact endpoint/UI | Cao | Integration, API, UI |
| Hồi quy showtime/booking/public/check-in | Cao | Unit/integration/UI có chọn lọc |

### 2.2. Tính năng sẽ không kiểm thử

| Mục | Lý do | Rủi ro còn lại |
|---|---|---|
| Payment gateway thật | Ngoài phạm vi HC; môi trường hiện có mô phỏng | Thấp |
| Hủy suất/hoàn tiền | Chưa có chức năng | N/A |
| Load test quy mô lớn | Chưa có môi trường/kịch bản | Trung bình thấp; D-07 xử lý nếu đo thấy chậm |

### 2.3. Cách tiếp cận

- **Unit (backend):** Mockito/JUnit cho `ShowtimeService`, `MovieService`, có stub `DatabaseTime`.
- **Integration/API (backend):** Spring Boot + MockMvc/Testcontainers MySQL khi Docker khả dụng. Kiểm tra status code, body, DB side effects.
- **Frontend unit/UI:** Vitest + Testing Library, theo pattern `frontend/src/test/*.test.tsx`.
- **Hồi quy:** chạy `npm run build`, `npm run test`, `npm run lint`; backend `.\mvnw.cmd test` khi có Docker.
- **Kỹ thuật:** biên, lớp tương đương, negative, permission, regression.

### 2.4. Tiêu chí thành công/thất bại

- **Pass:** kết quả thực tế khớp mong đợi, không lỗi phụ liên quan.
- **Fail:** khác mong đợi hoặc gây hồi quy.
- **Blocked:** môi trường/phụ thuộc không sẵn sàng (ghi lý do).
- **Not Run:** chưa thực thi.

Nghiệm thu HC: tất cả TC ưu tiên cao của HC-01/02/03 Pass; không có hồi quy nghiêm trọng; lệnh kiểm tra frontend pass; backend test pass hoặc có biên bản blocked rõ ràng.

### 2.5. Tiêu chí đình chỉ / bắt đầu lại

- Đình chỉ khi môi trường test không ổn định, DB schema lệch, hoặc lỗi blocker ngăn chạy suite.
- Bắt đầu lại khi đã sửa blocker, xác nhận commit và môi trường.

### 2.6. Sản phẩm bàn giao kiểm thử

- Tài liệu này (cập nhật kết quả).
- Log lệnh test, ảnh chụp/trace khi cần.
- Danh sách lỗi/issue nếu có.

## 3. Quản lý kiểm thử

| Hạng mục | Giá trị |
|---|---|
| Môi trường FE | Node 24.13.0, npm 11.7.0, Vite 8.3.5, Vitest 5.1.0 |
| Môi trường BE | Java 25.0.2 (source 17), Spring Boot 3.3.5, Maven wrapper |
| DB test | MySQL 8.0.36 qua Testcontainers/Docker – **hiện Blocked** nếu Docker daemon không chạy |
| Trách nhiệm | Người thực hiện HC chạy unit liên quan; reviewer độc lập chạy hồi quy; ghi commit hash |

## 4. Trường hợp kiểm thử

### 4.1. HC-01 – Ngày khởi chiếu

| TC | REQ | Tên | Tiền điều kiện | Bước thực hiện | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| HC01-T01 | REQ-HC01.1 | Tạo suất trước ngày khởi chiếu | Phim `releaseDate=2026-12-01`, phòng ACTIVE có ghế | POST create showtime | `startsAt` = 2026-11-30 23:59 VN | 422 `SCHEDULE_INVALID`, không tạo showtime/seats |  | Not Run |
| HC01-T02 | REQ-HC01.1 | Tạo suất đúng ngày khởi chiếu | Cùng phim | POST create | `startsAt` = 2026-12-01 00:00 VN | 200/201, tạo showtime |  | Not Run |
| HC01-T03 | REQ-HC01.1 | Tạo suất sau ngày khởi chiếu | Cùng phim | POST create | `startsAt` = 2026-12-02 10:00 VN | Thành công |  | Not Run |
| HC01-T04 | REQ-HC01.1 | Phim chưa có releaseDate | `releaseDate=null` | POST create | bất kỳ startsAt hợp lệ khác | 422 `SCHEDULE_INVALID`, message yêu cầu bổ sung ngày khởi chiếu |  | Not Run |
| HC01-T05 | REQ-HC01.1 | Phim HIDDEN vẫn bị chặn | `status=HIDDEN` | POST create | startsAt hợp lệ | 422 `MOVIE_UNAVAILABLE` |  | Not Run |
| HC01-T06 | REQ-HC01.1 | Update suất sang trước releaseDate | Suất SCHEDULED tồn tại | PUT update | startsAt trước releaseDate | 422 `SCHEDULE_INVALID`, dữ liệu cũ giữ nguyên |  | Not Run |
| HC01-T07 | REQ-HC01.2 | Đổi releaseDate muộn hơn làm vi phạm suất active | Phim có suất SCHEDULED endsAt>now | PUT movie | releaseDate mới muộn hơn startsAt suất | 409 `RESOURCE_STATE_CONFLICT`, movie/showtime không đổi |  | Not Run |
| HC01-T08 | REQ-HC01.2 | Đổi releaseDate muộn hơn nhưng chỉ suất đã kết thúc | Suất endsAt<=now | PUT movie | releaseDate muộn hơn | Thành công |  | Not Run |
| HC01-T09 | REQ-HC01.2 | Đổi releaseDate sớm hơn | Có suất active | PUT movie | releaseDate sớm hơn | Thành công |  | Not Run |
| HC01-T10 | REQ-HC01.2 | Set releaseDate null khi còn suất chưa kết thúc | Có suất SCHEDULED endsAt>now | PUT movie | `releaseDate=null` | 409 `RESOURCE_STATE_CONFLICT` |  | Not Run |
| HC01-T11 | REQ-HC01.1 | Bypass UI bằng API trực tiếp | ADMIN token | Gọi POST /api/admin/showtimes | startsAt trước releaseDate | 422, server chặn |  | Not Run |
| HC01-T12 | REQ-HC01.1 | Biên múi giờ VN | releaseDate boundary | Unit/integration | 00:00-00:30 VN quanh boundary | Đúng theo `Asia/Ho_Chi_Minh` |  | Not Run |

### 4.2. HC-02 – Phim ẩn và booking

| TC | REQ | Tên | Tiền điều kiện | Bước thực hiện | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| HC02-T01 | REQ-HC02.1 | History có đủ trường mới | Booking CONFIRMED, movie HIDDEN | GET /api/bookings/me | user owner | Có `cinemaName,roomName,movieStatus,showtimeStatus,endsAt`; field cũ còn |  | Not Run |
| HC02-T02 | REQ-HC02.1 | Detail có đủ trường mới | Cùng điều kiện | GET /api/bookings/{id} | owner | Có `cinemaName,movieStatus,showtimeStatus,endsAt` |  | Not Run |
| HC02-T03 | REQ-HC02.1 | Không rò rỉ cho người khác | Booking của user A | GET detail bằng user B | user B | 403/404 theo hành vi hiện có; không có dữ liệu |  | Not Run |
| HC02-T04 | REQ-HC02.1 | Client cũ đọc field cũ | JSON mới | Parse frontend cũ/compat test | response mới | Không lỗi; field cũ giữ nguyên |  | Not Run |
| HC02-T05 | REQ-HC02.2 | Banner vé còn giá trị | CONFIRMED, SCHEDULED, now<endsAt, movie HIDDEN | Mở MyTickets/Detail/Success | booking id | Thấy thông báo đúng; không nói suất bị hủy |  | Not Run |
| HC02-T06 | REQ-HC02.2 | PENDING không nói vé phát hành | PENDING còn hạn | Mở detail | booking id | Hiển thị giữ chỗ |  | Not Run |
| HC02-T07 | REQ-HC02.2 | EXPIRED/CANCELLED không nói còn giá trị | booking EXPIRED/CANCELLED | Mở detail | booking id | Không banner “vé còn giá trị” |  | Not Run |
| HC02-T08 | REQ-HC02.2 | Suất CANCELLED/kết thúc | showtime CANCELLED hoặc ended | Mở detail | booking id | Không nói “suất vẫn diễn ra” |  | Not Run |
| HC02-T09 | REQ-HC02.2 | Public movie HIDDEN | Movie HIDDEN | Mở /movies/:id | movie id | Thông báo trung tính + link “Vé của tôi”; không bán vé |  | Not Run |
| HC02-T10 | REQ-HC02.2 | Check-in vé hợp lệ phim HIDDEN | CONFIRMED, SCHEDULED, trong khung | Staff check-in | ticket code | Thành công như hiện hành |  | Not Run |
| HC02-T11 | REQ-HC02.1 | Không N+1 history | >=20 bookings | GET /api/bookings/me | page size 20 | Số query ổn định; không tăng theo item |  | Not Run |
| HC02-T12 | REQ-HC02.3 | hide-impact trả đúng số liệu | Movie có suất active + bookings | GET /api/admin/movies/{id}/hide-impact | ADMIN | Đúng counts, earliestStart/latestEnd, không PII |  | Not Run |
| HC02-T13 | REQ-HC02.3 | hide-impact phân quyền | STAFF/CUSTOMER | GET endpoint | token không ADMIN | 403 |  | Not Run |
| HC02-T14 | REQ-HC02.3 | Modal xác nhận khi có cam kết | active commitments > 0 | UI đổi status HIDDEN | click Save | Modal hiện; Cancel không gọi PUT; Confirm mới gọi PUT |  | Not Run |
| HC02-T15 | REQ-HC02.3 | Endpoint lỗi vẫn có cảnh báo | mock hide-impact 500 | UI đổi status HIDDEN | click Save | Cảnh báo chung, không tự hủy, vẫn có thể xác nhận |  | Not Run |

### 4.3. HC-03 – Thời gian dẫn tối thiểu

| TC | REQ | Tên | Tiền điều kiện | Bước thực hiện | Dữ liệu vào | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
|---|---|---|---|---|---|---|---|---|
| HC03-T01 | REQ-HC03.1 | startsAt < now+10m | now stubbed | POST create | now+9m59s | 422 `SCHEDULE_INVALID` |  | Not Run |
| HC03-T02 | REQ-HC03.1 | startsAt == now+10m | now stubbed | POST create | now+10m | Thành công nếu điều kiện khác OK |  | Not Run |
| HC03-T03 | REQ-HC03.1 | startsAt > now+10m | now stubbed | POST create | now+10m1s | Thành công |  | Not Run |
| HC03-T04 | REQ-HC03.1 | Update sang quá khứ | showtime tồn tại | PUT update | startsAt quá khứ | 422 `SCHEDULE_INVALID` |  | Not Run |
| HC03-T05 | REQ-HC03.1 | Bypass UI | ADMIN token | POST API trực tiếp | startsAt < now+10m | 422 |  | Not Run |
| HC03-T06 | REQ-HC03.1 | DateTimePicker minDateTime | Admin form | mở picker | thời gian trước min | Không chọn/không submit giá trị sai |  | Not Run |
| HC03-T07 | REQ-HC03.1 | Race condition submit | thời gian trôi qua | submit form sát min | startsAt vừa hết hạn | Server từ chối, UI hiện lỗi |  | Not Run |
| HC03-T08 | REQ-HC03.1 | Suất cũ quá khứ không bị sửa tự động | có showtime cũ | chạy list/admin/detail | N/A | Không bị xóa/sửa tự động |  | Not Run |

## 5. Kiểm thử hồi quy tối thiểu

| TC | Khu vực | Bước | Kỳ vọng | Trạng thái |
|---|---|---|---|---|
| RG-T01 | Create showtime hợp lệ | tạo suất hợp lệ tương lai | thành công, inventory tạo đủ | Not Run |
| RG-T02 | Overlap/cutoff | tạo suất trùng phòng | 409 `SHOWTIME_OVERLAP` như cũ | Not Run |
| RG-T03 | Booking cutoff 10 phút | đặt vé sát giờ | vẫn theo `BOOKING_CUTOFF_PASSED` | Not Run |
| RG-T04 | Public schedule | GET /movies/{id}/showtimes | không lộ HIDDEN, dữ liệu đúng | Not Run |
| RG-T05 | Booking history/detail cũ | user có booking cũ | field cũ giữ nguyên, trang không crash | Not Run |
| RG-T06 | Frontend build/test/lint | chạy lệnh | pass như baseline | Not Run |
| RG-T07 | Backend tests | `.\mvnw.cmd test` | pass hoặc Blocked do Docker; ghi rõ | Blocked (Docker daemon unavailable, 25/11/2026 baseline) |

## 6. Nhật ký thực thi

| Ngày | Commit | Môi trường | Phạm vi chạy | Kết quả | Người chạy | Ghi chú |
|---|---|---|---|---|---|---|
| 25/11/2026 | `79c7178` | Win32, Node 24.13.0, npm 11.7.0 | `npm run build/test/lint` baseline | Build Pass; Test Pass (26 files/196 tests); Lint Pass (3 warnings) | Nhóm thực hiện | Baseline trước HC |
| 25/11/2026 | `79c7178` | Java 25.0.2, Docker unavailable | `.\mvnw.cmd test` | Blocked | Nhóm thực hiện | `docker info` không kết nối daemon |

## 7. Rủi ro kiểm thử

| Rủi ro | Ảnh hưởng | Giảm thiểu |
|---|---|---|
| Docker/Testcontainers không chạy | Không xác minh integration backend | Ghi Blocked, chạy lại khi Docker sẵn sàng |
| Test cũ giả định không có `DatabaseTime.now()` | False fail sau HC-03 | Cập nhật stub có kiểm soát |
| Dữ liệu demo thiếu booking/movie HIDDEN | Không tái hiện HC-02 | Chuẩn bị fixture/seed test riêng |
| Thay đổi DTO record làm vỡ compile | Chặn chạy test | Compile trước, sửa call sites có chủ đích |

## 8. Lịch sử cập nhật

| Ngày | Nội dung |
|---|---|
| 25/11/2026 | Tạo kế hoạch + test case HC-01/02/03; tất cả Not Run/Blocked theo thực tế |
