# 08. Test Plan, Acceptance Criteria & Traceability

**Mục tiêu:** mỗi business rule quan trọng đều có test tự động, đặc biệt idempotency, expiry, optimistic/pessimistic concurrency và auth. Integration tests chạy với **MySQL thật qua Testcontainers**, không dựa riêng H2 vì locking/ENUM/generated columns có thể khác.

## 1. Danh sách test case nghiệp vụ

| TC | Kịch bản | Kỳ vọng | BR | Loại test |
|---|---|---|---|---|
| TC-01 | Customer giữ một ghế AVAILABLE | Booking PENDING, ghế HELD, TTL 5 phút | 06,07 | Integration |
| TC-02 | Chọn ghế BOOKED | 409; không tạo booking mồ côi | 06 | Integration |
| TC-03 | 20 requests đồng thời giữ ghế A1 | **Chính xác 1 thành công**, 19 xung đột | 06,10 | Concurrency |
| TC-04 | Chọn 3 ghế, 1 ghế đang BOOKED | Toàn bộ rollback; 2 ghế kia vẫn AVAILABLE | 10 | Integration |
| TC-05 | B giành ghế HELD của A đã hết hạn, job A chạy sau | Owner=B; job A không release ghế B | 06,07,15 | Integration |
| TC-06 | Payment SUCCESS đúng hạn | Payment SUCCESS + CONFIRMED + BOOKED + tất cả mã vé | 12,14,17 | Integration |
| TC-07 | Payment ngay sau TTL, scheduler chưa chạy | Không SUCCESS, không mã vé | 12,15 | Integration |
| TC-08 | Payment cùng idempotency key gửi 10 lần | Một SUCCESS, không trùng tickets | 14 | Concurrency |
| TC-09 | Owner hủy PENDING | CANCELLED + release đúng ghế thuộc booking | 15,16 | Integration |
| TC-10 | Hủy CONFIRMED | 409; ghế vẫn BOOKED, payment không thay đổi | 16 | Integration |
| TC-11 | Hai admin tạo 2 showtimes trùng room/cleanup (cả concurrent) | Chỉ một showtime thành công | 02 | Integration |
| TC-12 | Giữ ghế thuộc phòng khác | 422; không ghi booking/hold | 05 | Integration |
| TC-13 | Staff check-in vé CONFIRMED trong thời gian | Một checkin record | 18,21 | Integration |
| TC-14 | Check-in lại cùng ticket (kể cả đồng thời) | Chỉ 1 checkin record; còn lại 409 | 18 | Concurrency |
| TC-15 | Customer đọc booking user khác | 404/403 nhất quán; không lộ dữ liệu | 16,21 | Security |
| TC-16 | Mock FAILED rồi SUCCESS trước hạn | FAILED attempt, vẫn PENDING; sau đó CONFIRMED | 13,14 | Integration |
| TC-17 | clientRequestId trùng: cùng/different payload | Cùng trả booking cũ; khác trả 409 | 09,14 | Integration |
| TC-18 | Scheduler chạy lặp hoặc đồng thời | Idempotent; không release ghế sai | 15 | Integration |
| TC-19 | Đặt sát cutoff 10 phút | `now < cutoff` cho phép; `now >= cutoff` từ chối | 08 | Unit + Integration |
| TC-20 | Giá VIP vs STANDARD, admin sửa giá sau booking | Snapshot unit_price không đổi | 11 | Integration |
| TC-21 | Check-in trước 30 phút hoặc sau ends_at | 422, không ghi check-in | 18 | Integration |
| TC-22 | Thanh toán khác key sau CONFIRMED | 409; duy nhất một SUCCESS | 14 | Integration |
| TC-23 | Admin sửa lịch khi có booking | 409; lịch và seat inventory không đổi | 19,20 | Integration |
| TC-24 | Revenue tổng hợp | Chỉ cộng payments.SUCCESS theo paid_at | 22 | Integration |
| TC-25 | Đăng ký tự chọn ADMIN qua JSON | Không thể tạo ADMIN | 21 | Security |
| TC-26 | Timezone và API UTC → Vietnam | JSON đúng UTC; hiển thị +07 đúng ngày | 07,08 | Unit + E2E |

