# Kế hoạch triển khai frontend — Cinema Booking

> Ngày lập: 04/11/2026. Kế hoạch dựa trên source hiện tại, không phải checklist cho dự án bắt đầu từ số 0.
> Phạm vi thay đổi ở bước lập kế hoạch: chỉ tài liệu, chưa triển khai feature hoặc chạy kiểm thử.

## 1. Mục tiêu và nguyên tắc sắp thứ tự

Ưu tiên hoàn thành một luồng đặt vé sử dụng API thật trước khi mở rộng quản trị:

```text
Chuẩn hóa tích hợp + UI dùng chung
  → Xác thực và phân quyền
  → Tìm phim / xem rạp / chọn suất
  → Chọn ghế
  → Tạo booking và giữ ghế
  → Thanh toán mô phỏng và nhận vé
  → Lịch sử / chi tiết / hủy đơn
  → Staff check-in
  → Admin: phim → phòng/ghế → suất chiếu → doanh thu
  → Nghiệm thu toàn hệ thống
```

- Kế thừa React, TypeScript, Vite, Router, TanStack Query, Axios, Tailwind và Oxlint đã có; không scaffold lại.
- Làm từng lát cắt hoàn chỉnh: **types → API → query/mutation hook → component → page/route → test**.
- Kiểm thử đi cùng từng feature; giai đoạn cuối dành cho hồi quy, không phải lúc bắt đầu viết test.
- Dùng dữ liệu seed để hoàn thiện luồng khách hàng trước; không bắt buộc xây xong admin mới làm được booking.
- Backend quyết định tồn kho ghế, giá chính thức, quyền, hạn giữ và kết quả thanh toán. Frontend chỉ hỗ trợ UX.
- Mọi task bên dưới đều chưa được đánh dấu hoàn thành; có file/component không đồng nghĩa feature đã nghiệm thu.

## 2. Hiện trạng cần tính đến

| Hạng mục | Quan sát từ source | Hướng xử lý |
|---|---|---|
| Khung ứng dụng | Đã có `app/`, `features/`, `shared/`, providers, router và layout | Hoàn thiện trên cấu trúc hiện có |
| Code song song | Có `src/components`, `src/api`, `src/context`, `src/types` bên cạnh cấu trúc mới; entry hiện dùng `@/app/App` | Kiểm tra import trước khi hợp nhất; không xóa theo tên thư mục |
| Public pages | Có Home, MovieDetails, Cinemas, Showtimes | Rà soát dữ liệu thật, điều hướng và loading/error/empty |
| Auth | Có login/register/context; register frontend giả định nhận token nhưng backend trả `UserResponse` | Sửa contract, đăng ký thành công chuyển sang đăng nhập |
| Lịch chiếu | Frontend gọi `GET /showtimes`; controller hiện cung cấp `GET /movies/{id}/showtimes` với ngày bắt buộc | Chọn phim + ngày rồi gọi endpoint hiện hữu; chưa giả định API lịch tổng |
| Seat map | API frontend khai báo mảng; backend trả object chứa `showtimeId`, `startsAt`, `bookingClosesAt`, `seats` | Sửa DTO trước khi dựng màn chọn ghế |
| Booking | Mới có API create; type dùng `id`, trong contract backend là `bookingId` | Tách type create/detail/history/cancel, không dùng chung một type sai |
| Vé | Frontend gọi `/tickets/my`, không thấy endpoint tương ứng trong controller hiện tại | Dùng `/bookings/me` và `/bookings/{id}/tickets` |
| Điều hướng đặt vé | Chưa có route chọn ghế/checkout; link từ chi tiết phim đưa `showtimeId` vào trang chưa đọc tham số đó | Nối trực tiếp tới route chọn ghế của suất |
| Quản trị | Dashboard chủ yếu là thẻ giới thiệu, số liệu tĩnh | Xây màn hình thao tác thật, bỏ số liệu và tính năng không có trong MVP |
| Kiểm thử frontend | `package.json` có dev/build/lint/preview, chưa có test script/dependency | Bổ sung test harness sớm |

