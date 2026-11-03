# 06. REST API Contract — MVP v1

**Base path:** `/api`. **Content-Type:** `application/json; charset=utf-8`. **Authentication:** Bearer JWT cho endpoint private. **Timestamp:** ISO 8601 UTC (ví dụ `2026-11-10T11:35:00Z`). **Money:** JSON decimal, MySQL `DECIMAL(12,2)`, dùng `BigDecimal` (không `double`).

> Các payload dưới đây là **contract đề xuất** để frontend/backend cùng triển khai. DDL hiện hữu ở [`../database/cinema_booking_schema.sql`](../database/cinema_booking_schema.sql). Không thay đổi response field hoặc status code tùy tiện khi đã có client sử dụng.

## 1. Danh mục endpoints

| Method | Path | Quyền | Chức năng | UC |
|---|---|---|---|---|
| GET | `/api/movies` | Public | Lọc/phân trang phim | 01 |
| GET | `/api/movies/{id}` | Public | Chi tiết phim | 01 |
| GET | `/api/movies/{id}/showtimes?date=YYYY-MM-DD` | Public | Lịch chiếu của phim theo ngày local | 01 |
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
| POST | `/api/admin/movies` | ADMIN | Thêm phim | 02 |
| PUT | `/api/admin/movies/{id}` | ADMIN | Sửa phim | 02 |
| POST | `/api/admin/rooms` | ADMIN | Tạo phòng | 02 |
| POST | `/api/admin/rooms/{id}/seats` | ADMIN | Khởi tạo ghế | 02 |
| POST | `/api/admin/showtimes` | ADMIN | Tạo lịch + inventory | 02 |
| PUT | `/api/admin/showtimes/{id}` | ADMIN | Sửa suất chưa ảnh hưởng booking | 02 |
| GET | `/api/admin/reports/revenue` | ADMIN | Doanh thu | 09 |

**Quy ước:** endpoint GET hỗ trợ phân trang `page` (0-based), `size` (default 20, max 100), `sort` có whitelist; `date` của UI là ngày theo `Asia/Ho_Chi_Minh`, server đổi sang UTC để lọc chính xác.

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

## 7. GET booking / vé / lịch sử

- `GET /api/bookings/me?page=0&size=20`: trả page gồm `bookingCode`, `status`, `movieTitle`, `startsAt`, `totalAmount`, `createdAt`, `expiresAt`.
- `GET /api/bookings/{id}`: owner hoặc ADMIN được cấp quyền; danh sách ghế kèm đơn giá snapshot. Khi status PENDING nhưng `expiresAt <= now`, UI hiển thị `isExpired=true` hoặc `effectiveStatus=EXPIRED` **mà không nhất thiết sửa DB bằng GET**.
- `GET /api/bookings/{id}/tickets`: chỉ booking CONFIRMED mới trả ticket_code. Booking khác owner → 404.

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

`GET /api/admin/reports/revenue?from=2026-11-01&to=2026-11-30`: hai ngày theo local calendar; server convert `[startLocal 00:00, dayAfterEndLocal 00:00)` sang UTC. Trả `totalRevenue`, `successfulPayments`, `currency="VND"`, danh sách `dailyRevenue`.

## 10. Ràng buộc tích hợp frontend

1. Không gửi `userId`, `role`, `totalAmount`, `currentBookingId` trong request tạo booking.
2. Tạo **key mới cho mỗi intent** người dùng, nhưng giữ nguyên key khi retry cùng intent; refresh trang không phát sinh thanh toán đôi.
3. UI đếm ngược 5 phút mang tính hiển thị; server kiểm tra thời gian thật.
4. Khi POST bị 409, refresh sơ đồ ghế; không tự cập nhật ghế thành BOOKED nếu payment chưa SUCCESS.
5. Ẩn các nút đặt vé khi gần cutoff để UX tốt, nhưng backend luôn enforce BR-08.