**Lưu ý:** TC-17…TC-26 mở rộng so với 16 TC trong tài liệu Word gốc để rõ acceptance và lỗi AI thường mắc.

### Kiểm thử Movie — TASK-05

| TC | Kịch bản | Kỳ vọng | Traceability |
|---|---|---|---|
| TC-27 | Guest tra cứu/tìm/lọc/phân trang phim | Chỉ trả phim không HIDDEN; đúng bộ lọc, sort whitelist, giới hạn size; ký tự LIKE là literal | FR-01/15, UC-01 |
| TC-28 | Guest xem chi tiết phim ẩn/không tồn tại | Cùng 404, không lộ metadata phim ẩn | FR-01, UC-01 |
| TC-29 | Admin tạo/sửa metadata, chuyển HIDDEN | 201/200; lưu đúng dữ liệu; phim ẩn không công khai; không xóa lịch sử | FR-04, UC-02, BR-19 |
| TC-30 | Guest/Customer/Staff gọi API ghi phim | 401/403; service cũng kiểm tra ADMIN | FR-04, BR-21, ma trận phân quyền |
| TC-31 | JSON, enum, ngày, độ dài, thời lượng, phân trang/sort sai | 400 VALIDATION_ERROR, không ghi DB | FR-15 |

Mã kiểm thử tại `backend/src/test/java/com/example/cinema/catalog/`: unit service, MockMvc với SecurityConfig thật, integration MySQL Testcontainers chạy Flyway và validate schema. Integration tự skip khi Docker không khả dụng; skip không được coi là pass kiểm chứng MySQL. Movie không có hold/expiry; các TC hết hạn và tranh ghế thuộc module booking, không áp dụng TASK-05. Cập nhật metadata đồng thời theo last-write-wins của DB, chưa có version/ETag; không dùng kiểm thử Movie để chứng minh an toàn concurrency đặt ghế.

### Kiểm thử TASK-06/07/08

| TC | Kịch bản | Kỳ vọng | Traceability |
|---|---|---|---|
| TC-32 | Tạo phòng, batch ghế, trùng tên/vị trí, ghế phòng khác | Validation, 409/404; batch all-or-nothing | FR-04/15, BR-03/19/20 |
| TC-33 | Maintenance và thay đổi cấu hình sau khi có suất | Không tạo inventory cho ghế maintenance; chặn mọi sửa cấu hình đã có suất | GAP-08, BR-05/20 |
| TC-34 | Tạo lịch có cleanup hai phía; hai yêu cầu đồng thời | TC-11: chỉ một thắng; tiếp giáp chính xác hợp lệ; đủ inventory đúng phòng | FR-05, BR-01/02/04 |
| TC-35 | Lỗi ghi inventory sau insert showtime | Rollback toàn bộ lịch/inventory | UC-02 |
| TC-36 | Sửa lịch chưa booking, đổi phòng, lịch sử EXPIRED; booking đồng thời với update | TC-23: giữ inventory khi cùng phòng; chỉ tái tạo khi an toàn; lịch có history bị chặn | BR-19/20, GAP-04 |
| TC-37 | Lịch public theo ngày Việt Nam, lọc rạp, ranh giới 00:00 | TC-26: khoảng UTC nửa mở, không lẫn ngày sau; timestamp UTC có Z | FR-02, NFR-07 |
| TC-38 | Seat map HELD hết hạn/tại hạn/còn hạn, BOOKED và giá VIP | Effective status theo giờ DB, cutoff hiển thị đúng, không ghi DB/không lộ chủ ghế | UC-01, BR-06/07/08/11 |
| TC-39 | Guest/CUSTOMER/STAFF quản trị phòng/ghế/lịch; ADMIN gửi input sai | 401/403 và 400; chỉ ADMIN có quyền ghi | BR-21, FR-15 |
| TC-40 | Giá/thời gian vượt miền, phần giây > ms, SMALLINT UNSIGNED tối đa | Validation 400/422; số nguyên không tràn signed short khi lưu | Schema canonical, NFR-10 |

Test files: `cinema/service/CinemaServiceTest`, `showtime/service/ShowtimeServiceTest`, `showtime/controller/ScheduleControllerTest`, `showtime/ScheduleIntegrationTest` trong `backend/src/test/java/com/example/cinema/`.