Các quan sát trên là đối chiếu source, **chưa phải kết quả chạy API hoặc kiểm thử trình duyệt**.

## 3. Bảng thứ tự triển khai

P0 = luồng đặt vé cốt lõi; P1 = hoàn chỉnh nghiệp vụ MVP; P2 = nâng cao, ngoài đợt đầu.

| Bước | Feature / đầu ra | Ưu tiên | Phụ thuộc |
|---|---|---|---|
| FE-00 | Chốt contract, dọn điểm tích hợp, test harness | P0 | Không |
| FE-01 | UI dùng chung và layout | P0 | FE-00 |
| FE-02 | Auth, session, role guards | P0 | FE-00, FE-01 |
| FE-03 | Movies + Cinemas + Showtimes public | P0 | FE-00, FE-01 |
| FE-04 | Seat selection | P0 | FE-03 |
| FE-05 | Create booking, giữ ghế, khôi phục checkout | P0 | FE-02, FE-04 |
| FE-06 | Mock payment + xác nhận + vé | P0 | FE-05 |
| FE-07 | Lịch sử, chi tiết, hủy booking | P1 | FE-05, FE-06 |
| FE-08 | Staff/Admin check-in | P1 | FE-02, FE-06 |
| FE-09 | Admin quản lý phim và poster | P1 | FE-02, FE-03 |
| FE-10 | Admin phòng/ghế → quản lý suất chiếu | P1 | FE-09; phòng/ghế trước suất |
| FE-11 | Admin báo cáo doanh thu | P1 | FE-02, dữ liệu payment SUCCESS để nghiệm thu |
| FE-12 | E2E, responsive, accessibility, build/deploy | P0/P1 | Các bước thuộc MVP |

**Mốc demo:** FE-00…06 tạo luồng mua vé đầu tiên; thêm FE-07…08 có luồng khách hàng và soát vé; thêm FE-09…12 hoàn chỉnh MVP.

## 4. Chi tiết từng bước

### FE-00 — Chuẩn hóa nền tích hợp

**Đối chiếu:** FR-15; BR-21; TC-26/31/39.

- [ ] Đối chiếu controller + DTO backend, tài liệu API và Swagger của môi trường chạy; ghi rõ chênh lệch thay vì tự sửa hợp đồng.
- [ ] Giữ base URL `/api` và proxy Vite hiện có; kiểm tra dev và phương án gọi API khi deploy.
- [ ] Chuẩn hóa `PageResponse<T>`, lỗi API có HTTP status, `code`, `message`, `fieldErrors` và correlation ID khi có.
- [ ] Sửa DTO auth, showtime/seat map, booking và ticket theo hiện trạng ở mục 2.
- [ ] Tách query keys theo feature và đầy đủ tham số: phim, ngày, rạp, phân trang, booking ID; cache dữ liệu riêng phải gắn phiên/người dùng hoặc được xóa khi đổi tài khoản.
- [ ] Không auto-retry mutation không kiểm soát; timeout có thể xảy ra sau khi server đã commit.
- [ ] Rà soát các file cũ/song song theo import graph; chỉ hợp nhất khi đã xác nhận phạm vi sử dụng.
- [ ] Thiết lập Vitest + React Testing Library; MSW cho API mock, Playwright cho E2E khi bắt đầu luồng tích hợp.
- [ ] Ghi baseline `npm run lint`, `npm run build` trước khi sửa code; không gộp lỗi cũ vào kết quả feature mới.

**Nghiệm thu:** Có bộ types/API nhất quán cho luồng mua vé, test mẫu chạy được; không còn phụ thuộc vào endpoint giả định trong phần tích hợp đã sửa.

### FE-01 — UI foundation và layout

**Đối chiếu:** FR-15; dùng chung cho UC-01…09.

