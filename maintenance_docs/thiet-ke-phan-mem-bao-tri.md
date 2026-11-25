# THIẾT KẾ PHẦN MỀM BẢO TRÌ (SDD)
## Hệ thống đặt vé xem phim Cinema – HC-01, HC-02, HC-03

**Học phần:** Bảo trì phần mềm – CT244  
**Dự án:** Cinema – hệ thống đặt vé xem phim  
**Phiên bản tài liệu:** 0.1 – bản dự thảo  
**Ngày lập:** 25/11/2026  
**Người lập:** Nhóm thực hiện Project 2  
**Trạng thái:** **Draft – chưa phê duyệt**. Quyết định D-01…D-07 đã chốt kỹ thuật; phiếu phê duyệt CR chưa ký.

> Tài liệu mô tả **cách hệ thống đáp ứng yêu cầu** sau thay đổi. Không thay thế SRS. Mã nguồn tại commit kiểm tra và kết quả lệnh thực tế là nguồn có thẩm quyền. Không ghi “Pass” cho nội dung chưa chạy.

### Bảng theo dõi phiên bản

| Phiên bản | Ngày | Người cập nhật | Nội dung | Trạng thái |
|---|---|---|---|---|
| 0.1 | 25/11/2026 | Nhóm thực hiện | Khung SDD, thiết kế DES-HC01/02/03, dữ liệu, UI, RTM | Nháp |
| 1.0 | | | Sau khi CR/SDD được phê duyệt | Chưa thực hiện |

---

## 1. Giới thiệu

### 1.1. Mục đích

Xác định thiết kế kỹ thuật cho các thay đổi HC-01/02/03: kiểm tra ngày khởi chiếu và thời gian dẫn khi tạo/sửa suất chiếu, bảo vệ `releaseDate`, bổ sung dữ liệu booking cho trường hợp phim bị ẩn, cảnh báo tác động trước khi ẩn phim, và cập nhật giao diện tương ứng.

### 1.2. Nhóm người đọc

| Đối tượng | Sử dụng |
|---|---|
| Lập trình viên backend/frontend | Vị trí thay đổi, chữ ký API/DTO, quy tắc, UI state |
| Kiểm thử | Ánh xạ REQ→DES→TC, điều kiện biên, trạng thái lỗi |
| Người phê duyệt/giảng viên | Phạm vi, quyết định, rủi ro, truy vết |
| Người bảo trì tiếp theo | Hiểu vì sao có kiểm tra thời gian, vì sao DTO additive |

### 1.3. Phạm vi sản phẩm

**Trong phạm vi:** `ShowtimeService.validateSchedule/create/update`, `MovieService.update/apply`, `BookingQueries`, booking DTOs, `AdminShowtimeFormPage`, `DateTimePicker`, `AdminMovieForm`, trang booking/ticket/movie public, endpoint `GET /api/admin/movies/{id}/hide-impact`, test liên quan.

**Ngoài phạm vi:** hủy suất/hoàn tiền/đổi vé, thay đổi cutoff booking 10 phút, thay đổi authz, migration bắt buộc, auto-fix dữ liệu cũ, mở lại bán vé phim `HIDDEN`.

### 1.4. Bảng chú giải thuật ngữ

| Thuật ngữ | Giải thích |
|---|---|
| DES | Mã thiết kế bảo trì |
| DTO | Data Transfer Object, hợp đồng JSON giữa BE/FE |
| Additive | Chỉ thêm trường/hành vi; không đổi nghĩa trường cũ |
| `DatabaseTime` | Nguồn thời gian DB (`SELECT UTC_TIMESTAMP(3)`) |
| Lead time | Thời gian tối thiểu từ `now` đến `startsAt` |
| Hide impact | Số suất/booking còn hiệu lực khi phim bị ẩn |
| N+1 | Số query tăng theo số phần tử danh sách |

### 1.5. Tài liệu tham khảo

| Tài liệu | Vị trí |
|---|---|
| SRS bảo trì | `maintenance_docs/dac-ta-yeu-cau-bao-tri.md` |
| Phân tích tác động | `maintenance_docs/phan-tich-tac-dong-hieu-chinh.md` |
| Kế hoạch bảo trì | `maintenance_docs/ke-hoach-bao-tri-hieu-chinh.md` |
| Thiết kế gốc (trích xuất) | `maintenance_docs/nguon/thiet-ke-he-thong-dat-ve-xem-phim.md` |
| Mã nguồn baseline | commit `79c7178` |