`ScheduleIntegrationTest` mặc định chạy MySQL 8.0.36 qua Testcontainers khi Docker khả dụng. Có thể opt-in MySQL 8 thật bằng `CINEMA_IT_JDBC_URL` (schema test **riêng**), `CINEMA_IT_DB_USERNAME`, `CINEMA_IT_DB_PASSWORD`; không dùng schema dev/production. Không có cả Docker lẫn URL opt-in → skip, không coi là pass. Các test concurrency **không** bao transaction ở test thread; fixture và từng worker có transaction độc lập. Test thông thường rollback; các fixture concurrency được commit và còn lại trong DB test riêng khi chạy local.

Test tạo inventory đúng phòng trong TASK-07 không thay thế TC-12 POST booking ghế sai phòng; seat map TASK-08 chỉ công bố bookingClosesAt, không chứng minh TC-19 tại POST. Hai phần kiểm thử POST này được bổ sung riêng trong TASK-09..12 bên dưới.

**Kết quả TASK-06/07/08 trước khi thêm booking (2026-11-03):** Windows, Java 17.0.20.1, MySQL 8.0 local với schema riêng `cinema_tasks678_it_20261103`; Flyway V1/V2 và Hibernate validate thành công. Chạy từ `backend`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
$env:CINEMA_IT_JDBC_URL = 'jdbc:mysql://localhost:3306/cinema_tasks678_it_20261103?createDatabaseIfNotExist=true&serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true'
.\mvnw.cmd verify
```

BUILD SUCCESS; tổng 98 test: **94 đạt, 0 failures/errors, 4 skipped**. Các test mới: CinemaServiceTest 8, ShowtimeServiceTest 14, ScheduleControllerTest 19, ScheduleIntegrationTest 15 — **56/56 đạt**, gồm các test concurrency/rollback/biên UNSIGNED 65535. Bốn test MovieIntegrationTest cũ bị skip do Docker daemon không khả dụng, không coi là đã kiểm chứng qua Testcontainers. Các test TASK-06/07/08 thực sự chạy trên MySQL local, không phải H2 hoặc mock DB. Đã đóng gói Spring Boot JAR trong `backend/target/`.

### Bổ sung TASK-09..12 — Booking và concurrency

Các test tại `backend/src/test/java/com/example/cinema/booking/`:

| Nhóm | Test/acceptance | BR/TC |
|---|---|---|
| Hold/snapshot | PENDING, TTL đúng 300s theo DB, HELD + owner/version đúng, VIP/STANDARD, chưa có ticket | BR-06/07/11, TC-01/20 |
| Atomicity | Ghế BOOKED trong yêu cầu nhiều ghế; lỗi insert booking_seats sau khi đổi inventory → rollback toàn bộ, không orphan | BR-06/10, TC-02/04 |
| Race ghế | 20 worker cùng một ghế: đúng 1 thắng/19 SEAT_UNAVAILABLE; 2 tập ghế đảo thứ tự: cùng thứ tự lock, không thắng một phần; ghế độc lập cùng thành công | BR-06/10, TC-03 |
| Idempotency | 20 retry cùng key/tập ghế đảo thứ tự → một booking, một created; khác payload/showtime → 409; key scope theo user; replay terminal không giữ lại | BR-09/14, TC-17 |
| Expiry/reclaim | B giành ghế hết hạn trước job A; cleanup A sau hoặc chạy đồng thời không release B; nhiều job chỉ expire một lần | BR-06/07/15, TC-05/18 |
| Cancel | Owner PENDING, cancel lặp/concurrent, cancel tranh với create; CONFIRMED bị chặn; expired trả 409, không persist nhầm EXPIRED do throw/rollback | BR-15/16/19, TC-09/10 |
| Quyền/lịch sử | Owner khác 404, ADMIN support read, STAFF/ADMIN không tạo/hủy; userId/total giả bị bỏ qua; history chỉ owner, snapshot và effective EXPIRED, GET không ghi | BR-16/21, TC-15 |
| Input/phòng | Ghế sai phòng, maintenance/thiếu inventory; 1–8 số nguyên dương duy nhất, strict integer JSON, key bắt buộc; bảo vệ liên bảng | BR-05/09, TC-12 |
| Biên giờ/giá | Trước cutoff 1ms cho phép, tại/sau cutoff chặn; đọc lại giờ sau khóa; own TTL hết khi chờ; expiry tại mốc; tổng tiền không tràn DECIMAL | BR-07/08/11, TC-19/20 |
| Retry/lock | Unit test thứ tự booking → từng inventory ID tăng dần, conditional release, retry deadlock cùng payload tối đa 3 lần, unique conflict qua query transaction mới | BR-10/14/15, Architecture |

`BookingIntegrationTest` chạy MySQL 8 thật: mặc định Testcontainers 8.0.36, hoặc URL opt-in `CINEMA_IT_JDBC_URL` tới schema riêng như các test schedule. Không có DB khả dụng thì skip, không coi là pass. Không bao @Transactional ở test thread; fixture commit trong transaction riêng, mỗi request/worker có connection/transaction độc lập. Mỗi test dùng room/showtime/customer mới, không hardcode ID hoặc dựa dữ liệu các test trước. Local test DB giữ lại fixture đã commit, không xóa schema tự động.

Test biên cutoff/TTL điều khiển riêng `DatabaseTime` bằng spy, không Thread.sleep chờ 5 phút; các race thông thường dùng UTC_TIMESTAMP(3) thật. Native SQL chỉ dùng để chuẩn bị fixture lỗi/quá hạn/xác nhận/sửa giá vượt admin policy, tăng version khi sửa inventory và không trộn entity đang managed. Fixture CONFIRMED chỉ phục vụ quy tắc cancel, không chứng minh payment/ticket đã triển khai. TC-06/07/08/16/22 về thanh toán tiếp tục thuộc TASK-13/14.

**Kết quả TASK-09..12 (2026-11-03):** Java 17.0.20.1, MySQL 8.0 local, schema test riêng `cinema_booking_it_20261103`, Flyway V1/V2 + Hibernate validate. Lệnh từ `backend`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
$env:CINEMA_IT_JDBC_URL = 'jdbc:mysql://localhost:3306/cinema_booking_it_20261103?createDatabaseIfNotExist=true&serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true'
.\mvnw.cmd verify
```