- [ ] Tái sử dụng Button, Input, Modal, LoadingSpinner và MainLayout hiện có; bổ sung ErrorState, EmptyState, StatusBadge, Pagination, thông báo kết quả khi cần.
- [ ] Thống nhất màu sắc, typography, spacing, trạng thái pending/disabled/error và thông báo tiếng Việt.
- [ ] Hoàn thiện header/nav theo vai trò; layout admin/staff chỉ bổ sung khi có màn hình thực tế.
- [ ] Form có label, lỗi theo trường; modal quản lý focus; bàn phím và focus ring hoạt động.
- [ ] Test component nền và responsive trên mobile/desktop.

**Nghiệm thu:** Feature sau dùng được thành phần chung, không phải tự viết lại loading/error/form mỗi trang.

### FE-02 — Xác thực, phiên đăng nhập và phân quyền

**Đối chiếu:** FR-03/15; BR-21; TC-15/25/30/39.

- [ ] Sửa đăng ký nhận `UserResponse`; hiển thị thành công và chuyển tới login, không đọc token không tồn tại.
- [ ] Hoàn thiện đăng nhập, đăng xuất và khôi phục phiên qua `GET /auth/me`.
- [ ] Phân biệt token không hợp lệ với lỗi mạng khi khôi phục phiên; có trạng thái thử lại, không coi mọi lỗi mạng là hết phiên.
- [ ] Xử lý 401 ở trang private, tránh vòng lặp redirect; lưu đường dẫn nội bộ để quay lại sau login.
- [ ] Bổ sung guard CUSTOMER và guard STAFF/ADMIN; `ProtectedRoute` chỉ kiểm tra đăng nhập là chưa đủ cho booking.
- [ ] Logout/đổi tài khoản phải xóa cache dữ liệu riêng và intent nhạy cảm của tài khoản cũ.
- [ ] Không tự thêm refresh-token flow khi backend chưa hỗ trợ; không coi role/JWT ở client là biện pháp bảo mật API.

**Nghiệm thu:** Refresh giữ phiên hợp lệ; customer/staff/admin chỉ thấy và vào đúng màn hình; đăng ký không gửi role đặc quyền.

### FE-03 — Tra cứu phim, rạp và suất chiếu

**Đối chiếu:** FR-01/02/15; UC-01; BR-01/04/08; TC-19/26/27/28/37.

- [ ] Hoàn thiện danh sách phim: tìm kiếm có debounce, lọc trạng thái/thể loại, phân trang; lưu bộ lọc trong URL.
- [ ] Hoàn thiện chi tiết phim: poster fallback, dữ liệu tùy chọn, trạng thái ENDED/UPCOMING/SHOWING đúng nghĩa, 404 phim ẩn/không tồn tại.
- [ ] Tích hợp rạp public hiện có; dữ liệu fallback nếu giữ phải gắn nhãn demo, không cho dùng ID fallback để đặt vé thật.
- [ ] Chọn phim + ngày Việt Nam + rạp tùy chọn, gọi `GET /movies/{id}/showtimes`; đọc page envelope thay vì giả định mảng.
- [ ] Trang `/showtimes` chưa chọn phim hiển thị bộ chọn phim, không gọi endpoint lịch tổng chưa có.
- [ ] Có ngày mặc định theo `Asia/Ho_Chi_Minh`, không dùng `toISOString().split('T')[0]` làm ngày Việt Nam.
- [ ] Nút chọn suất đi tới `/showtimes/:showtimeId/seats`; vô hiệu hóa tạo hold mới khi đã đến cutoff.
- [ ] Phân biệt loading/error/empty lịch chiếu; không biến lỗi API thành thông báo “không có suất”.

**Nghiệm thu:** Guest đi từ danh sách phim đến đúng suất; bộ lọc hoạt động khi refresh/back; ngày và giờ Việt Nam không lệch tại ranh giới UTC.

### FE-04 — Chọn ghế theo suất

**Đối chiếu:** FR-02/06/07; UC-01/03; BR-05/06/08/09/11; TC-02/12/19/20/38.