### 1.6. Quy ước trình bày

`[UNCHANGED]` giữ nguyên; `[MODIFIED]` điều chỉnh; `[NEW]` thêm mới. Mã thiết kế: `DES-HC01-*`, `DES-HC02-*`, `DES-HC03-*`. Đường dẫn file dùng đường dẫn repo tương đối.

---

## 2. Kiến trúc và phân rã

### 2.1. Thiết kế kiến trúc `[MODIFIED]`

Kiến trúc tổng thể giữ nguyên: React SPA + Spring Boot REST + MySQL. Thay đổi nằm trong lớp validation/service, DTO, controller admin movie, và UI admin/customer.

```mermaid
flowchart LR
    subgraph FE[Frontend React]
        A[AdminShowtimeFormPage]
        B[DateTimePicker]
        C[AdminMovieForm]
        D[MyTickets/BookingDetail/Success]
        E[Public Movie Detail]
    end
    subgraph BE[Backend Spring Boot]
        F[ShowtimeService]
        G[MovieService]
        H[AdminMovieController]
        I[BookingQueries]
        J[DatabaseTime]
        K[(MySQL)]
    end
    A --> B
    A -->|POST/PUT /api/admin/showtimes| F
    C -->|GET hide-impact| H
    C -->|PUT /api/admin/movies/{id}| G
    D -->|GET /api/bookings/me,/{id}| I
    E -->|GET /api/movies/{id}| G
    F --> J
    G --> J
    H --> G
    F --> K
    G --> K
    I --> K
```

**Ràng buộc kiến trúc:** không thêm service ngoài; không đổi security filter chain; không đổi route cũ; không dùng `Instant.now()` trong nghiệp vụ lịch chiếu.

### 2.2. Mô tả sự phân rã `[MODIFIED]`

| Thành phần | Trạng thái | Trách nhiệm sau thay đổi |
|---|---|---|
| `ShowtimeService` | `[MODIFIED]` | Kiểm tra `releaseDate`, lead time 10 phút, nguồn `DatabaseTime` |
| `MovieService` | `[MODIFIED]` | Chặn đổi `releaseDate`/NULL khi làm suất SCHEDULED chưa kết thúc vi phạm; cung cấp hide-impact |
| `AdminMovieController` | `[MODIFIED]` | Thêm `GET /{id}/hide-impact` (ADMIN) |
| `ShowtimeRepository` | `[MODIFIED]` | Truy vấn suất SCHEDULED chưa kết thúc theo movie cho validation/impact |
| `BookingRepository`/query | `[MODIFIED]` | Đếm booking CONFIRMED/PENDING còn hiệu lực theo movie/showtimes active |
| `BookingSummaryResponse`, `BookingDetailResponse` | `[MODIFIED]` | Thêm trường additive cho HC-02 |
| `BookingQueries` | `[MODIFIED]` | Map trường mới, giữ EntityGraph, không N+1 |
| `DateTimePicker` | `[MODIFIED]` | Hỗ trợ `minDateTime`/chặn chọn quá khứ |
| `AdminShowtimeFormPage` | `[MODIFIED]` | Hiển thị `releaseDate`, tính min datetime, chặn submit sai |
| `AdminMovieForm` | `[MODIFIED]` | Gọi hide-impact, modal xác nhận, xử lý lỗi endpoint |
| `MyTicketsPage`, `BookingDetailPage`, `BookingSuccessPage` | `[MODIFIED]` | Hiển thị thông tin rạp/trạng thái, thông báo theo rule HC-02 |
| Public movie page/component | `[MODIFIED]` | Thông báo trung tính + link “Vé của tôi” khi HIDDEN/404 |

### 2.3. Cơ sở thiết kế