BUILD SUCCESS và đóng gói JAR; **160 tổng, 156 đạt, 0 failures/errors, 4 skipped** (MovieIntegrationTest cũ do Docker daemon không khả dụng). **62/62 test booking mới đạt**: BookingIntegrationTest 31, BookingControllerTest 18, BookingServiceTest 8, BookingTransactionsTest 3, BookingExpiryServiceTest 2. Đã thực thi race 20 request cùng ghế (1 thắng/19 SEAT_UNAVAILABLE), 20 request cùng key (1 created/19 replay), cleanup/reclaim/cancel đồng thời và rollback lỗi ghi. Integration thực sự chạy MySQL, không H2/mock DB. Một lần chạy integration ban đầu bị timeout 120s lúc khởi tạo context, đã chạy lại với giới hạn 360s và đạt; không tính lần timeout là pass. Chưa kiểm chứng chạy container Docker trên máy này.

### Cloudinary poster — FR-04/15, UC-02 (2026-11-04)

| TC | Kịch bản | Kỳ vọng |
|---|---|---|
| TC-41 | ADMIN upload JPEG/PNG vào phim có sẵn | 200 Movie DTO, secure_url lưu DB, GET public trả URL mới, metadata khác không đổi |
| TC-42 | Rỗng/quá 5 MiB, MIME giả, SVG/GIF, PNG hỏng, dimensions quá lớn, stream khai sai size | 400/413/415 phù hợp, không gọi provider; re-encode bỏ trailing payload |
| TC-43 | Guest/CUSTOMER/STAFF upload, hoặc thiếu part/sai Content-Type | 401/403/400/415, không gọi service/provider trái phép; service cũng kiểm tra ADMIN |
| TC-44 | Upload thành công nhưng DB thất bại; hai upload đồng thời | DB rollback giữ URL cũ khi lỗi; URL attach sau cùng có hiệu lực khi đồng thời; không tự xóa asset remote |
| TC-45 | Thiếu credential, provider exception/URL không an toàn/quá dài; SDK HTTP5 thật qua loopback stub | 503/502, không lộ credential/message gốc; request signed multipart, không overwrite, URL HTTPS |