- [ ] Tạo `SeatSelectionPage`, `SeatMap`, `Seat`, `SeatLegend`, `BookingSummary` và hook lấy seat map.
- [ ] Dùng `seatId`, `label`, `seatType`, effective `status`, `price` từ response; không yêu cầu các field hàng/số/ID inventory mà API chưa trả.
- [ ] Hiển thị AVAILABLE/HELD/BOOKED; `selected` là state cục bộ riêng, không phải ghế đã được giữ.
- [ ] Chỉ chọn ghế AVAILABLE, không trùng, tối đa 8; đổi suất phải reset lựa chọn.
- [ ] Dùng giá API để tạm tính; luôn ghi rõ tổng chính thức được xác định khi server tạo booking.
- [ ] Poll/refetch khi focus và khi có xung đột; ví dụ chu kỳ 10 giây, dừng khi rời trang. Không cần websocket cho MVP.
- [ ] Khi refresh ghế, loại lựa chọn không còn khả dụng và báo cho người dùng; GET không đảm bảo POST sẽ thành công.
- [ ] Cho Guest xem ghế; khi tiếp tục đặt, yêu cầu CUSTOMER đăng nhập rồi tải lại dữ liệu trước khi xác nhận.

**Nghiệm thu:** Mobile chọn/bỏ ghế được, có mô tả truy cập bằng bàn phím; ghế bị giữ/bán không thể chọn; chưa có POST thì không tuyên bố giữ chỗ thành công.

### FE-05 — Booking và giữ ghế 5 phút

**Đối chiếu:** FR-06/07/10/14; UC-03/06; BR-06…12/15; TC-01/03/04/05/07/17/19/20.

- [ ] Tạo mutation POST `/bookings`; gửi duy nhất `showtimeId`, tập `seatIds` vật lý và `clientRequestId`.
- [ ] Sinh key mới cho intent mới; giữ nguyên key và payload khi retry timeout/click lặp cùng intent. Thay phim/suất/tập ghế là intent mới.
- [ ] Lưu intent đủ để khôi phục sau refresh trong phiên, có scope tài khoản; không lưu JWT/mã vé vào URL hoặc log.
- [ ] Disable nút khi submit; thành công nhận `bookingId`, giá server và `expiresAt`, chuyển `/bookings/:bookingId/checkout`.
- [ ] Tải lại trực tiếp checkout bằng GET booking; không phụ thuộc dữ liệu truyền qua router state hoặc tạo booking tự động khi mount.
- [ ] Đếm ngược từ `expiresAt`, không khởi động lại 5 phút sau refresh. Timer chỉ là UX; GET/effectiveStatus và kiểm tra của backend quyết định trạng thái thật.
- [ ] Hết giờ: chặn thao tác mới, refetch booking/seat map; không cần đợi scheduler đổi persisted status.
- [ ] `SEAT_UNAVAILABLE`: refresh ghế, báo xung đột; all-or-nothing, không tự coi ghế còn lại đã được giữ.
- [ ] Xử lý riêng cutoff, expired, idempotency conflict và concurrent conflict; replay có thể trả booking terminal, không mặc định luôn là PENDING.

**Nghiệm thu:** Hai trình duyệt tranh ghế có thông báo đúng; double click/retry không tạo đơn đôi; refresh không gia hạn hold và không tạo đơn mới.

### FE-06 — Thanh toán mô phỏng và nhận vé

**Đối chiếu:** FR-08/12/14; UC-04/08; BR-12…15/17; TC-06/07/08/16/22.

