# 12. Test Fixtures và kịch bản demo

Các mã/ID bên dưới chỉ để minh họa. **Không hardcode DB ID** trong production code hay test; lấy ID từ seed/setup output.

## 1. Dữ liệu seed tối thiểu

| Entity | Dữ liệu gợi ý |
|---|---|
| Cinema | `CGV Demo` (tên giả lập), ACTIVE |
| Rooms | `Phòng 01`, `Phòng 02`; cả hai ACTIVE |
| Seats | Mỗi room 5 hàng × 8 ghế (40 ghế), A-C STANDARD, D-E VIP, ACTIVE |
| Movies | `Phim A` (120 phút), `Phim B` (95 phút), `Phim C` (110 phút) |
| Showtimes | 4 suất không overlap; ít nhất 1 suất có giá 75,000/95,000 VIP |
| Accounts | 1 ADMIN, 1 STAFF, 2 CUSTOMER (tên giả lập, password hash) |

**Gợi ý cố định cho test:** `2026-11-10T12:00:00Z` = **19:00 GMT+7**, `endsAt=2026-11-10T14:00:00Z`, cleanup 15 phút. Tại thời điểm bắt đầu request giả định `2026-11-10T11:30:00Z`, cutoff là `11:50:00Z`, nên booking hợp lệ; TTL đến `11:35:00Z`.

| Ghế | Loại | Đơn giá khi basePrice=75000, vipSurcharge=20000 |
|---|---|---:|
| A1 | STANDARD | 75000.00 |
| A2 | STANDARD | 75000.00 |
| D1 | VIP | 95000.00 |

## 2. Request ví dụ — thành công

**Create booking:**

```http
POST /api/bookings
Authorization: Bearer <customer-jwt>
Content-Type: application/json
```

```json
{
  "showtimeId": 101,
  "seatIds": [1, 2],
  "clientRequestId": "6c1282ed-cbc3-4fb9-9017-0ea88953b1a4"
}
```

Expected: 201, booking PENDING, A1/A2 HELD, total 150000.00, expires after 5 min.

**Mock payment:**

```json
{"simulatedResult": "SUCCESS", "idempotencyKey": "pay-1001-f61d0b1f-4b7e-4f80"}
```

Expected: 200, booking CONFIRMED, ghế BOOKED, 2 ticket codes duy nhất.

**Check-in (staff):**

```json
{"ticketCode": "<ticket-code-from-payment>"}
```

Expected: 200 CHECKED_IN, thực hiện lần hai 409.

## 3. Kịch bản demo minh họa điểm mạnh Backend

### DEMO-01 — Không bán trùng ghế

1. Tạo suất T và A1 AVAILABLE.
2. Customer A, B trên hai browser đăng nhập; cùng chọn A1.
3. A và B cùng POST booking (khác request key).
4. Một người thành công; người còn lại nhận 409; DB có **một** owner ở showtime_seats.
5. Nếu chạy 20 threads trên server/test, xác minh số lượng success = 1.

### DEMO-02 — Hết hạn / reclaim an toàn

1. A giữ A2, ghi `expiresAt`.
2. Trong môi trường test, **điều khiển Clock hoặc set fixture thời gian** để vượt TTL; không cần chờ thật 5 phút.
3. B giữ A2 → hợp lệ vì A hết hạn.
4. Chạy cleanup của A → A EXPIRED; A2 vẫn HELD bởi B.
5. A thử mock payment SUCCESS → bị từ chối.

### DEMO-03 — Thanh toán FAILED vẫn retry được

1. Customer giữ ghế mới, booking PENDING.
2. Gửi payment FAILED với key K1 → một payment FAILED, booking PENDING.
3. Gửi payment SUCCESS với key K2 **trước hạn** → booking CONFIRMED.
4. Gửi lại K2 → kết quả cũ, không ghi SUCCESS trùng hoặc sinh vé mới.
5. Gửi K3 sau CONFIRMED → 409.

### DEMO-04 — Trùng lịch phòng chiếu

1. Suất 19:00–21:00, cleanup 15 phút, ở Phòng 01.
2. Thử tạo suất mới 21:00–23:00 cùng phòng → 409 vì trước 21:15.
3. Tạo lúc 21:15 → hợp lệ nếu không giao với suất khác.
4. Thử hai request admin cùng tạo suất giao nhau đồng thời → chỉ một thành công.

### DEMO-05 — Bảo mật phân quyền

1. Customer A GET booking của B → 404 theo API contract.
2. Customer thử POST `/api/admin/showtimes` → 403.
3. Staff check-in ticket hợp lệ trong khung giờ → 200; lần sau → 409.

## 4. Ghi chú tạo seed an toàn

- Không commit JWT token, mật khẩu plaintext hoặc `.env` production.
- Tài khoản demo dùng email giả lập dưới domain `example.test` hoặc `example.com`.
- Seed có thể sử dụng `CommandLineRunner` chỉ cho profile `dev/test`, SQL migration seed hoặc test factory.
- Các tests về TTL phải kiểm soát đồng hồ, tránh `Thread.sleep(5 minutes)`.
- Ví dụ ngày 10/11/2026 phục vụ fixture, không giả định thời điểm máy chạy luôn ở trước ngày đó.