| Quyết định | Lý do | Đánh đổi |
|---|---|---|
| Server-side validation là bắt buộc | Client có thể bypass | Thêm query/logic server |
| `DatabaseTime` cho HC-03 | Đồng bộ DB, test stub được | Cần stub trong unit test create/update |
| DTO additive | Không gãy client cũ | Payload lớn hơn chút |
| Endpoint hide-impact riêng | Không ép client tính từ list lớn | Thêm endpoint mới, cần quyền ADMIN |
| Không migration bắt buộc | Giảm rủi ro rollout | Index D-07 chỉ khi đo chậm |
| Không auto-fix dữ liệu cũ | Tránh hủy/dời cam kết | Dữ liệu cũ vi phạm vẫn cần xử lý thủ công |

---

## 3. Thiết kế dữ liệu

### 3.1. Mô tả dữ liệu `[UNCHANGED/MODIFIED]`

Không thêm bảng/cột bắt buộc. Sử dụng cột hiện có:

| Bảng | Cột dùng | Mục đích |
|---|---|---|
| `movies` | `id`, `title`, `release_date`, `status` | HC-01, HC-02, HC-03 |
| `showtimes` | `id`, `movie_id`, `starts_at`, `ends_at`, `status` | Validate, hide-impact |
| `bookings` | `id`, `showtime_id`, `status`, `expires_at`, `user_id` | Hide-impact, history/detail |
| `booking_seats` | `booking_id`, `showtime_seat_id` | Detail seats, không đổi |
| `showtime_seats` | `id`, `seat_id` | Mapping hiện có |
| `rooms`, `cinemas` | `name`, `status` | DTO/display |

**Index (D-07, chỉ khi đo chậm):** cân nhắc index cho truy vấn hide-impact/count theo `showtimes(movie_id,status,ends_at)` và `bookings(showtime_id,status,expires_at)`. Không tạo trong phạm vi này nếu chưa có bằng chứng chậm.

### 3.2. Từ điển dữ liệu thay đổi

#### 3.2.1. DTO booking – bổ sung `[MODIFIED]`

| DTO | Trường | Kiểu | Nguồn | Ghi chú |
|---|---|---|---|---|
| `BookingSummaryResponse` | `cinemaName` | `String` | `booking.showtime.room.cinema.name` | `[NEW]` |
| `BookingSummaryResponse` | `roomName` | `String` | `booking.showtime.room.name` | `[NEW]` |
| `BookingSummaryResponse` | `movieStatus` | `MovieStatus` | `booking.showtime.movie.status` | `[NEW]` |
| `BookingSummaryResponse` | `showtimeStatus` | `ShowtimeStatus` | `booking.showtime.status` | `[NEW]` |
| `BookingSummaryResponse` | `endsAt` | `Instant` | `booking.showtime.endsAt` | `[NEW]` |
| `BookingDetailResponse` | `cinemaName` | `String` | `showtime.room.cinema.name` | `[NEW]` |
| `BookingDetailResponse` | `movieStatus` | `MovieStatus` | `showtime.movie.status` | `[NEW]` |
| `BookingDetailResponse` | `showtimeStatus` | `ShowtimeStatus` | `showtime.status` | `[NEW]` |
| `BookingDetailResponse` | `endsAt` | `Instant` | `showtime.endsAt` | `[NEW]` |

Tất cả trường cũ giữ nguyên tên, kiểu, thứ tự ngữ nghĩa. Java record sẽ thay đổi constructor; cần cập nhật mọi nơi tạo record.

#### 3.2.2. Hide-impact response `[NEW]`

| Trường | Kiểu | Mô tả |
|---|---|---|
| `movieId` | `Long` | ID phim |
| `title` | `String` | Tên phim |
| `activeShowtimes` | `long` | Số suất `SCHEDULED`, `endsAt > now` |
| `confirmedBookings` | `long` | Booking `CONFIRMED` thuộc suất active |
| `pendingBookings` | `long` | Booking `PENDING`, `expiresAt > now`, thuộc suất active |
| `earliestStart` | `Instant?` | `startsAt` sớm nhất trong suất active; null nếu không có |
| `latestEnd` | `Instant?` | `endsAt` muộn nhất trong suất active; null nếu không có |

Không bao gồm PII, booking IDs, seat labels, ticket codes.

#### 3.2.3. Frontend types `[MODIFIED]`