- [ ] Tạo `features/payments` theo cùng cấu trúc api/types/hooks/components; không thêm cổng thanh toán thật.
- [ ] Checkout hiển thị ghế, đơn giá snapshot, tổng server, hạn giữ; chỉ CUSTOMER owner còn PENDING và hiệu lực mới thao tác.
- [ ] Gọi POST `/bookings/{id}/payments/mock`, có thao tác mô phỏng SUCCESS/FAILED và ghi nhãn rõ.
- [ ] Key gắn với một payment attempt: retry kỹ thuật cùng payload dùng key cũ; lần thử mới sau FAILED hoặc đổi `simulatedResult` dùng key mới.
- [ ] Timeout không được mặc định là payment FAILED: GET booking để đối soát, retry cùng key nếu cần; không tự tạo key mới và thanh toán lại.
- [ ] FAILED hiển thị lỗi lần thanh toán nhưng booking còn PENDING nếu chưa hết hạn; không đổi booking thành FAILED.
- [ ] Replay FAILED là kết quả attempt cũ, không dùng nó để ghi đè booking hiện tại đã CONFIRMED; refetch GET booking.
- [ ] SUCCESS chuyển trang xác nhận, hiển thị mã vé server cấp; refresh lấy lại qua GET booking và `/bookings/{id}/tickets`.
- [ ] Không optimistic update thành CONFIRMED/BOOKED, không sinh vé ở client; invalidation booking/history/seat map sau mutation.

**Nghiệm thu:** FAILED → thử mới SUCCESS trong hạn; timeout/reload không thanh toán đôi; hết hạn không nhận vé; CONFIRMED lấy lại được cùng mã vé.

### FE-07 — Đơn của tôi, chi tiết và hủy đơn

**Đối chiếu:** FR-09/10/12; UC-05/06/08; BR-15/16/17/21; TC-09/10/15.

- [ ] Dùng GET `/bookings/me` có phân trang cho lịch sử; tận dụng/sửa `MyTicketsPage` thay vì tạo nguồn dữ liệu vé giả.
- [ ] Tạo trang chi tiết dùng GET `/bookings/{id}`; hiển thị `effectiveStatus` và snapshot giá, không tính lại theo bảng giá hiện tại.
- [ ] PENDING còn hạn có “Tiếp tục thanh toán” và “Hủy đơn”; CONFIRMED có xem vé; EXPIRED/CANCELLED không có nút thanh toán.
- [ ] Hủy qua POST `/bookings/{id}/cancel` có xác nhận và trạng thái pending; xử lý đơn vừa hết hạn/vừa được thanh toán.
- [ ] Chỉ gọi GET tickets khi CONFIRMED; không tải vé cho mọi đơn trong danh sách.
- [ ] Owner khác/không tồn tại hiển thị lỗi không lộ thông tin; logout xóa dữ liệu riêng.

**Nghiệm thu:** Đơn PENDING tiếp tục được sau reload; hủy đơn giải phóng ghế qua backend; không có chức năng hủy/hoàn tiền CONFIRMED.

### FE-08 — Staff/Admin check-in

**Đối chiếu:** FR-11; UC-07; BR-17/18/21; TC-13/14/21.

- [ ] Tạo route `/staff/check-in`, guard STAFF hoặc ADMIN, input nhập/dán `ticketCode`.
- [ ] POST `/staff/tickets/check-in`; không gửi `staffId`, không sửa/case-fold mã vé.
- [ ] Hiển thị phim/phòng/ghế/giờ khi thành công; phân biệt vé sai, đã dùng và ngoài cửa sổ hợp lệ.
- [ ] Chặn submit lặp lúc đang xử lý; không tự retry mutation check-in khi lỗi mạng, báo kết quả chưa xác định nếu cần.
- [ ] Không hiển thị toàn bộ lịch sử khách cho staff; không log mã vé. Camera QR để sau MVP.

**Nghiệm thu:** Staff check-in được một lần; lần hai có thông báo đã dùng; CUSTOMER/Guest bị chặn cả route lẫn API.

### FE-09 — Admin phim và poster

**Đối chiếu:** FR-04/15; UC-02; BR-19/21; TC-29/30/31/41…45.

- [ ] Tạo admin layout và form thêm/sửa metadata phim; ẩn bằng status HIDDEN, không xóa lịch sử.
- [ ] Thay dashboard tĩnh bằng điều hướng thật; bỏ số đếm hardcode, Sweetbox/Gold Class và quản lý tài khoản chưa thuộc API MVP.
- [ ] Tạo phim trước, sau đó upload poster qua POST multipart `/admin/movies/{id}/poster`; nếu upload lỗi vẫn cho biết phim đã được tạo.
- [ ] Preview JPEG/PNG, kiểm tra 5 MiB ở client; server vẫn kiểm tra thật. Không đặt Cloudinary secret trong `VITE_*`, không upload trực tiếp bằng secret client.
- [ ] Hiển thị lỗi 413/415/502/503; không auto-retry upload khi chưa xác định kết quả.