Test files: `catalog/service/PosterValidatorTest`, `MoviePosterServiceTest`, `catalog/storage/CloudinaryPosterStorageTest`, `catalog/controller/MoviePosterControllerTest`, `catalog/MoviePosterIntegrationTest`. MySQL integration dùng schema riêng qua CINEMA_IT_JDBC_URL hoặc Testcontainers. Không cần credential Cloudinary thật: provider được mock, thêm một HTTP server loopback để kiểm chứng transport SDK/dependency/signing thật. Không gửi ảnh/secret lên Cloudinary trong automated tests. Chưa coi đây là kiểm chứng end-to-end tài khoản Cloudinary thật.

**Kết quả 2026-11-04:** Windows/Java 17.0.20.1, MySQL 8.0 local với schema test riêng `cinema_cloudinary_it_20261104`. Từ `backend` đã chạy:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
$env:CINEMA_IT_JDBC_URL = 'jdbc:mysql://localhost:3306/cinema_cloudinary_it_20261104?createDatabaseIfNotExist=true&serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true'
.\mvnw.cmd verify
```

BUILD SUCCESS; **192 tổng, 188 đạt, 0 failures/errors, 4 skipped** (MovieIntegrationTest cũ cần Docker). **32/32 test poster mới đạt**: validator 10, service 4, SDK/adapter 5 (có signed HTTP loopback), controller 8, MySQL integration 5 (có rollback/concurrent upload và kiểm tra không có DB transaction trong provider call). Cloudinary credential thật chưa được cấu hình/kiểm chứng trong lần chạy; test không gọi cloud thật. Không thay DDL, Flyway/schema validate và các regression booking/showtime đều chạy đạt.

### Kết quả tuần 4 — TASK-13..16 (2026-11-04)

Traceability: FR-08/11/12/13/14/15, UC-04/07/08/09, BR-12..15/17/18/21/22.

| Test | Coverage |
|---|---|
| `payment/service/PaymentTransactionsTest` (7) | Booking → từng inventory tăng dần → DB clock; hết TTL trong khi chờ; ghế đổi owner/sai suất/sai phòng; FAILED không phát vé; ownership trước tra key. |
| `payment/controller/PaymentTicketControllerTest` (23) | SecurityConfig thật, ma trận Guest/CUSTOMER/STAFF/ADMIN cho payment/tickets/check-in/revenue; JSON/result ordinal/key/code/ngày sai; response UTC và error envelope 400/401/403/404/409/422. |
| `payment/PaymentIntegrationTest` (29) | TC-06/07/08/13/14/16/21/22/24: atomic SUCCESS/snapshot/versions, FAILED→SUCCESS/replay lịch sử, 10 payment cùng key, 10 key khác nhau/booking, global key tranh hai booking, payment vs cancel/cleanup/reclaim, TTL biên, mọi ghế còn HELD, snapshot tổng sai, collision vé rollback, generated UNIQUE thực, ownership/admin support, check-in staff/duplicate/concurrent/cửa sổ ±1ms/suất hủy/booking chưa xác nhận, revenue loại FAILED/INITIATED và ranh giới ngày Việt Nam. |

Integration mặc định Testcontainers MySQL 8.0.36 hoặc opt-in `CINEMA_IT_JDBC_URL` tới schema test riêng; không H2, không transaction bao ngoài concurrency. Fixture được commit, không tự xóa schema local; report fixture SQL có paid_at lịch sử độc lập TTL. Unit/mock clock chỉ điều khiển biên giờ; race dùng DB transaction độc lập. Không gọi payment gateway hoặc Cloudinary thật.

Lần kiểm chứng trên Windows/Java 17.0.20.1/MySQL 8.0.45 local, từ `backend`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot'
$env:CINEMA_IT_JDBC_URL = 'jdbc:mysql://localhost:3306/cinema_week4_it_20261104?createDatabaseIfNotExist=true&serverTimezone=UTC&useSSL=false&allowPublicKeyRetrieval=true'
$env:DB_NAME = 'cinema_week4_it_20261104' # context smoke test cũ cũng dùng schema test riêng
.\mvnw.cmd verify
```