`frontend/src/features/bookings/types/booking.types.ts`: thêm các field mới vào `BookingSummaryItem` và `BookingDetailResponse`. Kiểu `movieStatus`/`showtimeStatus` dùng string union hoặc type alias phù hợp với backend enum.

---

## 4. Thiết kế chi tiết

### 4.1. Thiết kế chức năng điều chỉnh

#### DES-HC01-VAL – Validate releaseDate khi tạo/sửa suất `[MODIFIED]`

| Trường | Nội dung |
|---|---|
| Mã | `DES-HC01-VAL` |
| REQ | `REQ-HC01.1` |
| File | `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java` |
| Điểm chèn | `validateSchedule()` (hiện tại dòng ~251) và/hoặc sau `movieForSchedule()` |

**Cách xử lý:**

1. `movieForSchedule()` giữ nguyên chặn `HIDDEN` (`MOVIE_UNAVAILABLE`).
2. Trong `validateSchedule(request, movie)`, sau kiểm tra thời gian cơ bản hoặc trước overlap:
   - `LocalDate releaseDate = movie.getReleaseDate();`
   - Nếu `releaseDate == null`: throw `AppException(ErrorCode.SCHEDULE_INVALID, "Phim chưa có ngày khởi chiếu; vui lòng cập nhật trước khi lập lịch.")`.
   - `LocalDate startDateVn = request.startsAt().atZone(VIETNAM).toLocalDate();`
   - Nếu `startDateVn.isBefore(releaseDate)`: throw `SCHEDULE_INVALID` với message nêu ngày khởi chiếu.
3. Áp dụng cho cả `create` và `update` vì cả hai gọi `validateSchedule`.
4. Không thêm field client; server đọc từ DB.

**Ràng buộc:** dùng `ZoneId.of("Asia/Ho_Chi_Minh")` đã có; không dùng system default. Không đổi chữ ký method public.

#### DES-HC01-REL – Bảo vệ thay đổi releaseDate `[MODIFIED]`

| Trường | Nội dung |
|---|---|
| Mã | `DES-HC01-REL` |
| REQ | `REQ-HC01.2` |
| File | `backend/src/main/java/com/example/cinema/catalog/service/MovieService.java`, `ShowtimeRepository` |

**Cách xử lý:**

1. Trong `update()`/`apply()` hoặc trước khi apply, xác định `oldRelease = movie.getReleaseDate()`, `newRelease = request.releaseDate()`.
2. Nếu cần kiểm tra (new muộn hơn old, hoặc old null và new có giá trị, hoặc new null trong khi có suất chưa kết thúc):
   - `Instant now = databaseTime.now()` (inject `DatabaseTime` vào `MovieService` nếu chưa có; kiểm tra constructor hiện tại).
   - Truy vấn suất vi phạm: `SCHEDULED`, `endsAt > now`, và `startsAt < newReleaseStartVn` khi newRelease != null; khi newRelease == null thì bất kỳ suất chưa kết thúc nào cũng vi phạm.
   - Nếu có vi phạm: throw `RESOURCE_STATE_CONFLICT` với message gồm số suất và earliest start.
3. Nếu newRelease sớm hơn hoặc bằng oldRelease: không chặn.
4. Không tự sửa/xóa showtimes/bookings.

**Repository query đề xuất:**

```java
@Query("select count(s), min(s.startsAt) from Showtime s where s.movie.id = :movieId and s.status = 'SCHEDULED' and s.endsAt > :now and (:releaseStart is null or s.startsAt < :releaseStart)")
Object[] countConflictingRelease(Long movieId, Instant now, Instant releaseStart);
```

Hoặc dùng count + min riêng; giữ đơn giản, đọc rõ.

#### DES-HC03-LEAD – Kiểm tra thời gian dẫn tối thiểu `[MODIFIED]`

| Trường | Nội dung |
|---|---|
| Mã | `DES-HC03-LEAD` |
| REQ | `REQ-HC03.1` |
| File | `ShowtimeService.java`, `DateTimePicker.tsx`, `AdminShowtimeFormPage.tsx` |

**Backend:**

1. Trong `validateSchedule`, lấy `Instant now = databaseTime.now()`.
2. `Instant earliest = now.plus(10, ChronoUnit.MINUTES);`
3. Nếu `request.startsAt().isBefore(earliest)`: throw `SCHEDULE_INVALID` với message "Giờ bắt đầu phải cách thời điểm hiện tại ít nhất 10 phút."
4. Áp dụng create và update.