**Phụ thuộc cần chốt:** Hiện chưa có GET danh sách/chi tiết phim admin; API public luôn loại HIDDEN. Có thể demo tạo/sửa phim công khai bằng API hiện có, nhưng để quản trị và khôi phục phim ẩn đầy đủ phải thống nhất bổ sung API đọc admin + contract/test. Không giả định endpoint này đã tồn tại hoặc dùng cache trình duyệt làm nguồn dữ liệu lâu dài.

**Nghiệm thu:** Tạo/sửa phim, upload poster và cập nhật public view được; nghiệp vụ quản lý phim ẩn chỉ đánh dấu hoàn thành khi điểm phụ thuộc đã được giải quyết.

### FE-10 — Admin phòng, ghế và suất chiếu

**Đối chiếu:** FR-04/05; UC-02; BR-01…05/19/20/21; TC-11/23/32…36/39/40.

Thực hiện đúng thứ tự dữ liệu phụ thuộc:

1. [ ] Chọn rạp seed từ GET `/admin/cinemas`; lấy danh sách phòng theo rạp.
2. [ ] Tạo/sửa phòng; lấy sơ đồ ghế vật lý; khởi tạo batch và sửa ghế STANDARD/VIP, ACTIVE/MAINTENANCE.
3. [ ] Form tạo suất chọn phim + phòng đã có ghế ACTIVE, nhập thời gian, giá cơ bản, VIP surcharge và cleanup.
4. [ ] Chuyển input giờ Việt Nam thành timestamp có Z/offset khi gửi; không gửi `datetime-local` thiếu timezone.
5. [ ] POST/PUT lịch, hiển thị lỗi overlap gồm cleanup và lỗi thay đổi cấu trúc có lịch sử; refetch sau conflict.
6. [ ] Sau tạo suất, kiểm tra lịch public và seat map đã xuất hiện; phục vụ tiếp luồng booking thật.

**Ràng buộc:** Cấu hình phòng/ghế không được sửa khi phòng đã có bất kỳ suất nào; lịch có bất kỳ booking lịch sử nào không được sửa theo contract hiện tại. UI không tự override giới hạn backend.

**Phụ thuộc cần chốt:** Chưa có GET danh sách/chi tiết suất admin trong controller hiện tại. Lịch public theo phim/ngày chỉ dùng cho phạm vi public phù hợp, không coi là danh sách quản trị toàn bộ. Cần API đọc admin nếu muốn liệt kê/chỉnh sửa đầy đủ mọi suất; không tự thêm DELETE hoặc đổi trạng thái suất qua PUT chưa hỗ trợ.

**Nghiệm thu:** Admin tạo phòng → ghế → lịch → khách thấy lịch và đặt vé; overlap và thay đổi không an toàn có thông báo rõ. Màn hình sửa/liệt kê đầy đủ cần giải quyết API đọc admin trước khi nghiệm thu.

### FE-11 — Báo cáo doanh thu

**Đối chiếu:** FR-13; UC-09; BR-22; TC-24/26.

- [ ] Route `/admin/reports/revenue`; chọn `from/to` theo ngày Việt Nam, validate `from <= to`.
- [ ] GET `/admin/reports/revenue`; hiển thị tổng doanh thu, số payment thành công và bảng theo ngày.
- [ ] Dữ liệu rỗng hiển thị 0; chỉ có ngày phát sinh theo response, không giả định mọi ngày đều có một dòng.
- [ ] Không cộng lại doanh thu từ booking hoặc payment FAILED; chart chỉ thêm sau khi bảng hoạt động đúng.