**BUILD SUCCESS, 251 tests: 247 đạt, 0 failures/errors, 4 skipped** (MovieIntegrationTest cũ cần Docker). **59/59 test mới đạt**, gồm 29 integration thực sự chạy MySQL/Flyway V1/V2 + Hibernate validate. JAR tại `backend/target/cinema-backend-1.0.0-SNAPSHOT.jar`. Chưa kiểm chứng Docker/Testcontainers trên máy này; không coi 4 skipped là pass. Không dùng kết quả này để đánh dấu UI/E2E manual Tuần 5 hoàn thành.

## 2. Fixture tối thiểu

- Một cinema ACTIVE, hai room ACTIVE; mỗi room 30–50 ghế STANDARD/VIP.
- 3 movies; ít nhất 4 showtime không trùng lịch.
- 1 ADMIN, 1 STAFF, 2 CUSTOMER; hash passwords (không commit tài khoản thật).
- Showtime A ngày 10/11/2026: `startsAt=2026-11-10T12:00:00Z`, `endsAt=2026-11-10T14:00:00Z`, `cleanup=15`, `basePrice=75000`, `vipSurcharge=20000`.
- Ghế A1, A2 STANDARD; B1 VIP; các ID sinh từ seed, **không hardcode ID trong tests**.

## 3. Concurrency test mẫu (đặc tả, không phải kết quả đã chạy)

```text
Given Showtime A và seat A1 đang AVAILABLE
When khởi động 20 threads cùng lúc bằng CountDownLatch
  mỗi thread dùng 1 user/clientRequestId khác nhau
  gọi createBooking(showtimeA, [A1]) qua Spring service/HTTP
Then tổng số booking create thành công = 1
  các request còn lại = 409 hoặc domain conflict
  showtime_seats(A1).current_booking_id trỏ tới booking duy nhất
  không tồn tại booking PENDING với thiếu booking_seats
```

**Test stack:** JUnit 5, Spring Boot Test, `@SpringBootTest`, Testcontainers MySQL, Awaitility (tùy chọn), ExecutorService/CountDownLatch. **Không dùng `@Transactional` bao ngoài test concurrency** khiến data visibility không phản ánh thực tế: thread khác không thấy dữ liệu uncommitted của test thread.

## 4. Ma trận traceability theo use case

| UC | BR chính | API chính | TC |
|---|---|---|---|
| UC-01 | 01,04,05,06 | GET movies/showtimes/seats | 12,19,26 |
| UC-02 | 01,02,03,04,05,19,20,21 | POST/PUT admin showtimes | 11,23 |
| UC-03 | 05,06,07,08,09,10,11,14 | POST bookings | 01,02,03,04,05,12,17,19,20 |
| UC-04 | 12,13,14,15,17 | POST payments/mock | 06,07,08,16,22 |
| UC-05 | 15,16 | POST cancel | 09,10 |
| UC-06 | 06,07,15 | Scheduled job | 05,07,18 |
| UC-07 | 17,18,21 | POST ticket check-in | 13,14,21 |
| UC-08 | 16,17,21 | GET bookings/me, {id}, tickets | 15 |
| UC-09 | 22 | GET revenue | 24 |

## 5. Definition of Done cho một use case

- [ ] Business logic phù hợp BR được trích rõ.
- [ ] DTO input validation; role + ownership đầy đủ.
- [ ] DB migration/repository/entity đúng schema.
- [ ] Nếu nhiều bảng thay đổi: transaction và rollback tests.
- [ ] Success, business errors và invalid auth có integration tests.
- [ ] Nếu có race/idempotency: Testcontainers concurrency test.
- [ ] Error JSON và HTTP status phù hợp API contract.
- [ ] Các thay đổi hợp đồng API/DB đã cập nhật trong Markdown.
- [ ] Chạy tests (hoặc báo rõ test chưa chạy, không suy đoán kết quả).

## 6. Kiểm thử thủ công trên demo

1. Browser A và B mở cùng showtime; A/B cùng bấm ghế A1.
2. A giữ thành công. B nhận thông báo ghế không còn khả dụng; UI B cập nhật.
3. A thanh toán FAILED; booking vẫn giữ và có thể retry trong TTL.
4. A retry với **key khác** để mô phỏng SUCCESS; nhận ticket code.
5. Staff check-in vé một lần; lần hai nhận 409.
6. Admin xem revenue; kiểm tra chỉ SUCCESS được tính.
7. Lặp với một booking khác để thời hạn 5 phút kết thúc; xác minh có thể giành ghế an toàn.
