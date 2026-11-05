# 06. REST API Contract — MVP v1

**Base path:** `/api`. **Content-Type:** `application/json; charset=utf-8`. **Authentication:** Bearer JWT cho endpoint private. **Timestamp:** ISO 8601 UTC (ví dụ `2026-11-10T11:35:00Z`). **Money:** JSON decimal, MySQL `DECIMAL(12,2)`, dùng `BigDecimal` (không `double`).

> Các payload dưới đây là **contract đề xuất** để frontend/backend cùng triển khai. DDL hiện hữu ở [`../database/cinema_booking_schema.sql`](../database/cinema_booking_schema.sql). Không thay đổi response field hoặc status code tùy tiện khi đã có client sử dụng.

## 1. Danh mục endpoints

| Method | Path | Quyền | Chức năng | UC |
|---|---|---|---|---|
| GET | `/api/movies` | Public | Lọc/phân trang phim | 01 |
| GET | `/api/movies/{id}` | Public | Chi tiết phim | 01 |
| GET | `/api/movies/{id}/showtimes?date=YYYY-MM-DD` | Public | Lịch chiếu của phim theo ngày local | 01 |
| GET | `/api/cinemas/{id}/showtimes?date=YYYY-MM-DD` | Public | **Thiết kế bổ sung 05/11/2026, chưa triển khai:** lịch rạp theo ngày, nhóm/phân trang theo phim | 01 |
| GET | `/api/showtimes/{id}/seats` | Public | Sơ đồ ghế, effective status | 01 |
| POST | `/api/auth/register` | Public | Tạo CUSTOMER | — |
| POST | `/api/auth/login` | Public | Đăng nhập và JWT | — |
| POST | `/api/bookings` | CUSTOMER | Tạo PENDING/HELD | 03 |
| GET | `/api/bookings/me` | CUSTOMER | Lịch sử của mình | 08 |
| GET | `/api/bookings/{id}` | Owner/Admin | Chi tiết đơn | 08 |
| POST | `/api/bookings/{id}/cancel` | Owner | Hủy PENDING | 05 |
| POST | `/api/bookings/{id}/payments/mock` | Owner | Mock payment | 04 |
| GET | `/api/bookings/{id}/tickets` | Owner/Admin | Vé đã cấp | 08 |
| POST | `/api/staff/tickets/check-in` | STAFF/ADMIN | Check-in một vé | 07 |
| GET | `/api/admin/movies` | ADMIN | Danh sách phim quản trị (kể cả HIDDEN) | 02 |
| GET | `/api/admin/movies/{id}` | ADMIN | Chi tiết phim quản trị (kể cả HIDDEN) | 02 |
| POST | `/api/admin/movies` | ADMIN | Thêm phim | 02 |
| PUT | `/api/admin/movies/{id}` | ADMIN | Sửa phim | 02 |
| POST | `/api/admin/movies/{id}/poster` | ADMIN | Upload poster JPEG/PNG bằng multipart lên Cloudinary | 02 |
| POST | `/api/admin/rooms` | ADMIN | Tạo phòng | 02 |
| GET | `/api/admin/cinemas` | ADMIN | Danh sách rạp đã seed | 02 |
| GET | `/api/admin/cinemas/{id}/rooms` | ADMIN | Danh sách phòng theo rạp | 02 |
| PUT | `/api/admin/rooms/{id}` | ADMIN | Sửa phòng chưa có suất chiếu | 02 |
| GET | `/api/admin/rooms/{id}/seats` | ADMIN | Sơ đồ ghế vật lý của phòng | 02 |
| POST | `/api/admin/rooms/{id}/seats` | ADMIN | Khởi tạo ghế | 02 |
| PUT | `/api/admin/rooms/{roomId}/seats/{seatId}` | ADMIN | Sửa vị trí/loại/trạng thái ghế chưa có suất | 02 |
| POST | `/api/admin/showtimes` | ADMIN | Tạo lịch + inventory | 02 |
| PUT | `/api/admin/showtimes/{id}` | ADMIN | Sửa suất chưa ảnh hưởng booking | 02 |
| GET | `/api/admin/showtimes` | ADMIN | Danh sách suất chiếu quản trị, lọc theo rạp/phòng/phim/ngày/status | 02 |
| GET | `/api/admin/showtimes/{id}` | ADMIN | Chi tiết suất chiếu quản trị theo ID | 02 |
| GET | `/api/admin/reports/revenue` | ADMIN | Doanh thu | 09 |

**Quy ước:** endpoint GET hỗ trợ phân trang `page` (0-based), `size` (default 20, max 100), `sort` có whitelist; `date` của UI là ngày theo `Asia/Ho_Chi_Minh`, server đổi sang UTC để lọc chính xác.

### 1.1 Hợp đồng Movie — TASK-05 (FR-01/04/15, UC-01/02)

`GET /api/movies` hỗ trợ:

| Tham số | Quy ước |
|---|---|
| `keyword` | Tìm chuỗi con trong tên phim, bỏ khoảng trắng hai đầu; tối đa 255 ký tự. `%` và `_` được coi là ký tự thường. |
| `genre` | Khớp toàn bộ thể loại, bỏ khoảng trắng hai đầu; tối đa 100 ký tự. |
| `status` | `UPCOMING`, `SHOWING`, `ENDED`, `HIDDEN`; luôn loại phim HIDDEN, kể cả khi truyền `status=HIDDEN`. |
| `page`, `size` | Mặc định 0/20; page >= 0, size từ 1 đến 100; ngoài giới hạn trả 400. |
| `sort` | Một cặp `field,asc` hoặc `field,desc`; mặc định `releaseDate,desc`. Whitelist: `id`, `title`, `releaseDate`, `durationMinutes`, `status`; thêm id tăng dần để ổn định phân trang khi giá trị bằng nhau. |

Tìm kiếm tên/thể loại không phân biệt hoa thường; mức độ phân biệt dấu theo collation MySQL hiện hành. Không tự suy diễn trạng thái từ ngày phát hành.

Response 200:

```json
{
  "content": [{
    "id": 10,
    "title": "Phim mẫu",
    "description": "Giới thiệu phim",
    "durationMinutes": 120,
    "genre": "Hành động",
    "ageRating": "T16",
    "releaseDate": "2026-11-10",
    "posterUrl": "https://example.test/poster.jpg",
    "status": "UPCOMING"
  }],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

`GET /api/movies/{id}` trả một phần tử cùng cấu trúc trên. Không tồn tại hoặc HIDDEN → 404 `RESOURCE_NOT_FOUND` cho mọi vai trò trên API public. ID không phải số nguyên dương → 400.

`POST /api/admin/movies` và `PUT /api/admin/movies/{id}` yêu cầu JWT ADMIN; payload gồm các trường của phần tử trên **trừ `id`**:

- Bắt buộc: `title` không trống, tối đa 255 ký tự; `durationMinutes` là số nguyên 1–65535 (SMALLINT UNSIGNED); `status` thuộc enum chính thức.
- Tùy chọn/null: `description` tối đa 16000 ký tự (giới hạn API để nằm trong TEXT utf8mb4); `genre` tối đa 100; `ageRating` tối đa 20; `releaseDate` dạng YYYY-MM-DD; `posterUrl` tối đa 500, bắt đầu HTTP(S), không chứa khoảng trắng.
- Chuẩn hóa khoảng trắng hai đầu của title/genre. PUT thay thế metadata: các trường tùy chọn không gửi được đặt null. Không thay đổi suất, inventory hoặc booking khi sửa metadata phim.
- POST → 201 kèm Movie response và `Location: /api/admin/movies/{id}` (định danh tài nguyên quản trị; chưa có GET admin trong TASK-05). PUT → 200 kèm Movie response; ID không tồn tại → 404.
- Thiếu JWT → 401; CUSTOMER/STAFF → 403; JSON/enum/ngày/validation sai → 400 `VALIDATION_ERROR` theo error envelope chung.
- Ẩn phim bằng PUT với `status=HIDDEN`; không có DELETE, không xóa lịch sử (BR-19). UPCOMING/SHOWING/ENDED đều công khai.
- Cập nhật cùng phim đồng thời dùng hành vi mặc định DB: lần ghi sau cùng có hiệu lực; chưa có version/ETag trong schema. Không cam kết phát hiện lost update metadata.

### 1.1.0 Tra cứu phim quản trị — bổ sung FE-09 (FR-04/15, UC-02)

`GET /api/admin/movies` và `GET /api/admin/movies/{id}` chỉ dành cho `ADMIN`:
- `GET /api/admin/movies`: Hỗ trợ `keyword`, `genre`, `status`, `page`, `size`, `sort` tương tự `GET /api/movies`. Điểm khác biệt quan trọng: không loại trừ phim `HIDDEN`. Nếu không truyền `status`, trả toàn bộ phim ở mọi trạng thái (`UPCOMING`, `SHOWING`, `ENDED`, `HIDDEN`). Nếu truyền `status=HIDDEN`, trả danh sách phim ẩn. Trả về envelope `MoviePageResponse` `{content, page, size, totalElements, totalPages, last}`.
- `GET /api/admin/movies/{id}`: Trả về chi tiết `MovieResponse` cho bất kỳ phim nào, kể cả phim đang ở trạng thái `HIDDEN`. Phim không tồn tại → 404 `RESOURCE_NOT_FOUND`.
- Phân quyền: Chưa đăng nhập → 401 `UNAUTHENTICATED`; vai trò `CUSTOMER` hoặc `STAFF` → 403 `ACCESS_DENIED`. Tham số sai định dạng hoặc ngoài miền cho phép → 400 `VALIDATION_ERROR`.

Đây là phần chi tiết hóa payload Movie trước đây chưa được mô tả, không đổi DDL/migration. API suất chiếu theo phim và seat map được triển khai ở TASK-08.

### 1.1.1 Upload poster — Cloudinary (mở rộng FR-04/15, UC-02)

`POST /api/admin/movies/{id}/poster`, `Content-Type: multipart/form-data`, phần bắt buộc `file` (binary). Chỉ ADMIN, có cả filter/controller/service authorization. Phim phải tồn tại (kể cả HIDDEN); ID dương. Không nhận cloud name, folder, publicId hoặc URL upload do client chọn.

- JPEG/PNG, tối đa 5 MiB, tổng request tối đa 6 MiB; tối đa 6000 px mỗi chiều và 16 triệu pixel. Kiểm tra ImageIO format/dimensions/decode thật, không tin tên/MIME; re-encode loại metadata/payload phụ trước upload. SVG/GIF/WebP không thuộc tập hỗ trợ hiện tại.
- Backend ký request bằng API secret từ env, resource_type=image, public ID UUID trong folder server, overwrite=false; chỉ nhận secure_url HTTPS <=500 ký tự. Không trả secret/signature/provider response thô.
- 200: Movie response cùng cấu trúc GET movie, posterUrl đã lưu DB. API create/update Movie JSON và posterUrl trực tiếp giữ nguyên để tương thích.
- 400 VALIDATION_ERROR: thiếu part/file rỗng/ảnh hỏng/dimensions quá lớn/ID sai. 413 FILE_TOO_LARGE: file hoặc multipart vượt giới hạn. 415 UNSUPPORTED_IMAGE_TYPE: định dạng ảnh không hỗ trợ; 415 UNSUPPORTED_MEDIA_TYPE khi Content-Type ngoài không phải multipart/form-data. 401/403 theo JWT/role; 404 RESOURCE_NOT_FOUND khi phim không tồn tại.
- 503 MEDIA_STORAGE_UNAVAILABLE khi thiếu CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET; không làm ứng dụng không khởi động. 502 POSTER_UPLOAD_FAILED khi Cloudinary lỗi/timeout/response URL không hợp lệ; không lộ thông tin provider. Timeout SDK mặc định 30s (config 1–120).
- Không giữ transaction DB trong upload; kiểm tra tồn tại trước, sau upload lock phim và gắn URL bằng transaction mới ngắn. Các lần upload song song có asset riêng và lần attach cuối có hiệu lực, không ảnh hưởng booking/lịch sử. Không đổi schema vì đã có poster_url VARCHAR(500).
- Không có distributed transaction hoặc auto-retry upload. Không tự xóa poster cũ/asset còn lại nếu upload hoặc DB thất bại/commit không rõ; quản trị dọn qua Cloudinary Console. Chưa có asset metadata/publicId trong DB, không suy publicId từ URL để xóa.

### 1.2 Rạp/phòng/ghế — TASK-06

MVP dùng rạp đã seed (GAP-11), không thêm CRUD đa cụm rạp. Tất cả endpoint trong mục này yêu cầu ADMIN.

- `GET /api/admin/cinemas`: page envelope `{content,page,size,totalElements,totalPages}`; phần tử `{id,name,address,status}`.
- `GET /api/admin/cinemas/{id}/rooms`: cùng envelope; phần tử `{id,cinemaId,name,status}`. ID rạp không tồn tại → 404.
- Hai danh sách hỗ trợ `page=0`, `size=20` (1–100), `sort=id,asc`; whitelist rạp `id/name`, phòng `id/name/status`. Dữ liệu cùng khóa sort được sắp thêm id tăng dần.
- `POST /api/admin/rooms`: `{ "cinemaId": 1, "name": "Phòng 03", "status": "ACTIVE" }` → 201 kèm Room response và Location định danh phòng. `PUT /api/admin/rooms/{id}` dùng cùng payload → 200. Không chuyển phòng sang rạp khác; dùng ACTIVE/MAINTENANCE; tên không trống, tối đa 50 ký tự, trim hai đầu; tên duy nhất trong rạp theo collation DB.
- `POST /api/admin/rooms/{id}/seats`: khởi tạo/thêm nguyên batch, payload:

```json
{"seats":[
  {"seatRow":"A","seatNumber":1,"seatType":"STANDARD","status":"ACTIVE"},
  {"seatRow":"B","seatNumber":1,"seatType":"VIP","status":"MAINTENANCE"}
]}
```

Batch 1–1000 phần tử, không null, không trùng vị trí với nhau/DB. `seatRow` 1–5 chữ cái A–Z, chuẩn hóa chữ hoa; `seatNumber` số nguyên 1–65535; type STANDARD/VIP; status vật lý ACTIVE/MAINTENANCE. Response 201 là mảng `{id,roomId,seatRow,seatNumber,label,seatType,status}`; lỗi một ghế → không ghi bất kỳ ghế nào.

- `GET /api/admin/rooms/{id}/seats`: trả toàn bộ mảng ghế vật lý, sắp theo hàng/số (ngoại lệ phân trang để tải một sơ đồ phòng hoàn chỉnh).
- `PUT /api/admin/rooms/{roomId}/seats/{seatId}`: cùng một phần tử payload batch, trả Seat response 200. Ghế phải thuộc đúng phòng, nếu không → 404. Không có DELETE, không dùng BOOKED/HELD làm trạng thái ghế vật lý.
- Chọn GAP-08 bảo thủ: khóa phòng và **cấm mọi thay đổi cấu hình phòng/ghế nếu phòng có bất kỳ suất nào**, kể cả đã hủy/hoàn tất. Điều này bảo toàn inventory và lịch sử, không tạo ghế mới mà suất hiện hữu không có inventory.
- Trùng tên/vị trí → 409 `DUPLICATE_RESOURCE`; thay đổi cấu hình đã có suất → 409 `RESOURCE_STATE_CONFLICT`; unique/FK conflict cuối cùng ở DB → 409 `RESOURCE_STATE_CONFLICT`; validation → 400. Rạp/phòng/ghế không tồn tại → 404.

### 1.3 Lịch chiếu công khai — TASK-08

`GET /api/movies/{id}/showtimes?date=2026-11-10&cinemaId=1&page=0&size=20&sort=startsAt,asc`

- `date` bắt buộc, YYYY-MM-DD hợp lệ, năm 1000–9998; là ngày Việt Nam, lọc `[00:00 ngày đó, 00:00 ngày kế tiếp)` đổi sang UTC. `cinemaId` tùy chọn, số dương. Thiếu/sai ngày → 400.
- Chỉ trả SCHEDULED thuộc phim không HIDDEN, phòng ACTIVE và rạp ACTIVE. Không tự loại suất trong ngày đã qua cutoff; UI đọc `startsAt`, backend booking vẫn phải kiểm tra cutoff ở POST.
- Phim không tồn tại/HIDDEN → 404. Không có suất phù hợp → page rỗng, kể cả bộ lọc cinemaId không tồn tại.
- Page envelope giống mục 1.2; page/size có giới hạn như trên; sort whitelist `id/startsAt/basePrice`, mặc định `startsAt,asc`.
- Phần tử Showtime response: `{id,movieId,cinemaId,cinemaName,roomId,roomName,startsAt,endsAt,cleanupMinutes,basePrice,vipSurcharge,status}`. Timestamp ISO UTC có Z, tiền BigDecimal.

### 1.4 Lịch theo rạp, nhóm phim — thiết kế bổ sung 05/11/2026

**Trạng thái:** Contract mới cho FR-02, UC-01, TC-46…49; chưa có endpoint tương ứng trong controller khi cập nhật tài liệu. Không đổi API lịch theo phim, không thay schema/migration: dữ liệu cần thiết đã có trong movies/showtimes/rooms/cinemas.

`GET /api/cinemas/{id}/showtimes?date=2026-11-10&page=0&size=20`

- Public, không yêu cầu movieId. ID rạp là số nguyên dương; date bắt buộc, ngày Việt Nam, năm 1000–9998. Thiếu/sai tham số → 400 VALIDATION_ERROR.
- Rạp không tồn tại hoặc không ACTIVE → 404 RESOURCE_NOT_FOUND. Rạp hợp lệ nhưng ngày đó không có lịch → 200 page rỗng, không fallback sang rạp/phim demo.
- Chỉ lấy suất SCHEDULED có startsAt trong khoảng ngày Việt Nam nửa mở như mục 1.3, phòng ACTIVE, phim không HIDDEN. Không giới hạn riêng phim SHOWING; không tự loại UPCOMING/ENDED nếu còn suất đáp ứng điều kiện public.
- Phân trang **nhóm phim**, không phân trang các suất rồi nhóm ở frontend. page 0-based, size mặc định 20, từ 1–100. totalElements là số phim có lịch phù hợp; totalPages theo số nhóm. Mỗi nhóm có toàn bộ suất phù hợp của phim đó trong rạp/ngày, không cắt mất giờ chiếu qua các trang.
- Thứ tự cố định: nhóm theo title tăng dần theo collation DB, rồi movieId; suất trong nhóm theo startsAt rồi id tăng dần. Phiên bản đầu không nhận sort tùy chỉnh (gửi sort → 400 VALIDATION_ERROR). Chỉ phân trang ID phim có lịch rồi tải metadata và các suất cho nhóm đã chọn; tránh N+1 và không gọi lịch riêng cho từng phim từ frontend. Tập dữ liệu/count trong một response đọc nhất quán.
- Giữ các suất đã qua cutoff trong kết quả; UI disable nút theo startsAt - 10 phút, backend tiếp tục kiểm tra khi POST booking. Không trả inventory owner/booking/ticket code.
- Không có dữ liệu định dạng 2D/3D, ngôn ngữ hoặc phụ đề trong schema hiện tại. Không thêm nhãn “2D Phụ Đề Anh” mặc định chỉ để giống ảnh; nếu cần dữ liệu thật phải có thay đổi contract/schema riêng.

Response 200 dùng page envelope hiện có, ví dụ rút gọn một nhóm/một suất:

```json
{
  "content": [{
    "movie": {
      "id": 10,
      "title": "Phim mẫu",
      "posterUrl": "https://example.test/poster.jpg",
      "ageRating": "T18",
      "durationMinutes": 120
    },
    "showtimes": [{
      "id": 101, "movieId": 10, "cinemaId": 1, "cinemaName": "Rạp mẫu",
      "roomId": 20, "roomName": "Phòng 01",
      "startsAt": "2026-11-10T11:00:00Z", "endsAt": "2026-11-10T13:00:00Z",
      "cleanupMinutes": 15, "basePrice": 75000.00, "vipSurcharge": 20000.00,
      "status": "SCHEDULED"
    }]
  }],
  "page": 0, "size": 20, "totalElements": 1, "totalPages": 1
}
```

Movie summary gồm đúng các field trên; posterUrl/ageRating có thể null. showtimes tái sử dụng Showtime response mục 1.3, mỗi nút giờ gắn một showtimeId riêng; cùng giờ nhưng khác phòng không bị gộp mất. Header rạp dùng API chi tiết public hiện có, không giả định metadata rạp nằm ngoài page envelope này.

## 2. Standard Error Response

```json
{
  "code": "SEAT_UNAVAILABLE",
  "message": "Một hoặc nhiều ghế không còn khả dụng.",
  "timestamp": "2026-11-10T11:30:01Z",
  "path": "/api/bookings",
  "fieldErrors": []
}
```

| HTTP | Khi nào | Error code gợi ý |
|---|---|---|
| 400 | JSON sai / validation lỗi / seatIds lặp | `VALIDATION_ERROR` |
| 401 | Thiếu JWT, JWT sai/hết hạn | `UNAUTHENTICATED` |
| 403 | Không đủ role, quyền | `ACCESS_DENIED` |
| 404 | Không thấy resource **hoặc** policy ẩn resource không thuộc owner | `RESOURCE_NOT_FOUND` |
| 409 | Giữ trùng ghế, idempotency mismatch, trạng thái không cho thao tác, trùng lịch, check-in lần hai | `SEAT_UNAVAILABLE`, `IDEMPOTENCY_CONFLICT`, `BOOKING_STATE_CONFLICT`, `SHOWTIME_OVERLAP`, `TICKET_ALREADY_USED` |
| 422 | Suất qua cutoff, không đúng phòng, quá thời gian check-in, phòng bảo trì | `BOOKING_CUTOFF_PASSED`, `SEAT_NOT_IN_ROOM`, `CHECKIN_TIME_INVALID` |
| 500 | Lỗi nội bộ chưa xử lý | `INTERNAL_ERROR` (không lộ SQL/stacktrace) |

Ở endpoint owner, chọn nhất quán **404 để tránh lộ sự tồn tại** của booking người khác; nếu chọn 403 phải có lý do nhất quán ở mọi endpoint.

## 3. GET sơ đồ ghế

`GET /api/showtimes/101/seats`

```json
{
  "showtimeId": 101,
  "startsAt": "2026-11-10T12:00:00Z",
  "bookingClosesAt": "2026-11-10T11:50:00Z",
  "seats": [
    {"seatId": 1, "label": "A1", "seatType": "STANDARD", "status": "AVAILABLE", "price": 75000.00},
    {"seatId": 2, "label": "A2", "seatType": "STANDARD", "status": "HELD", "price": 75000.00},
    {"seatId": 3, "label": "B1", "seatType": "VIP", "status": "BOOKED", "price": 95000.00}
  ]
}
```

`status` là trạng thái **hiệu lực** với HELD hết hạn được hiển thị AVAILABLE; GET không giữ chỗ. Tuyệt đối không trả `currentBookingId` của người khác.

TASK-08 dùng `UTC_TIMESTAMP(3)` từ DB để so sánh `hold_expires_at <= now`; không thay đổi hold persisted, không trả hold expiry, booking ID, user ID hoặc ticket code. Trả toàn bộ sơ đồ theo hàng/số, chỉ dựa inventory của suất, không dựa `seats.status` để suy ra đã bán. Giá VIP = basePrice + vipSurcharge. ID không dương → 400; suất không tồn tại/không SCHEDULED, phim HIDDEN, phòng/rạp không hoạt động → 404. Inventory lệch phòng hoặc có ghế vật lý không ACTIVE là lỗi bất biến nội bộ, không được công bố như ghế có thể đặt.

## 4. POST tạo booking — UC-03

`POST /api/bookings` (CUSTOMER)

```json
{
  "showtimeId": 101,
  "seatIds": [1, 2],
  "clientRequestId": "6c1282ed-cbc3-4fb9-9017-0ea88953b1a4"
}
```

**Validation:** `showtimeId > 0`; `1 <= count(seatIds) <= 8`; ghế không trùng; `clientRequestId` nonblank độ dài <=64; lấy userId **từ JWT**. Kiểm tra `now < startsAt-10m`, `showtime.status=SCHEDULED`, phòng ACTIVE, ghế ACTIVE và đúng phòng.

**HTTP 201 Created** (yêu cầu mới):

```json
{
  "bookingId": 1001,
  "bookingCode": "BK0001001",
  "showtimeId": 101,
  "status": "PENDING",
  "seatIds": [1, 2],
  "totalAmount": 150000.00,
  "expiresAt": "2026-11-10T11:35:00Z"
}
```

**Idempotency:** Cùng `userId + clientRequestId + (showtimeId, tập seatIds)` trả booking đã tạo **HTTP 200** (kể cả đã EXPIRED, CANCELLED, CONFIRMED; không giữ ghế lại). Cùng key nhưng khác showtime/tập seatIds → 409 `IDEMPOTENCY_CONFLICT`. Với request concurrent cùng key, DB UNIQUE là tuyến phòng thủ cuối; đọc lại booking đã có sau khi xử lý unique conflict. Nếu request mới xung đột ghế → 409 và **không** giữ phần còn lại.

> Định dạng `bookingCode` trong ví dụ chỉ để minh họa. Implementation phải đảm bảo UNIQUE; có thể generate sau khi có id trong cùng transaction.

### 4.1 Chi tiết triển khai booking — TASK-09/10

- `showtimeId` và từng `seatIds` phải là JSON integer dương (không ép kiểu từ chuỗi/số thập phân); 1–8 ghế duy nhất; key nonblank <=64 ký tự. Service cũng Bean Validate khi được gọi qua Spring, không chỉ controller.
- Không nhận userId/giá từ request làm dữ liệu tin cậy: actor lấy từ UserPrincipal đã xác thực. Các trường JSON không thuộc DTO bị bỏ qua, không thể đổi owner hoặc tổng tiền. ADMIN/STAFF không được tự tạo/hủy booking theo quyền CUSTOMER.
- Response tạo/replay giữ đúng ví dụ trên; `seatIds` sắp tăng dần; bookingCode là UUID ngẫu nhiên 32 ký tự không dấu nối, có UNIQUE DB; POST mới kèm Location `/api/bookings/{bookingId}`. Replay trả trạng thái persisted hiện tại và expiry cũ, không gia hạn hoặc giữ lại ghế dù đã qua cutoff.
- Key giữ nguyên khi retry; không trim/case-fold ở ứng dụng. So sánh key theo collation VARCHAR hiện hành của MySQL (khuyến nghị UUID ASCII). So sánh payload bằng showtimeId và tập seatIds, không phụ thuộc thứ tự ghế.
- Transaction tạo booking dùng shared showtime guard → insert PENDING → khóa từng inventory theo ID tăng dần → validate/ghi HELD + booking_seats + tổng snapshot. Ghế sai phòng → 422 `SEAT_NOT_IN_ROOM`; ghế maintenance/thiếu inventory → 422 `SEAT_NOT_BOOKABLE`; HELD còn hạn hoặc BOOKED → 409 `SEAT_UNAVAILABLE`. Mọi lỗi rollback cả booking/hold/selection.
- Suất không SCHEDULED → 422 `SHOWTIME_UNAVAILABLE`; phòng/rạp không ACTIVE → 422 `ROOM_UNAVAILABLE`; suất/phim không tồn tại hoặc phim HIDDEN → 404. Tổng snapshot vượt DECIMAL(12,2) → 422 `BOOKING_AMOUNT_INVALID`.
- Thời gian từ `UTC_TIMESTAMP(3)`: createdAt lấy ngay trước insert, expiresAt = createdAt + 300 giây. Sau khi chờ khóa phải đọc lại giờ DB, kiểm tra lại cutoff và TTL của booking mới; hết TTL trong lúc chờ → 409 `BOOKING_EXPIRED`, không commit hold. Không kéo dài TTL để bù thời gian chờ khóa.
- Unique-key contender được rollback trước khi đọc lại booking thắng trong transaction mới; cùng payload → 200, khác → 409. Retry tối đa 3 transaction cho deadlock/lock conflict, cùng actor/key/payload; sau giới hạn → 409 `BOOKING_CONCURRENT_CONFLICT`. Không retry lỗi nghiệp vụ ghế/cutoff.
- Không phát hành ticket_code hoặc payment trong TASK-09/10. GET seat map không phải reservation; POST luôn khóa và validate lại.

## 5. POST thanh toán mô phỏng — UC-04

`POST /api/bookings/1001/payments/mock` (OWNER)

```json
{
  "simulatedResult": "SUCCESS",
  "idempotencyKey": "pay-1001-f61d0b1f-4b7e-4f80"
}
```

`simulatedResult` chỉ nhận `SUCCESS` hoặc `FAILED`; key nonblank max 64, uniqueness **toàn hệ thống**.

**HTTP 200** cho SUCCESS:

```json
{
  "bookingId": 1001,
  "bookingCode": "BK0001001",
  "status": "CONFIRMED",
  "paymentStatus": "SUCCESS",
  "paidAt": "2026-11-10T11:32:00Z",
  "tickets": [
    {"seatId": 1, "label": "A1", "ticketCode": "RANDOM_UNGUESSABLE_TICKET_1"},
    {"seatId": 2, "label": "A2", "ticketCode": "RANDOM_UNGUESSABLE_TICKET_2"}
  ]
}
```

**HTTP 200** cho simulated FAILED (đề xuất contract nhất quán):

```json
{
  "bookingId": 1001,
  "status": "PENDING",
  "paymentStatus": "FAILED",
  "message": "Thanh toán mô phỏng thất bại; có thể thử lại trước hạn giữ ghế."
}
```

**Xử lý retry:** Lặp cùng `idempotencyKey` và cùng `bookingId + simulatedResult` trả response tương đương kết quả cũ, không tạo payment mới. Key trùng khác payload → 409. Một booking đã CONFIRMED với key mới không tạo SUCCESS lần thứ hai: trả 409 `BOOKING_STATE_CONFLICT` (đã chọn làm contract MVP). Booking đã EXPIRED → 409 và không phát hành vé. Payment không tạo tác động bên ngoài DB trong MVP.

### 5.1 Chi tiết triển khai — TASK-13/14

- Chỉ CUSTOMER owner, actor lấy từ principal; ADMIN/STAFF không thanh toán thay khách. ID dương; owner khác/ID không tồn tại đều 404, kể cả replay. JSON `simulatedResult` phải là chuỗi chính xác SUCCESS/FAILED, không nhận ordinal số; key giữ nguyên, nonblank <=64, so sánh theo collation MySQL hiện hành.
- Khóa booking trước, tra key, rồi khóa từng inventory ID tăng dần; đọc DB UTC sau chờ khóa. Cả FAILED lẫn SUCCESS mới đều yêu cầu PENDING, booking/ghế còn hạn, tất cả ghế HELD đúng owner, đúng showtime/phòng, tổng snapshot khớp booking; không tính lại giá hiện hành hoặc áp cutoff tạo booking vào thanh toán.
- SUCCESS ghi payment, CONFIRMED/confirmedAt, BOOKED và mã vé trong một transaction. Mã vé 24 byte SecureRandom (192 bit), hex 48 ký tự, UNIQUE DB. Lỗi ghi/va chạm mã rollback toàn bộ, không có payment/vé một phần. Không đổi DDL hoặc generated UNIQUE `successful_booking_id` đã có từ V1.
- Replay cùng key được xét trước kiểm tra TTL/trạng thái terminal, nhưng sau ownership. Replay FAILED luôn trả kết quả attempt cũ PENDING/FAILED (không có tickets/paidAt), kể cả sau lần SUCCESS khác; trạng thái booking hiện tại lấy qua GET booking. Replay SUCCESS trả cùng mã vé/paidAt. Không tạo payment mới khi hết hạn; scheduler cập nhật EXPIRED sau, API không sửa EXPIRED rồi throw rollback.
- Unique conflict của key toàn cục được rollback trước khi đọc lại bằng transaction mới; khác booking/result → 409 IDEMPOTENCY_CONFLICT. Retry lock conflict tối đa 3 transaction qua BookingRetry; hết lượt → 409 BOOKING_CONCURRENT_CONFLICT. Không gọi cổng thanh toán ngoài.

## 6. POST hủy booking — UC-05

`POST /api/bookings/1001/cancel`, body rỗng. **HTTP 200:**

```json
{
  "bookingId": 1001,
  "status": "CANCELLED",
  "releasedSeatCount": 2
}
```

- Nếu `CANCELLED` lặp: HTTP 200, `releasedSeatCount=0`.
- Nếu quá hạn nhưng DB vẫn PENDING: xử lý thành EXPIRED thay vì cho hủy tạo hiệu ứng phụ; HTTP 409 hoặc 200 EXPIRED theo contract thống nhất. **MVP chọn HTTP 409 `BOOKING_EXPIRED` với resource có thể được cleanup sau**.
- Nếu CONFIRMED: 409, không cho hoàn tiền trong MVP.

TASK-11 thực hiện: chỉ CUSTOMER owner được hủy; owner khác → 404. Đã EXPIRED cũng trả 409 `BOOKING_EXPIRED`; các trạng thái khác PENDING/CANCELLED → 409 `BOOKING_STATE_CONFLICT`. Khóa booking trước rồi từng inventory theo ID tăng dần, đọc lại giờ sau chờ khóa. Không kiểm tra cutoff tạo mới cho thao tác hủy; chỉ kiểm tra TTL và ownership. CANCELED response không xóa booking_seats. Nếu TTL đã hết nhưng persisted vẫn PENDING, API không sửa rồi throw gây hiểu nhầm: rollback yêu cầu hủy, scheduler chuyển EXPIRED sau.

Cleanup không có endpoint public/admin. Job mặc định chạy sau mỗi 30 giây, lấy tối đa 100 PENDING có `expires_at <= DB now` theo index, mỗi đơn một transaction riêng; khóa lại và chỉ release inventory HELD có current_booking_id đúng booking đó. Nhiều instance/job chạy lặp an toàn; không cần Redis/distributed mutex. Cấu hình `app.booking.cleanup.enabled` (default true), `delay-ms` và `initial-delay-ms` dưới cùng prefix (default 30000). Không dựa vào job để xác định hold còn hiệu lực.

## 7. GET booking / vé / lịch sử

- `GET /api/bookings/me?page=0&size=20`: trả page gồm `bookingCode`, `status`, `movieTitle`, `startsAt`, `totalAmount`, `createdAt`, `expiresAt`.
- `GET /api/bookings/{id}`: owner hoặc ADMIN được cấp quyền; danh sách ghế kèm đơn giá snapshot. Khi status PENDING nhưng `expiresAt <= now`, UI hiển thị `isExpired=true` hoặc `effectiveStatus=EXPIRED` **mà không nhất thiết sửa DB bằng GET**.
- `GET /api/bookings/{id}/tickets`: chỉ booking CONFIRMED mới trả ticket_code. Booking khác owner → 404.

### 7.1 Booking GET — TASK-12

- `/api/bookings/me`: chỉ CUSTOMER; page envelope `{content,page,size,totalElements,totalPages}`, mặc định page=0/size=20; size 1–100. `sort` một cặp field,asc/desc; whitelist `id`, `createdAt`, `startsAt`, `status`; mặc định `createdAt,desc`, thêm id tăng dần để ổn định. Phần tử `{bookingId,bookingCode,status,effectiveStatus,movieTitle,startsAt,totalAmount,createdAt,expiresAt}`. Filter userId luôn từ principal, không từ query string.
- `/api/bookings/{id}`: CUSTOMER owner hoặc ADMIN hỗ trợ (có audit); STAFF bị từ chối. Trả `{bookingId,bookingCode,showtimeId,movieTitle,roomName,startsAt,status,effectiveStatus,totalAmount,createdAt,expiresAt,seats}`; phần tử seats `{seatId,label,seatType,unitPrice}` theo hàng/số ghế.
- `effectiveStatus=EXPIRED` khi persisted PENDING và expiresAt <= DB now; không ghi DB trong GET. Giá dùng snapshot booking_seats, không tính lại từ showtime hiện tại.
- Không trả current_booking_id, hold của khách khác hoặc ticket_code qua hai API trên. Ticket endpoint và cấp vé được triển khai riêng trong TASK-14 bên dưới.
- ID không dương/phân trang/sort sai → 400; owner khác và ID không tồn tại cùng 404. JWT thiếu/sai → 401; role không được phép → 403.
- Header `X-Correlation-ID` được echo nếu là 1–64 ký tự A–Z/a–z/0–9/_/-, nếu không server sinh UUID; audit ghi correlation ID, actor ID, booking ID và outcome sau khi transaction write commit. Không ghi request key, JWT hoặc mật khẩu vào audit.

## 8. Check-in vé — UC-07

`POST /api/staff/tickets/check-in` (STAFF/ADMIN)

```json
{"ticketCode": "RANDOM_UNGUESSABLE_TICKET_1"}
```

**HTTP 200**:

```json
{
  "result": "CHECKED_IN",
  "movieTitle": "Phim mẫu",
  "roomName": "Phòng 01",
  "seatLabel": "A1",
  "checkedInAt": "2026-11-10T11:40:00Z"
}
```

Lỗi 404 invalid ticket; 422 trước/sau khung giờ hoặc suất bị hủy; 409 đã check-in. Không cho khách tự check-in.

### 8.1 Vé và check-in — TASK-14/15

- `GET /api/bookings/{id}/tickets`: CUSTOMER owner hoặc ADMIN hỗ trợ có audit; STAFF không dùng endpoint này. Trả **mảng** `{seatId,label,ticketCode}` theo hàng/số ghế, cùng cấu trúc `tickets` trong payment SUCCESS. Booking chưa CONFIRMED → 409 BOOKING_STATE_CONFLICT, không trả mã vé; owner khác/ID không tồn tại → 404; ID không dương → 400.
- `ticketCode` đầu vào check-in nonblank <=48 ký tự, không trim/case-fold ở ứng dụng. Code không tồn tại → 404; booking không CONFIRMED → 409 BOOKING_STATE_CONFLICT; inventory lệch showtime/phòng → 422 SEAT_NOT_IN_ROOM.
- Check-in khóa booking rồi đọc lại vé/check-in, dùng DB now; cho phép chính xác `startsAt - 30 phút <= now <= endsAt`. Showtime CANCELLED hoặc ngoài cửa sổ → 422 CHECKIN_TIME_INVALID. Vé đã dùng trả 409 TICKET_ALREADY_USED, kể cả nhiều request song song. UNIQUE booking_seat_id vẫn là tuyến bảo vệ cuối.
- staff_id chỉ từ principal STAFF/ADMIN, không từ body. Audit sau commit dùng checkinId/correlationId/actorId, không log mã vé. Logger SQL constraint thô của Hibernate được tắt mặc định vì thông báo duplicate có thể chứa ticket code/key.

## 9. Admin — ví dụ tạo suất

`POST /api/admin/showtimes` (ADMIN)

```json
{
  "movieId": 10,
  "roomId": 20,
  "startsAt": "2026-11-10T12:00:00Z",
  "endsAt": "2026-11-10T14:00:00Z",
  "cleanupMinutes": 15,
  "basePrice": 75000.00,
  "vipSurcharge": 20000.00
}
```

- `201`: showtime + createdSeatCount.
- `409 SHOWTIME_OVERLAP`: giao nhau với suất khác trong cùng room (kể cả cleanup).
- `422`: phòng/ghế không hoạt động, giá/times sai nghiệp vụ.
- `PUT /api/admin/showtimes/{id}` chỉ sửa an toàn khi không có booking cần bảo toàn; không tái sinh inventory làm mất history.

### 9.1 Chi tiết quản trị suất — TASK-07

- `movieId`, `roomId` số dương; startsAt/endsAt có Z hoặc offset, lưu UTC với tối đa 3 chữ số phần giây; thời gian nằm trong DATETIME MySQL. Thiếu trường/giá âm/quá 2 chữ số thập phân/cleanup sai miền → 400.
- `cleanupMinutes` mặc định 15 khi thiếu/null, từ 0–65535; `vipSurcharge` mặc định 0 khi thiếu/null. `basePrice` bắt buộc; mỗi giá vừa DECIMAL(12,2), tổng VIP cũng không vượt 9,999,999,999.99.
- endsAt phải sau startsAt và không sớm hơn startsAt + thời lượng phim; endsAt + cleanup vẫn trong miền DATETIME. Vi phạm nghiệp vụ thời lượng/giá tổng → 422 `SCHEDULE_INVALID`. Không tự tính thời lượng trailer và không áp dụng chính sách tuổi/giá ngoài MVP.
- Phim HIDDEN → 422 `MOVIE_UNAVAILABLE`; rạp/phòng không ACTIVE hoặc không có ghế ACTIVE → 422 `ROOM_UNAVAILABLE`; ID không tồn tại → 404.
- POST trả 201 `{ "showtime": <Showtime response mục 1.3>, "createdSeatCount": 40 }`, kèm Location định danh suất quản trị; toàn bộ showtime + inventory commit trong một transaction. Chỉ tạo inventory cho ghế ACTIVE, trạng thái AVAILABLE, owner/expiry null.
- Cả create và update đều khóa phòng rồi kiểm tra khoảng chiếm dụng **có cleanup của hai suất**; chỉ so với SCHEDULED; `[start,end)` nên hai khoảng tiếp giáp hợp lệ. Trùng lịch → 409 `SHOWTIME_OVERLAP`.
- PUT dùng cùng payload, trả Showtime response 200. Chỉ sửa SCHEDULED chưa có **bất kỳ booking nào**, kể cả EXPIRED/CANCELLED; inventory phải chưa có ghế HELD/BOOKED. Nếu vi phạm → 409 `RESOURCE_STATE_CONFLICT`.
- Giữ nguyên inventory IDs nếu phòng không đổi. Nếu đổi phòng, khóa hai phòng theo ID tăng dần, khóa suất, kiểm tra lịch sử, thay inventory chỉ khi an toàn. Đang chờ khóa mà suất đã chuyển phòng → 409 yêu cầu tải lại. Không đổi trạng thái CANCELLED/COMPLETED qua PUT này.
- Thiếu JWT → 401; không phải ADMIN → 403. Deadlock/lock timeout → 409 `RESOURCE_STATE_CONFLICT`, không tự retry create (chưa có idempotency key cho lập lịch).
- Luồng booking TASK-09/10 đã dùng `findByIdForBooking` (shared row lock) trước khi insert booking. Đây là giao thức phối hợp với khóa write của update lịch; TASK-07 riêng chỉ cung cấp guard và quản trị lịch.

### 9.2 Đọc danh sách và chi tiết suất chiếu quản trị — TASK-07 bổ sung (FE-10)

`GET /api/admin/showtimes?cinemaId=1&roomId=20&movieId=10&date=2026-11-10&status=SCHEDULED&page=0&size=20&sort=id,desc`

- Phân quyền: Chỉ `ADMIN`. Chưa đăng nhập → 401; CUSTOMER/STAFF → 403.
- Các bộ lọc tùy chọn (optional):
  - `cinemaId`: số nguyên dương.
  - `roomId`: số nguyên dương.
  - `movieId`: số nguyên dương.
  - `date`: ngày theo `Asia/Ho_Chi_Minh` (định dạng YYYY-MM-DD, năm 1000–9998). Server chuyển đổi thành khoảng nửa mở UTC `[00:00:00 ngày đó, 00:00:00 ngày tiếp theo)` để so khớp `startsAt`. Nếu không truyền `date`, **không tự động lọc ngày hôm nay** (trả về tất cả suất thỏa mãn các điều kiện khác).
  - `status`: enum `SCHEDULED`, `CANCELLED`, `COMPLETED`.
- Phân trang & sắp xếp:
  - `page`: 0-based, mặc định 0. `size`: 1–100, mặc định 20.
  - `sort`: whitelist các trường `id`, `startsAt`, `basePrice`, `status`. Mặc định `id,desc`. Luôn thêm thứ tự phụ theo `id` để đảm bảo phân trang ổn định.
- Đặc tả dữ liệu:
  - Admin không bị bộ lọc public loại trừ: phim HIDDEN, phòng/rạp ngừng hoạt động (MAINTENANCE/SUSPENDED) hoặc suất có trạng thái khác SCHEDULED vẫn hiển thị đầy đủ.
  - Tránh N+1 bằng `@EntityGraph` trên `room`, `room.cinema`, `movie`. Không sử dụng row lock cho thao tác đọc thông thường.
  - Response dùng `PageResponse<ShowtimeResponse>` với ShowtimeResponse đầy đủ thuộc tính như mục 1.3: `{id, movieId, cinemaId, cinemaName, roomId, roomName, startsAt, endsAt, cleanupMinutes, basePrice, vipSurcharge, status}`.
  - Tuyệt đối không để lộ owner hold, booking khách hoặc mã vé.
  - Tham số sai hoặc sort ngoài whitelist → 400 VALIDATION_ERROR.

`GET /api/admin/showtimes/{id}`

- Phân quyền: Chỉ `ADMIN`.
- Đọc chi tiết suất chiếu theo `id` (số nguyên dương) kể cả suất không public (thuộc phim HIDDEN, phòng MAINTENANCE, rạp SUSPENDED hoặc suất CANCELLED/COMPLETED).
- Trả về `ShowtimeResponse` trực tiếp với HTTP 200.
- `id` không tồn tại → 404 RESOURCE_NOT_FOUND; `id` không hợp lệ (<= 0) → 400 VALIDATION_ERROR.

`GET /api/admin/reports/revenue?from=2026-11-01&to=2026-11-30`: hai ngày theo local calendar; server convert `[startLocal 00:00, dayAfterEndLocal 00:00)` sang UTC. Trả `totalRevenue`, `successfulPayments`, `currency="VND"`, danh sách `dailyRevenue`.

### 9.3 Báo cáo doanh thu — TASK-16

Chỉ ADMIN; `from/to` bắt buộc là ngày ISO hợp lệ, năm 1000–9998, from <= to; lỗi → 400 VALIDATION_ERROR. Response 200:

```json
{"totalRevenue":150000.00,"successfulPayments":1,"currency":"VND","dailyRevenue":[
  {"date":"2026-11-10","totalRevenue":150000.00,"successfulPayments":1}
]}
```

Một truy vấn aggregate theo `payments.status=SUCCESS` và `paid_at >= fromUtc AND paid_at < endUtc`, không dùng created_at hoặc bookings.total_amount. Nhóm ngày Việt Nam (UTC+07), sắp tăng dần; chỉ có ngày phát sinh SUCCESS, không tự chèn ngày trống. Không có dữ liệu → totalRevenue=0.00, successfulPayments=0, dailyRevenue=[]. Không phân trang danh sách aggregate này. INITIATED/FAILED không được cộng, kể cả có paid_at.

## 10. Ràng buộc tích hợp frontend

1. Không gửi `userId`, `role`, `totalAmount`, `currentBookingId` trong request tạo booking.
2. Tạo **key mới cho mỗi intent** người dùng, nhưng giữ nguyên key khi retry cùng intent; refresh trang không phát sinh thanh toán đôi.
3. UI đếm ngược 5 phút mang tính hiển thị; server kiểm tra thời gian thật.
4. Khi POST bị 409, refresh sơ đồ ghế; không tự cập nhật ghế thành BOOKED nếu payment chưa SUCCESS.
5. Ẩn các nút đặt vé khi gần cutoff để UX tốt, nhưng backend luôn enforce BR-08.