**Nghiệm thu:** FAILED không tăng doanh thu, SUCCESS tăng đúng theo ngày `paidAt` Việt Nam; chỉ ADMIN truy cập được.

### FE-12 — Nghiệm thu và phát hành demo

- [ ] Chạy hồi quy theo ma trận mục 6; kiểm tra không có request tới endpoint chưa được hỗ trợ.
- [ ] Responsive trang chọn ghế/checkout/admin; keyboard, label, focus, độ tương phản, thông báo không chỉ dựa vào màu.
- [ ] Lazy-load phần admin/staff khi cần, kiểm tra ảnh lỗi và tránh request trùng; không tối ưu cache làm dữ liệu ghế bị cũ.
- [ ] Chuẩn bị seed/showtime còn hiệu lực tại ngày demo; không dựa vào suất ngày cố định đã qua cutoff.
- [ ] Kiểm tra production routing fallback cho URL con và API base URL/proxy của môi trường deploy, không chỉ Vite dev.
- [ ] Cập nhật README về lệnh chạy/test, tài khoản demo theo vai trò và các giới hạn còn lại.
- [ ] Ghi đúng lệnh, môi trường, kết quả pass/fail/skip; chỉ đánh dấu task đã thực sự kiểm chứng.

## 5. Routes và vị trí code dự kiến

Các route mới là đề xuất triển khai, không mô tả tính năng đã có.

| Route | Quyền |
|---|---|
| `/`, `/movies`, `/movies/:id`, `/cinemas`, `/showtimes` | Public |
| `/showtimes/:showtimeId/seats` | Public xem ghế; CUSTOMER mới tạo booking |
| `/login`, `/register` | Public |
| `/bookings/:bookingId/checkout` | CUSTOMER owner |
| `/bookings/:bookingId/success` | CUSTOMER owner; xác minh trạng thái từ API |
| `/my-tickets`, `/bookings/:bookingId` | CUSTOMER owner |
| `/staff/check-in` | STAFF/ADMIN |
| `/admin`, `/admin/movies`, `/admin/rooms`, `/admin/showtimes`, `/admin/reports/revenue` | ADMIN |

- `src/app/router`: cấu hình route và guards; không chứa request chi tiết của feature.
- `src/pages`: ghép màn hình; có thể tách `pages/admin`, `pages/staff` khi bắt đầu các màn này.
- `src/features/auth|movies|cinemas|showtimes|bookings|tickets`: mở rộng module hiện có; thêm `payments` khi đến FE-06.
- `src/features/reports`: thêm khi làm báo cáo; nghiệp vụ check-in có thể đặt trong `tickets`, không cần một module staff riêng chỉ vì vai trò.
- `src/shared`: HTTP client, UI primitives, format tiền/giờ và type dùng chung; không import ngược pages/features.
- Dùng Context hiện có cho auth, TanStack Query cho server state, local state cho lựa chọn ghế; chưa cần thêm Zustand.

## 6. Kiểm thử bắt buộc theo mốc

| Kịch bản frontend/integration/E2E | Mốc | Tham chiếu |
|---|---|---|
| Register → login → reload → logout; role sai bị chặn | FE-02 | FR-03, TC-25/30/39 |
| Tìm/lọc/phân trang phim, phim ẩn 404, lịch đúng ngày Việt Nam | FE-03 | TC-26/27/28/37 |
| Chọn 1–8 ghế, không chọn HELD/BOOKED, tổng giá tạm tính đúng | FE-04 | TC-02/20/38 |
| Hai customer tranh một ghế, bên thua thấy conflict và refresh | FE-05 | TC-03/04 |
| Double click, timeout rồi retry, refresh checkout dùng cùng intent | FE-05/06 | TC-08/17/22 |
| TTL hết nhưng scheduler chưa chạy; reload không reset timer | FE-05/06 | TC-05/07/18 |
| Payment FAILED → attempt mới SUCCESS; replay FAILED không hạ trạng thái CONFIRMED | FE-06 | TC-06/16/22 |
| Lấy lại vé sau reload, user khác không đọc được đơn/vé | FE-06/07 | TC-15, BR-17/21 |
| Hủy PENDING; CONFIRMED không hủy; cancel tranh với payment | FE-07 | TC-09/10 |
| Check-in một lần; dùng lại/ngoài khung giờ bị từ chối | FE-08 | TC-13/14/21 |
| Upload poster lỗi/định dạng sai; thiếu cấu hình provider | FE-09 | TC-41…45 |
| Phòng/ghế có suất bị khóa; lịch trùng cleanup; lịch có history không sửa | FE-10 | TC-11/23/32…36 |
| Revenue chỉ tăng với SUCCESS, đúng ranh giới ngày Việt Nam | FE-11 | TC-24/26 |