**Frontend:**

1. `DateTimePicker`: thêm prop `minDateTime?: string` (local VN `yyyy-MM-ddTHH:mm`). Disable/không cho chọn ngày trước min date; khi chọn ngày bằng min date, chặn giờ/phút trước min time hoặc hiển thị disabled. Giữ behavior cũ khi prop không truyền.
2. `AdminShowtimeFormPage`: tính `minDateTime` = now VN + 10 phút, cập nhật định kỳ nhẹ hoặc khi mở form/submit. Trước submit, nếu `startsAt < minDateTime` thì set error, không gọi API.
3. Vẫn hiển thị lỗi server khi race condition.

**Ràng buộc:** không dùng `Instant.now()` ở service; `DateTimePicker` dùng giờ VN hiện có.

#### DES-HC02-DTO – Bổ sung DTO booking `[MODIFIED]`

| Trường | Nội dung |
|---|---|
| Mã | `DES-HC02-DTO` |
| REQ | `REQ-HC02.1` |
| File | `BookingSummaryResponse.java`, `BookingDetailResponse.java`, `BookingQueries.java`, `booking.types.ts` |

**Cách xử lý:**

1. Thêm fields additive như mục 3.2.1.
2. `BookingQueries.history`: map từ `booking.getShowtime().getMovie().getStatus()`, `getShowtime().getStatus()`, `getShowtime().getEndsAt()`, `getShowtime().getRoom().getName()`, `getShowtime().getRoom().getCinema().getName()`. Đảm bảo query đã fetch join cần thiết; kiểm tra `BookingRepository.findByUserId` EntityGraph có `showtime.room.cinema`, `showtime.movie`.
3. `BookingQueries.detail`: tương tự, dùng quan hệ đã có.
4. Không gọi public movie endpoint. Không thay đổi authorization.

**Rủi ro:** thay đổi Java record signature làm vỡ call sites; cần cập nhật tất cả constructor usages/tests.

#### DES-HC02-UI – Thông báo phim bị ẩn trên booking/ticket `[MODIFIED]`

| Trường | Nội dung |
|---|---|
| Mã | `DES-HC02-UI` |
| REQ | `REQ-HC02.2` |
| File | `MyTicketsPage.tsx`, `BookingDetailPage.tsx`, `BookingSuccessPage.tsx`, public movie detail page/component |

**Quy tắc hiển thị:**

| Điều kiện | Hành vi |
|---|---|
| `movieStatus=HIDDEN` và `showtimeStatus=SCHEDULED` và `effectiveStatus=CONFIRMED` và `now < endsAt` | Banner/info: phim ngừng hiển thị để đặt mới; suất vẫn diễn ra; vé đã thanh toán vẫn có giá trị sử dụng. Link “Vé của tôi”/chi tiết không cần. |
| `effectiveStatus=PENDING` | Hiển thị giữ chỗ; không nói “vé đã phát hành”. |
| `EXPIRED/CANCELLED/FAILED` | Hiển thị trạng thái thực; không nói vé còn giá trị. |
| `showtimeStatus=CANCELLED` hoặc đã kết thúc | Không nói “suất vẫn diễn ra”. |
| Public movie HIDDEN/404 do ẩn | Thông báo trung tính + link “Vé của tôi”. Không lộ booking người khác. |

**UI:** dùng component Alert/Banner hiện có, tone phù hợp (amber/info), không phá layout dark cinematic. Không hardcode “Hợp lệ”.

### 4.2. Thiết kế chức năng mới

#### DES-HC02-IMPACT – Endpoint và UI cảnh báo trước khi ẩn phim `[NEW]`

| Trường | Nội dung |
|---|---|
| Mã | `DES-HC02-IMPACT` |
| REQ | `REQ-HC02.3` |
| File | `AdminMovieController.java`, `MovieService.java`/service chuyên biệt, repository query, `AdminMovieForm.tsx`, `movies.api.ts` |

**API:**

- `GET /api/admin/movies/{id}/hide-impact`
- Auth: `ADMIN` (class-level `@PreAuthorize` đã có).
- 404 nếu movie không tồn tại.
- Response: `MovieHideImpactResponse` (mục 3.2.2).

**Query logic:**

- `now = databaseTime.now()`
- `activeShowtimes`: count showtimes where `movie.id=id`, `status=SCHEDULED`, `endsAt > now`.
- `confirmedBookings`: count bookings where showtime in active showtimes and `status=CONFIRMED`.
- `pendingBookings`: count bookings where showtime in active showtimes and `status=PENDING` and `expiresAt > now`.
- `earliestStart/latestEnd`: min/max từ active showtimes.

Có thể dùng 1-3 query rõ ràng; ưu tiên đúng và dễ đọc. Tránh N+1. Nếu chậm, D-07 xem xét index.

**Frontend AdminMovieForm:**

1. Khi user đổi status sang `HIDDEN` (hoặc submit với status HIDDEN), nếu trước đó không phải HIDDEN:
   - gọi `hide-impact`.
   - nếu có `activeShowtimes>0 || confirmedBookings>0 || pendingBookings>0`, mở modal xác nhận với số liệu.
   - nếu không có cam kết, có thể submit trực tiếp hoặc hiển thị note nhỏ.
2. Nếu API lỗi: hiển thị cảnh báo chung, vẫn cho xác nhận ẩn; không tự hủy.
3. Chỉ khi xác nhận mới gửi `PUT /api/admin/movies/{id}`.
4. Modal accessible: focus trap, Esc, nút rõ ràng, không dùng `window.confirm` nếu đã có modal pattern.

**Ràng buộc:** endpoint read-only, không side effect.

---

## 5. Bảng tham khảo tới các yêu cầu

| REQ | DES | Thành phần chính | Test case dự kiến | Trạng thái |
|---|---|---|---|---|
| REQ-HC01.1 | DES-HC01-VAL | `ShowtimeService.validateSchedule`, `AdminShowtimeFormPage` | HC01-T01..T06 | Draft |
| REQ-HC01.2 | DES-HC01-REL | `MovieService.update`, `ShowtimeRepository` | HC01-T07..T10 | Draft |
| REQ-HC02.1 | DES-HC02-DTO | `BookingSummaryResponse`, `BookingDetailResponse`, `BookingQueries`, FE types | HC02-T01..T04 | Draft |
| REQ-HC02.2 | DES-HC02-UI | `MyTicketsPage`, `BookingDetailPage`, `BookingSuccessPage`, public movie detail | HC02-T05..T11 | Draft |
| REQ-HC02.3 | DES-HC02-IMPACT | `AdminMovieController`, `MovieService`, `AdminMovieForm` | HC02-T12..T15 | Draft |
| REQ-HC03.1 | DES-HC03-LEAD | `ShowtimeService.validateSchedule`, `DateTimePicker`, `AdminShowtimeFormPage` | HC03-T01..T08 | Draft |

**Ngoài phạm vi nhưng cần hồi quy:** create/update showtime hợp lệ, overlap, room unavailable, hidden movie block, booking history/detail cũ, public schedule, check-in, payment.

---

## 6. Rủi ro thiết kế và kiểm soát

| Rủi ro | Kiểm soát |
|---|---|
| `validateSchedule` thêm `databaseTime.now()` làm vỡ unit test hiện có | Cập nhật stub `DatabaseTime` trong `ShowtimeServiceTest` trước khi chạy |
| Đổi chữ ký Java record booking DTO làm vỡ nhiều call sites | Compile toàn bộ backend, cập nhật tests/mappers |
| Hide-impact query chậm | Đo với dữ liệu demo; chỉ thêm index theo D-07 nếu có bằng chứng |
| FE hiển thị sai “vé còn giá trị” cho suất hủy | Rule-based rendering theo status/end time; test case âm |
| Thông báo public movie HIDDEN lộ thông tin | Chỉ thông báo trung tính; không gọi booking data cho người chưa sở hữu |

---

## 7. Lịch sử cập nhật

| Ngày | Nội dung |
|---|---|
| 25/11/2026 | Tạo SDD 0.1 cho HC-01/02/03, ánh xạ REQ-DES-TC, chưa triển khai code |