**Lưu ý:** TC ở trên là traceability nghiệp vụ của dự án, không có nghĩa các test frontend đã tồn tại. API mock kiểm tra UI; các bất biến transaction/concurrency vẫn phải được chứng minh bằng backend/MySQL tests, không thay thế bằng MSW.

Lệnh hiện có, chạy trong `frontend/`:

```powershell
npm run lint
npm run build
```

Lệnh dự kiến bổ sung trong FE-00 và trước E2E, **hiện chưa có script**:

```powershell
npm run test -- --run
npm run test:e2e
```

Chỉ chạy E2E với backend/database test riêng và dữ liệu demo; không dùng thanh toán thật hoặc dữ liệu production.

## 7. Definition of Done cho mỗi feature

- [ ] Có API/types khớp backend và đã xử lý chênh lệch contract liên quan.
- [ ] Có loading, empty, error, pending/disabled và các trạng thái nghiệp vụ áp dụng.
- [ ] Deep link/refresh/back hoạt động; không phát sinh mutation chỉ vì mở trang.
- [ ] Role/ownership được kiểm tra ở backend; frontend chỉ hỗ trợ điều hướng/hiển thị.
- [ ] Cache được cập nhật sau mutation, không lộ dữ liệu tài khoản trước.
- [ ] Có test thành công, lỗi, quyền và expiry/conflict nếu áp dụng.
- [ ] Lint/build và test liên quan đã chạy; ghi rõ lỗi/skip/chưa chạy.
- [ ] Có thể demo bằng API thật; không dùng fallback để che lỗi của luồng giao dịch.

## 8. Những việc để sau MVP

- Websocket ghế, camera quét QR, thông báo email/SMS.
- Thanh toán thật, hoàn tiền/hủy vé đã xác nhận, đổi suất.
- Combo, coupon, loyalty, giá trẻ em/sinh viên và loại ghế ngoài STANDARD/VIP.
- Quản lý tài khoản/phân quyền staff, CRUD đa cụm rạp, dashboard thống kê không có API.
- Viết lại toàn bộ UI/kiến trúc hoặc cài thêm global store khi chưa có nhu cầu.

## 9. Tài liệu đối chiếu

- [Yêu cầu và ma trận quyền](../cinema-booking-ai-kit/docs/01-REQUIREMENTS.md)
- [Business rules](../cinema-booking-ai-kit/docs/02-BUSINESS-RULES.md)
- [Use cases](../cinema-booking-ai-kit/docs/03-USE-CASES.md)
- [Workflows](../cinema-booking-ai-kit/docs/04-WORKFLOWS.md)
- [API contract](../cinema-booking-ai-kit/docs/06-API-CONTRACT.md)
- [Test plan và TC](../cinema-booking-ai-kit/docs/08-TEST-PLAN.md)
- [Quyết định và gaps](../cinema-booking-ai-kit/docs/11-DECISIONS-AND-GAPS.md)
- [Kiến trúc frontend](../cinema-booking-ai-kit/docs/react-frontend-architecture.md)

**Việc đầu tiên nên implement:** FE-00, đặc biệt sửa contract register, lịch chiếu, seat map, booking và vé. Sau đó FE-01/02/03 để mở đường cho FE-04…06; chưa ưu tiên trang trí lại dashboard admin.
