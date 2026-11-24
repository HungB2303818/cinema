# KẾ HOẠCH BỔ SUNG BÁO CÁO DOANH THU VÀ THỐNG KÊ CHO ADMIN

**Trạng thái:** Đề xuất triển khai, chưa lập trình và chưa thực thi kiểm thử.  
**Nhóm bảo trì:** Bảo trì hoàn thiện.  
**Mã thay đổi đề xuất:** HT-DT-01 — mã theo dõi trong tài liệu này, chưa thay thế mã yêu cầu chính thức.  
**Phạm vi:** Giao diện quản trị, API báo cáo mở rộng, truy vấn tổng hợp, xuất CSV, kiểm thử và tài liệu.  
**Nguyên tắc:** Tận dụng module `report` hiện có; không thay đổi quy trình đặt vé, thanh toán hoặc check-in.

## 1. Mục tiêu và cơ sở nghiệp vụ

### 1.1. Mục tiêu

Bổ sung màn hình giúp ADMIN trả lời các câu hỏi:

- Trong khoảng thời gian được chọn, hệ thống ghi nhận bao nhiêu doanh thu thanh toán?
- Có bao nhiêu giao dịch thành công và bao nhiêu vé đã bán?
- Doanh thu tăng giảm ra sao theo ngày hoặc tháng?
- Phim và rạp nào mang lại nhiều doanh thu nhất?
- Có thể xuất số liệu để đối chiếu và lập báo cáo ngoài hệ thống không?

Hệ thống hiện chỉ có thanh toán mô phỏng. Giao diện phải ghi rõ **“Số liệu từ thanh toán mô phỏng”**; không trình bày đây là doanh thu tiền thực đã đối soát ngân hàng.

### 1.2. Yêu cầu gốc liên quan

| Tham chiếu hiện có | Nội dung liên quan |
|---|---|
| FR-13 | ADMIN xem doanh thu từ các thanh toán SUCCESS theo khoảng ngày. |
| UC-09 | Báo cáo doanh thu. |
| BR-22 | Doanh thu tính từ `payments.amount` khi status là SUCCESS, theo `paid_at`. |
| BR-11 | Giá của ghế được chốt tại thời điểm tạo đơn; không lấy giá hiện hành để tính lại. |
| BR-14 | Mỗi booking có tối đa một thanh toán thành công. |
| BR-19 | Không xóa vật lý dữ liệu có giao dịch. |
| TC-24 | Kiểm thử tổng hợp doanh thu. |
| NFR-07, NFR-09, NFR-10 | Múi giờ, phân quyền và migration có kiểm soát. |

Nguồn tham chiếu: `cinema-booking-ai-kit/docs/01-REQUIREMENTS.md`, `02-BUSINESS-RULES.md`, `03-USE-CASES.md`, `08-TEST-PLAN.md`.

Các yêu cầu mới dưới đây mở rộng FR-13/UC-09, không phải tuyên bố tất cả chức năng đã có trong phiên bản gốc. Khi đưa vào bộ tài liệu chính thức, cấp mã bổ sung sau khi kiểm tra trùng với các thay đổi khác.

## 2. Hiện trạng mã nguồn

| Thành phần | Hiện trạng đã xác minh | Hướng xử lý |
|---|---|---|
| `backend/src/main/java/com/example/cinema/report/controller/RevenueController.java` | Có GET `/api/admin/reports/revenue?from=...&to=...`, yêu cầu ADMIN. | Giữ hợp đồng cũ; thêm endpoint đọc và xuất báo cáo. |
| `report/service/RevenueService.java` | Trả tổng tiền, số thanh toán thành công, doanh thu các ngày có phát sinh; áp dụng ngày Việt Nam. | Giữ `report(from,to)`; bổ sung dịch vụ báo cáo mở rộng. |
| `report/repository/RevenueRepository.java` | Truy vấn trực tiếp bảng payments, lọc SUCCESS và khoảng `paid_at` nửa mở. | Tận dụng nguyên tắc tổng hợp; thêm truy vấn có lọc phim/rạp và nhóm thống kê. |
| `report/dto/RevenueResponse.java` | Có `totalRevenue`, `successfulPayments`, `currency`, `dailyRevenue`. | Không đổi kiểu dữ liệu hoặc ý nghĩa các trường hiện có. |
| Kiểm thử payment hiện có | Đã có mã test phân quyền báo cáo, SUCCESS/FAILED/INITIATED, biên ngày Việt Nam và khoảng rỗng. | Giữ test cũ; thêm test riêng cho báo cáo mở rộng. Chưa chạy lại trong lần lập kế hoạch này. |
| `frontend/src/app/router/index.tsx` | Có nhánh admin, chưa có route báo cáo. | Thêm `/admin/reports/revenue` trong `AdminRoute`. |
| `frontend/src/shared/components/layout/admin/AdminSidebar.tsx` | Có phim, phòng/ghế, suất chiếu; chưa có báo cáo. | Thêm mục **Doanh thu & thống kê**. |
| Frontend | Đã có Axios, TanStack Query, thành phần lọc/phân trang/trạng thái; chưa có thư viện biểu đồ trong `package.json`. | Tái sử dụng cấu trúc feature hiện tại; chọn biểu đồ đơn giản cho đợt đầu. |
| Schema | Có payments, bookings, booking_seats, showtimes, rooms, cinemas, movies. | Chưa cần bảng nghiệp vụ mới; đánh giá thêm index để phục vụ đọc báo cáo. |

Đường dẫn `report/...` trong bảng là tương đối với `backend/src/main/java/com/example/cinema/`.

### 2.1. Hai phương án

| Tiêu chí | A — Chỉ làm giao diện cho API hiện có | B — Giao diện và thống kê mở rộng |
|---|---|---|
| Chức năng | Tổng doanh thu, số giao dịch, bảng/biểu đồ ngày | Thêm số vé, bình quân/giao dịch, lọc phim/rạp, nhóm tháng, thống kê phim/rạp, CSV |
| Tác động | Chủ yếu frontend | Frontend và module report; index nếu cần |
| Ưu điểm | Ít rủi ro, có thể demo sớm | Phục vụ quản trị và báo cáo bảo trì đầy đủ hơn |
| Hạn chế | Ít khả năng phân tích | Phải kiểm tra kỹ phép tổng hợp và hiệu năng |
| Ước lượng sơ bộ | 2–3 ngày công | 8–12 ngày công, gồm kiểm thử và tài liệu |

**Đề xuất:** chọn B nhưng chia lát triển khai. Hoàn thành A làm mốc đầu, sau đó mở rộng. Không đưa tính năng chưa hoàn thành vào giao diện như thể đã hoạt động.

Ước lượng trên giả định người thực hiện đã quen Spring Boot/React, môi trường MySQL test sẵn có và không thêm quy trình tài chính mới; cần cập nhật sau khi chốt phạm vi.

## 3. Phạm vi chức năng đề xuất

### 3.1. Trong đợt này

| Mã cục bộ | Chức năng | Kết quả |
|---|---|---|
| DT-01 | Xem tổng quan | Tổng doanh thu thanh toán, giao dịch thành công, số vé đã bán, doanh thu bình quân mỗi giao dịch thành công. |
| DT-02 | Bộ lọc | Khoảng ngày thanh toán, rạp, phim; mặc định tháng hiện tại đến hôm nay. |
| DT-03 | Chọn nhanh thời gian | Hôm nay, 7 ngày gần nhất, tháng này, tháng trước. |
| DT-04 | Xu hướng theo thời gian | Biểu đồ và bảng theo ngày hoặc tháng; có các mốc không phát sinh. |
| DT-05 | Thống kê theo phim | Doanh thu, giao dịch và số vé của từng phim; sắp xếp, phân trang. |
| DT-06 | Thống kê theo rạp | Doanh thu, giao dịch và số vé của từng rạp; sắp xếp, phân trang. |
| DT-07 | Xuất CSV | Xuất dữ liệu đầy đủ của bảng đang chọn, theo bộ lọc đã áp dụng; không chỉ trang đang xem. |
| DT-08 | Làm mới và trạng thái | Thời điểm tạo báo cáo, nút làm mới, loading, không dữ liệu, lỗi và thử lại. |
| DT-09 | Bảo vệ dữ liệu | Chỉ ADMIN truy cập cả giao diện, API và chức năng xuất. |

### 3.2. Không làm trong đợt này

- Lợi nhuận, chi phí vận hành, thuế hoặc hóa đơn tài chính.
- Hoàn tiền, doanh thu thuần sau hoàn tiền, đối soát cổng thanh toán thật.
- Tỷ lệ lấp đầy phòng, hiệu suất suất chiếu và thống kê check-in; các chỉ số này cần quần thể theo ngày chiếu riêng, không nên trộn với ngày thanh toán.
- Tỷ lệ chuyển đổi hoặc tỷ lệ thanh toán thành công; cần định nghĩa rõ mẫu số giữa số lần thử và số đơn.
- So sánh tăng trưởng với kỳ trước, dự báo hoặc gợi ý kinh doanh bằng AI.
- Tự gửi báo cáo định kỳ, lưu báo cáo lịch sử, kho dữ liệu, cache máy chủ hoặc scheduler riêng.
- Xuất Excel/PDF; CSV là định dạng đầu tiên để hạn chế phụ thuộc.
- Thay đổi trang mặc định của `/admin`, mở quyền cho STAFF hoặc đọc dữ liệu cá nhân của khách trong báo cáo.

## 4. Quy tắc tính số liệu

### 4.1. Tập thanh toán dùng chung

Tất cả chỉ số trong cùng bộ lọc lấy từ một tập thanh toán hợp lệ:

```text
payments.status = SUCCESS
paid_at >= đầu ngày from theo giờ Việt Nam, đổi sang UTC
paid_at < đầu ngày (to + 1) theo giờ Việt Nam, đổi sang UTC
và khớp movieId/cinemaId nếu có
```

- Ngày bắt đầu và kết thúc đều được tính trọn ngày Việt Nam.
- Lọc thời gian theo **ngày thanh toán**, không theo ngày tạo đơn, ngày chiếu hoặc thời điểm check-in.
- Cả FAILED và INITIATED không được cộng vào doanh thu hoặc số giao dịch thành công.
- Không thêm điều kiện trạng thái hiện tại của phim, rạp hoặc suất để loại doanh thu đã ghi nhận. Phim HIDDEN/ENDED, rạp INACTIVE hoặc suất CANCELLED/COMPLETED vẫn phải được tính nếu có thanh toán SUCCESS trong kỳ.
- Không tự trừ doanh thu khi phim bị ẩn hoặc suất bị hủy. Nếu tương lai có hoàn tiền, phải đặc tả riêng cách ghi nhận điều chỉnh.
- Dùng cùng bộ lọc cho thẻ tổng quan, bảng, biểu đồ và CSV.

### 4.2. Định nghĩa chỉ số

| Chỉ số | Công thức/nguồn | Lưu ý |
|---|---|---|
| Tổng doanh thu thanh toán | Tổng `payments.amount` của tập hợp lệ | Đơn vị VND; không lấy giá vé hiện hành. |
| Giao dịch thành công | Số bản ghi payments trong tập hợp lệ | Không phải số vé, không phải tổng số lần thử. |
| Vé đã bán | Số dòng booking_seats có `ticket_code` của các booking thuộc tập thanh toán hợp lệ | Một đơn 3 ghế tương ứng 3 vé, 1 giao dịch. Không đếm các lựa chọn ghế của đơn hết hạn/hủy chưa thanh toán. |
| Doanh thu bình quân/giao dịch | Tổng doanh thu chia số giao dịch thành công | Mẫu số bằng 0 thì trả 0; không gọi là bình quân/vé. |
| Doanh thu theo ngày/tháng | Tổng tiền theo ngày/tháng Việt Nam của `paid_at` | Tháng đầu/cuối chỉ tính phần nằm trong khoảng lọc. |
| Doanh thu theo phim | Nhóm tập thanh toán theo ID phim của suất | Gom bằng ID, không gom theo tên; tên trùng không nhập thành một phim. |
| Doanh thu theo rạp | Nhóm theo ID rạp của phòng thuộc suất | Không tính thêm lần nữa do một đơn có nhiều ghế. |

**Ví dụ đối chiếu:** một đơn có 3 vé tổng 240.000 VND, có 2 lần FAILED và 1 lần SUCCESS. Báo cáo phải trả 240.000 VND, 1 giao dịch, 3 vé, bình quân 240.000 VND/giao dịch; không phải 720.000 VND hoặc 3 giao dịch.

### 4.3. Chống đếm trùng khi nối dữ liệu

- Tập cơ sở phải giữ một dòng cho mỗi thanh toán thành công.
- Nối payments → bookings → showtimes → rooms → cinemas/movies chỉ để xác định chiều lọc/nhóm.
- Đếm vé trong truy vấn riêng hoặc tổng hợp booking_seats theo booking trước khi nối với tập thanh toán.
- Không SUM `payments.amount` trực tiếp sau khi JOIN từng dòng booking_seats; tiền sẽ bị nhân theo số ghế.
- Không dùng `SUM(DISTINCT amount)` để chữa đếm trùng: hai đơn khác nhau có cùng số tiền vẫn phải được cộng cả hai.
- Có thể dùng `booking_seats.unit_price` để kiểm tra chéo dữ liệu, nhưng nguồn doanh thu chính vẫn là `payments.amount` theo BR-22.

### 4.4. Số tiền, khoảng rỗng và nhãn lịch sử

- Máy chủ tính bằng `BigDecimal`; số lượng dùng `long`.
- Bình quân làm tròn 2 chữ số thập phân với HALF_UP; giao diện hiển thị VND theo quy ước hiện tại. Không cộng lại các giá trị đã làm tròn để suy ra tổng tiền.
- API mở rộng trả số tiền dạng chuỗi thập phân, ví dụ `"240000.00"`, tránh mất chính xác khi vận chuyển số tổng lớn. API cũ giữ nguyên kiểu JSON hiện tại.
- Frontend chỉ chuyển đổi giá trị cho mục đích vẽ/định dạng trong giới hạn an toàn; không tự làm phép tính tiền. Nếu vượt miền an toàn của JavaScript, dùng định dạng chuỗi hoặc thư viện số thập phân, không ép sang Number âm thầm.
- Khoảng không phát sinh: các tổng bằng 0, danh sách nhóm phim/rạp rỗng; chuỗi thời gian vẫn có đủ ngày/tháng với giá trị 0.
- Tên phim/rạp là tên hiện tại trong danh mục; schema hiện chưa lưu snapshot tên cho báo cáo. Đổi tên có thể đổi nhãn trong báo cáo cũ, nhưng không được đổi số tiền. Chưa bổ sung cơ chế lịch sử tên trong đợt này.

### 4.5. Giới hạn và tính nhất quán

- Với **API mở rộng**: `from <= to`, năm 1000–9998; tối đa 366 ngày, tính cả hai đầu. Không áp giới hạn mới lên API cũ trong đợt này.
- Cho phép ngày tương lai nếu trong giới hạn; không tự tạo doanh thu dự kiến hoặc gán số liệu từ suất tương lai.
- `movieId`, `cinemaId` phải là số nguyên dương và tồn tại; không có bản ghi khớp hai bộ lọc thì trả báo cáo 0, không coi là lỗi.
- Một phản hồi dashboard được đọc trong cùng giao dịch chỉ đọc với snapshot nhất quán (đề xuất REPEATABLE_READ), để summary và timeSeries không lệch khi đang có thanh toán.
- Các endpoint dashboard, breakdown và export là những lần đọc riêng. Có thể khác nhau nếu có thanh toán mới giữa các lần gọi; giao diện ghi thời điểm tạo mỗi kết quả. Không tuyên bố tất cả là một snapshot lịch sử duy nhất.
- `generatedAt` chỉ là thời điểm tạo phản hồi, không phải khả năng truy vấn “dữ liệu như tại thời điểm quá khứ”.

## 5. Thiết kế giao diện và luồng sử dụng

### 5.1. Điều hướng và bố cục

- Menu: **Doanh thu & thống kê**.
- Route: `/admin/reports/revenue` trong nhánh admin hiện có.
- Giữ giao diện nhất quán với các trang quản trị: nền tối, thành phần và bảng dùng chung; không thay cả layout.

```text
Doanh thu & thống kê                          [Làm mới] [Xuất CSV]
Số liệu từ thanh toán mô phỏng

[Từ ngày] [Đến ngày] [Rạp] [Phim] [Áp dụng] [Đặt lại]
[Hôm nay] [7 ngày gần nhất] [Tháng này] [Tháng trước]

[Doanh thu] [Giao dịch thành công] [Vé đã bán] [Bình quân/giao dịch]

Xu hướng doanh thu                           [Theo ngày / Theo tháng]
[Biểu đồ và khoảng thời gian đang áp dụng]

[Theo thời gian] [Theo phim] [Theo rạp]
[Bảng dữ liệu tương ứng; nhóm phim/rạp có phân trang]

Thời điểm tạo báo cáo ... — Ngày thanh toán theo giờ Việt Nam
```

### 5.2. Bộ lọc

- Mặc định từ ngày đầu tháng hiện tại đến hôm nay theo giờ Việt Nam; chỉ áp dụng mặc định khi URL không có bộ lọc.
- Tách trạng thái đang nhập và bộ lọc đã áp dụng để không gọi API sau mỗi lần sửa ô ngày.
- Nhấn Áp dụng mới cập nhật URL và tải kết quả; chọn nhanh có thể áp dụng ngay.
- Lưu `from`, `to`, `cinemaId`, `movieId`, `timeGroup`, tab, page và size trong query string; refresh và Back/Forward phục hồi đúng.
- Đổi bộ lọc hoặc kiểu nhóm phải đưa trang bảng nhóm về trang đầu.
- Không dùng bộ lọc public để lấy danh mục phim vì sẽ mất phim HIDDEN/ENDED có doanh thu.
- Dùng danh mục ADMIN; xử lý tìm kiếm/phân trang thật, không mặc định lấy 100 bản ghi rồi coi đó là toàn bộ danh mục. Có thể tận dụng tìm kiếm phim hiện có và tải các trang rạp theo nhu cầu.
- Lỗi tải danh mục có thông báo thử lại, không hiển thị như “không có phim/rạp”.

### 5.3. Bảng và biểu đồ

- Theo thời gian: mốc ngày/tháng, doanh thu, giao dịch, vé đã bán.
- Theo phim: tên phim, doanh thu, giao dịch, vé đã bán.
- Theo rạp: tên rạp, doanh thu, giao dịch, vé đã bán.
- Mặc định nhóm phim/rạp sắp xếp doanh thu giảm dần; khi bằng nhau dùng ID tăng dần để phân trang ổn định trên dữ liệu không đổi.
- Hiển thị tổng số nhóm và số trang; không gắn nhãn tổng doanh thu của toàn bộ bộ lọc cho riêng một trang kết quả.
- Biểu đồ đề xuất dùng cột SVG đơn giản cho đợt đầu, có nhãn/trợ giúp và bảng dữ liệu tương đương. Với 366 mốc, dùng vùng cuộn hoặc chuyển sang tháng; không âm thầm cắt mất ngày.
- Nếu cần tương tác biểu đồ phức tạp, đánh giá thư viện tương thích React hiện tại ở giai đoạn sau; không bắt buộc thêm dependency ngay từ đầu.
- Bảng có vùng cuộn trên màn hình nhỏ, tiêu đề/đơn vị rõ và có thể sử dụng bằng bàn phím.

### 5.4. Trạng thái và xử lý lỗi

- Lần đầu tải: skeleton/loading, không hiển thị số 0 như kết quả thật khi chưa có dữ liệu.
- Đang làm mới: có chỉ báo, không cho xuất CSV với bộ lọc chưa áp dụng hoặc trạng thái không rõ.
- Không phát sinh: thông báo “Không có giao dịch thành công trong khoảng đã chọn”; các tổng bằng 0.
- Lỗi kết nối/5xx: có Thử lại, không chuyển thành báo cáo rỗng.
- Bộ lọc sai: hiển thị ngay tại trường; không tự đổi sang khoảng khác mà không thông báo.
- 401: yêu cầu đăng nhập lại theo cơ chế chung; không tiếp tục xuất bằng dữ liệu của phiên trước.
- 403: thông báo không có quyền, không hiển thị dữ liệu báo cáo cũ.

## 6. API đề xuất

### 6.1. Tương thích API cũ

Giữ nguyên:

```http
GET /api/admin/reports/revenue?from=2026-11-01&to=2026-11-30
```

Không đổi tên trường, kiểu tiền, quy tắc bỏ ngày không phát sinh hoặc giới hạn khoảng ngày của endpoint này. Giao diện giai đoạn đầu có thể dùng endpoint cũ; giao diện đầy đủ sẽ chuyển sang endpoint mở rộng.

### 6.2. Dashboard

```http
GET /api/admin/reports/revenue/dashboard
    ?from=2026-11-01&to=2026-11-30
    &cinemaId=1&movieId=10&timeGroup=DAY
```

- `from`, `to` bắt buộc; `cinemaId`, `movieId` tùy chọn.
- `timeGroup`: DAY hoặc MONTH, mặc định DAY.
- Phản hồi gồm bộ lọc đã chuẩn hóa, summary, timeSeries, currency VND, timezone và generatedAt.
- Summary có `totalRevenue`, `successfulPayments`, `ticketsSold`, `averageRevenuePerPayment`.
- Mỗi mốc thời gian có `period` (YYYY-MM-DD hoặc YYYY-MM), doanh thu, số giao dịch và số vé.
- Tiền là chuỗi thập phân trong DTO mới; số lượng là số nguyên.

Ví dụ phần summary, không phải payload đã triển khai:

```json
{
  "totalRevenue": "240000.00",
  "successfulPayments": 1,
  "ticketsSold": 3,
  "averageRevenuePerPayment": "240000.00"
}
```

### 6.3. Thống kê theo nhóm

```http
GET /api/admin/reports/revenue/breakdown
    ?from=2026-11-01&to=2026-11-30
    &groupBy=MOVIE&cinemaId=1
    &page=0&size=20&sort=totalRevenue,desc
```

- Cùng quy tắc from/to/cinemaId/movieId với dashboard.
- `groupBy`: MOVIE hoặc CINEMA, bắt buộc.
- Trả generatedAt, bộ lọc và `PageResponse` cho dữ liệu nhóm; không thay hợp đồng PageResponse dùng chung toàn hệ thống.
- Mỗi dòng: `groupId`, `groupName`, `totalRevenue`, `successfulPayments`, `ticketsSold`.
- page từ 0; size 1–100, mặc định 20.
- Sort whitelist: totalRevenue, successfulPayments, ticketsSold, groupName; asc/desc. Không ghép trực tiếp chuỗi sort của client vào SQL.
- Chỉ trả nhóm có giao dịch thành công; nhóm không phát sinh không cần dòng 0.
- Count query đếm số nhóm, không đếm số thanh toán.

### 6.4. Xuất CSV

```http
GET /api/admin/reports/revenue/export
    ?from=2026-11-01&to=2026-11-30
    &groupBy=DAY&cinemaId=1&movieId=10
```

- groupBy: DAY, MONTH, MOVIE hoặc CINEMA.
- Dùng bộ lọc đã áp dụng và cùng quy tắc tính; không nhận page để tránh xuất thiếu.
- Có thể nhận sort cùng whitelist với bảng tương ứng để giữ thứ tự mong muốn.
- Mỗi tệp được tạo trong một lần đọc nhất quán; không tải từng trang đang thay đổi để ghép CSV.
- UTF-8 có BOM để mở tiếng Việt bằng Excel; Content-Type `text/csv; charset=UTF-8`, Content-Disposition attachment.
- Có dòng cột metadata cố định: từ ngày, đến ngày, cinemaId, movieId, thời điểm tạo, múi giờ, loại nhóm; không trộn metadata tùy ý vào tên cột.
- Cột dữ liệu: kỳ hoặc ID/tên nhóm, doanh thu VND, giao dịch thành công, vé đã bán. Số tiền dùng giá trị thập phân không phân cách hàng nghìn để thuận tiện đối chiếu.
- Escape dấu phẩy, dấu ngoặc kép và xuống dòng; trung hòa CSV formula injection đối với tên phim/rạp bắt đầu bằng `=`, `+`, `-`, `@` hoặc ký tự điều khiển dẫn đầu.
- Giới hạn đề xuất 10.000 dòng dữ liệu; vượt ngưỡng trả 422 với mã mới `REPORT_EXPORT_TOO_LARGE`, yêu cầu thu hẹp khoảng/bộ lọc. Không âm thầm cắt còn 10.000 dòng.
- Với báo cáo rỗng, vẫn có header; nhóm DAY/MONTH có các mốc 0 theo khoảng đã chọn.
- Frontend tải tệp qua Axios có JWT, không gắn token vào URL. Thu hồi object URL sau tải; xử lý được lỗi JSON từ phản hồi blob và kiểm tra phiên chưa đổi trước khi phát hành tệp cho người dùng.

### 6.5. Lỗi và quyền

| Trường hợp | HTTP | Cách xử lý |
|---|---|---|
| Chưa xác thực | 401 | Cơ chế xác thực chung. |
| CUSTOMER/STAFF | 403 | Chặn ở cả controller/service. |
| Ngày sai, thiếu trường, ID không dương, enum/sort sai, vượt 366 ngày | 400 VALIDATION_ERROR | Thông báo có thể hiểu được trên form. |
| ID phim/rạp hợp lệ về định dạng nhưng không tồn tại | 404 RESOURCE_NOT_FOUND | Không trả nhầm báo cáo toàn hệ thống. |
| Hai bộ lọc tồn tại nhưng không có giao dịch khớp | 200 | Tổng bằng 0, nhóm rỗng. |
| CSV vượt ngưỡng | 422 REPORT_EXPORT_TOO_LARGE | Giảm phạm vi xuất. |
| Lỗi đọc dữ liệu | 500 theo error envelope chung | Không trả thành công với số liệu một phần hoặc bịa số 0. |

## 7. Kế hoạch backend và dữ liệu

### 7.1. Thành phần đề xuất

Trong `backend/src/main/java/com/example/cinema/report/`:

```text
controller/
  RevenueController.java                 # Giữ endpoint cũ; thêm endpoint mở rộng
dto/
  RevenueResponse.java                   # Không đổi hợp đồng cũ
  RevenueDashboardResponse.java
  RevenueBreakdownResponse.java
  RevenueReportFilter.java               # Bộ lọc đã xác thực/chuẩn hóa
  RevenueGroupBy.java
  RevenueTimeGroup.java
service/
  RevenueService.java                    # Giữ report cũ
  RevenueAnalyticsService.java           # Dashboard và breakdown
  RevenueCsvExportService.java
repository/
  RevenueRepository.java                 # Giữ dailyTotals cũ
  RevenueAnalyticsRepository.java        # Aggregate và projections mới
```

Tên lớp là đề xuất; có thể điều chỉnh theo style hiện hữu khi thiết kế chi tiết. Không xây module độc lập mới thay thế `report`.

### 7.2. Trình tự thực hiện

1. Viết test định nghĩa tập thanh toán và mẫu đối chiếu nhiều ghế trước khi thêm truy vấn.
2. Xây dựng bước chuẩn hóa bộ lọc dùng chung cho dashboard, breakdown và export; tái dùng tiện ích kiểm tra ID/phân trang hiện có khi phù hợp.
3. Thêm aggregate cho summary/timeSeries, truy vấn nhóm và count nhóm.
4. Chuẩn hóa số tiền, bổ sung các mốc 0, xử lý bình quân khi mẫu số 0 ở service.
5. Thêm DTO/controller mới, method authorization và tài liệu OpenAPI.
6. Thêm CSV dùng chung nguồn truy vấn/định nghĩa lọc, không viết một công thức doanh thu khác cho export.
7. Xác minh tất cả luồng báo cáo chỉ đọc; không khóa cập nhật các dòng booking/ghế hoặc chạy cleanup trong GET.

### 7.3. Hiệu năng và migration

- Không tải toàn bộ entity payments về Java để tính tổng; tổng hợp ở cơ sở dữ liệu, trả projections/DTO.
- Giữ predicate khoảng thời gian trên cột `paid_at`; chỉ đổi múi giờ ở phần nhóm, tránh dùng DATE(paid_at) trong điều kiện lọc làm mất khả năng dùng index.
- Schema hiện có index payments theo booking_id/created_at, chưa có composite index status/paid_at phù hợp trực tiếp với báo cáo.
- Đo EXPLAIN trên dữ liệu thử đại diện; ứng viên cần đánh giá là `payments(status, paid_at, booking_id)`. Không thêm nhiều index chỉ theo phỏng đoán; cân nhắc chi phí ghi của thanh toán.
- Không tạo bảng tổng hợp, không sửa tiền hoặc dữ liệu lịch sử trong đợt này.
- Nếu bổ sung index, tạo migration mới theo số Flyway còn trống tại lúc triển khai. Hiện khảo sát có V1–V7, nhưng không chốt cứng V8 vì các kế hoạch bảo trì khác có thể dùng số này trước.
- Không sửa migration đã áp dụng; cập nhật schema chuẩn và chú thích index liên quan trong entity nếu thêm index.
- Mục tiêu tham khảo: p95 báo cáo dưới 2 giây trên bộ dữ liệu và môi trường thử đã công bố. Đo và ghi lại điều kiện thực tế, không coi đây là cam kết đã đạt.

## 8. Kế hoạch frontend

### 8.1. Cấu trúc đề xuất

```text
frontend/src/features/reports/
  api/reports.api.ts
  types/report.types.ts
  hooks/useRevenueDashboard.ts
  hooks/useRevenueBreakdown.ts
  hooks/useExportRevenue.ts
  components/RevenueFilters.tsx
  components/RevenueSummaryCards.tsx
  components/RevenueTrendChart.tsx
  components/RevenueTable.tsx
  utils/report-filters.ts
  utils/report-format.ts
  index.ts

frontend/src/pages/AdminRevenuePage.tsx
frontend/src/test/admin-revenue.page.test.tsx
frontend/src/test/report-filters.test.ts
frontend/src/test/report-format.test.ts
```

Chỉ tạo utility/component khi thực sự dùng; không sao chép toàn bộ UI chung sang feature mới.

### 8.2. Tích hợp

- Tái sử dụng `httpClient` tại `shared/api/http-client.ts`; API path dùng `/admin/reports/...` vì baseURL đã chứa `/api`.
- Export page qua `pages/index.ts`, nối router và sidebar thật đang được ứng dụng sử dụng.
- Có thể export `reportsApi` qua `src/api/client.ts` theo mẫu feature hiện hữu.
- Dùng QueryClient hiện có. Query key chứa userId, toàn bộ bộ lọc đã chuẩn hóa, kiểu nhóm, page, size và sort; không dùng khóa chung `revenue` cho mọi báo cáo.
- Chỉ enabled khi người dùng hiện tại là ADMIN và bộ lọc hợp lệ; không tải dữ liệu bảo mật khi chưa xác định xong phiên đăng nhập.
- Đề xuất staleTime 30 giây, có nút làm mới chủ động; không polling liên tục trong đợt đầu.
- Khi đổi tài khoản/đăng xuất: hủy yêu cầu đang chờ khi có thể, loại dữ liệu báo cáo khỏi hiển thị, dọn cache feature nếu cần; kiểm tra lại danh tính/role khi xử lý response hoặc tải CSV muộn. Không dựa chỉ vào việc ẩn menu.
- Không dùng placeholderData của bộ lọc cũ để hiển thị như kết quả của bộ lọc mới; nếu giữ dữ liệu khi refetch phải có nhãn rõ và chỉ xuất khi bộ lọc hiện tại đã có kết quả hợp lệ.

### 8.3. Không ảnh hưởng các luồng khác

- Không thêm quyền ADMIN thanh toán thay khách.
- Không thay logic thanh toán để phục vụ bộ đếm; báo cáo chỉ đọc dữ liệu đã commit.
- Không đổi query key hoặc hành vi các trang booking, vé và check-in ngoài phạm vi cần thiết để tích hợp báo cáo.

## 9. Kiểm thử và dữ liệu đối chiếu

### 9.1. Bộ dữ liệu tối thiểu

Chuẩn bị trong DB test riêng, không dùng DB phát triển/production:

- Ít nhất 2 phim và 2 rạp; có tên phim trùng nhau nhưng ID khác nhau.
- Một đơn thành công 3 ghế/240.000 VND; hai đơn khác cùng tiền để phát hiện lỗi SUM DISTINCT.
- Một đơn có nhiều lần FAILED trước khi SUCCESS; INITIATED; đơn PENDING/EXPIRED/CANCELLED chưa thanh toán.
- Một thanh toán SUCCESS 0 VND để kiểm tra số giao dịch/vé không phụ thuộc amount > 0.
- Thanh toán trước biên, đúng đầu ngày và đúng đầu ngày kế tiếp theo múi giờ Việt Nam.
- Ngày/tháng không phát sinh, kỳ cắt ngang hai tháng và qua năm nhuận.
- Phim bị ẩn hoặc kết thúc sau khi bán vé; rạp đổi trạng thái; suất hủy sau thanh toán bằng fixture kiểm thử có chủ đích.
- Tên phim chứa dấu phẩy, dấu ngoặc kép, xuống dòng và ký tự có nguy cơ công thức CSV.

Fixture tài chính nên đi qua luồng thanh toán thật khi có thể. Nếu dùng SQL cho ngày lịch sử/biên giờ, bảo đảm booking_seats, ticket_code, tổng tiền và ràng buộc liên bảng nhất quán; không sao chép nguyên fixture payment-only cũ để kết luận số vé đúng.

### 9.2. Ma trận kiểm thử

| Mã cục bộ | Nội dung | Kết quả mong đợi |
|---|---|---|
| DT-T01 | Tổng doanh thu | Chỉ cộng SUCCESS theo paid_at. |
| DT-T02 | Một đơn nhiều ghế | Tiền không bị nhân; số vé đúng số ghế đã phát hành. |
| DT-T03 | Hai đơn có cùng amount | Cộng đủ hai đơn; không SUM DISTINCT amount. |
| DT-T04 | FAILED/INITIATED và retry | Không cộng lần thất bại, không tăng số giao dịch do replay. |
| DT-T05 | Ngày Việt Nam | Gồm đúng đầu ngày; loại đúng đầu ngày kế tiếp; đúng UTC+7. |
| DT-T06 | Theo tháng và mốc 0 | Đúng nhóm tháng, không mất mốc 0, không tính phần ngoài kỳ. |
| DT-T07 | Khoảng rỗng và SUCCESS 0 VND | Không chia 0; giao dịch 0 VND vẫn có số giao dịch/vé. |
| DT-T08 | Lọc phim/rạp và kết hợp | Summary, series, breakdown cùng quần thể. |
| DT-T09 | Phim HIDDEN/ENDED, rạp INACTIVE, suất CANCELLED | Không làm biến mất doanh thu SUCCESS lịch sử. |
| DT-T10 | Giá vé hiện tại thay đổi | Không tính lại doanh thu bằng giá hiện hành. |
| DT-T11 | Tên trùng | Gom theo ID; không nhập hai phim/rạp có tên giống nhau. |
| DT-T12 | Phân trang và sort | Count nhóm đúng, tie-break ổn định; sort sai bị từ chối. |
| DT-T13 | Tính đối chiếu | Tổng toàn bộ nhóm phim = nhóm rạp = series = summary trên cùng snapshot/dữ liệu đứng yên. |
| DT-T14 | Validate | Từ chối ngày không tồn tại, from > to, quá 366 ngày, ID/enum/page/size/sort sai. |
| DT-T15 | Quyền | Guest 401; CUSTOMER/STAFF 403; ADMIN thành công trên mọi endpoint, kể cả CSV. |
| DT-T16 | Snapshot dashboard | Có thanh toán mới khi đang đọc không làm summary và series trong một response lệch nhau. |
| DT-T17 | CSV đầy đủ | Có mọi dòng của bộ lọc, không chỉ trang đang xem; số liệu và bộ lọc đúng. |
| DT-T18 | CSV an toàn | Tiếng Việt đúng, escape đúng, không thực thi công thức từ tên phim/rạp; giới hạn không cắt âm thầm. |
| DT-T19 | URL và lọc | Refresh/Back khôi phục; đổi filter reset page; Áp dụng không dùng filter chưa xác nhận. |
| DT-T20 | Trạng thái UI | Loading/rỗng/lỗi tách biệt; retry hoạt động; báo cáo mô phỏng được ghi rõ. |
| DT-T21 | Phiên đăng nhập | Response/CSV phiên cũ không xuất hiện sau logout hoặc đổi tài khoản. |
| DT-T22 | Số tiền lớn | Không mất chữ số hoặc tự tính sai do Number; DTO mới dùng chuỗi, DTO cũ giữ nguyên. |
| DT-T23 | Hồi quy API cũ | Response/semantics cũ không đổi, kể cả dailyRevenue rỗng khi không phát sinh. |
| DT-T24 | Hiệu năng | Có EXPLAIN và số đo p95 trên quy mô thử được ghi lại. |

### 9.3. Tệp kiểm thử đề xuất

Backend:

- `report/service/RevenueAnalyticsServiceTest.java` — validation, quy tắc tính và bổ sung mốc 0.
- `report/service/RevenueCsvExportServiceTest.java` — encoding, escape, công thức, ngưỡng xuất.
- `report/controller/RevenueReportControllerTest.java` — quyền, binding tham số, hợp đồng JSON/CSV.
- `report/RevenueReportIntegrationTest.java` — MySQL thực, aggregation, snapshot, lọc, group, đối chiếu.
- Giữ và chạy hồi quy `payment/PaymentIntegrationTest.java`, `payment/controller/PaymentTicketControllerTest.java`.

Frontend dùng `frontend/src/test/` theo các tệp đã liệt kê ở mục 8, bổ sung test sidebar/router và test API blob nếu tách riêng.

### 9.4. Lệnh dự kiến sau khi triển khai

Tại thư mục `backend`:

```powershell
.\mvnw.cmd "-Dtest=RevenueAnalyticsServiceTest,RevenueCsvExportServiceTest,RevenueReportControllerTest,RevenueReportIntegrationTest,PaymentIntegrationTest,PaymentTicketControllerTest" test
.\mvnw.cmd verify
```

Integration dùng MySQL Testcontainers hoặc biến `CINEMA_IT_JDBC_URL` tới **schema test riêng** theo mẫu hiện có; nếu toàn bộ smoke test cần `DB_NAME`, cũng phải trỏ DB test riêng. Không dùng dữ liệu production/dev vì fixture có thể commit.

Tại thư mục `frontend`:

```powershell
npm test -- admin-revenue report-filters report-format
npm test
npm run build
npm run lint
```

Tên class/test là kế hoạch; điều chỉnh lệnh theo các tệp thực tế sau khi tạo. Integration bị skip vì thiếu DB/Docker không được báo là đã pass MySQL.

## 10. Thứ tự triển khai, đầu ra và ước lượng

| Giai đoạn | Công việc | Đầu ra/điều kiện chuyển bước | Ước lượng ngày công |
|---|---|---|---|
| 1. Chốt đặc tả | Chốt chỉ số, ngày thanh toán, bộ lọc, 366 ngày, CSV, tương thích API | Đặc tả được duyệt và dữ liệu đối chiếu | 0,5–1 |
| 2. Lát chức năng đầu tiên | Route/menu, lọc ngày, tổng doanh thu và giao dịch, bảng ngày từ API cũ | ADMIN xem được báo cáo cơ bản; quyền và trạng thái đúng | 1–1,5 |
| 3. API mở rộng | Aggregate không trùng, dashboard, breakdown, validation, test backend | Hợp đồng mới và đối chiếu số liệu trên MySQL | 2–3 |
| 4. UI thống kê | Kết nối API mới, bộ lọc phim/rạp, số vé/bình quân, biểu đồ, bảng nhóm | Hoàn chỉnh DT-01 đến DT-06 | 1,5–2 |
| 5. CSV và bảo vệ phiên | Export, lỗi blob, an toàn CSV, giới hạn, cache/phiên | DT-07 đến DT-09 và test liên quan | 1–1,5 |
| 6. Hiệu năng, hồi quy và tài liệu | EXPLAIN/index nếu cần, toàn bộ test, demo và minh chứng | Checklist nghiệm thu, hướng dẫn sử dụng, kết quả thực chạy | 2–3 |

**Tổng tham khảo:** khoảng 8–12 ngày công. Đây là công sức, không phải ngày lịch cố định; chi phí tiền chưa xác định do chưa có đơn giá và phân công nhân sự.

Phụ thuộc: giai đoạn 4 cần hợp đồng API giai đoạn 3; giao diện có thể dùng mock contract trong lúc backend thực hiện nhưng nghiệm thu phải dùng API thật.

## 11. Phân tích tác động và rủi ro

| Rủi ro | Hướng kiểm soát |
|---|---|
| Nhân doanh thu khi JOIN nhiều ghế | Payment-grain aggregate; test đơn nhiều ghế và cùng amount. |
| Sai ngày do UTC/Vietnam | Chuẩn hóa khoảng nửa mở ở service, test biên ±1 ms. |
| Đánh đồng ngày chiếu và ngày thanh toán | Ghi rõ nhãn bộ lọc và đơn vị; chưa đưa occupancy/check-in vào màn hình này. |
| Ẩn phim làm báo cáo mất số liệu | Không dùng public filters; test HIDDEN/ENDED và danh mục ADMIN. |
| API cũ bị phá vỡ | Endpoint/DTO mới; giữ test hợp đồng cũ. |
| Quá tải khi báo cáo khoảng dài | Giới hạn 366 ngày ở API mới, aggregate SQL, phân trang nhóm, đo index. |
| Rò rỉ khi đổi phiên | Query key theo user, chặn render/CSV response cũ, kiểm thử phân quyền server. |
| CSV thiếu dòng hoặc khác số liệu | Export độc lập không phân trang; dùng cùng định nghĩa lọc, một snapshot cho tệp. |
| Tiền lớn mất chính xác | BigDecimal backend, chuỗi decimal API mới, không ép Number tùy tiện. |
| Gọi báo cáo nhiều endpoint khi đang có giao dịch | Hiển thị generatedAt; snapshot trong từng response; đối chiếu tuyệt đối trên dữ liệu đứng yên. |
| Xung đột số Flyway với bảo trì khác | Chọn số migration thực tế lúc tích hợp; không sửa script đã áp dụng. |
| Vượt phạm vi sang kế toán | Ghi rõ báo cáo thanh toán mô phỏng; chưa lợi nhuận, thuế hay hoàn tiền. |

## 12. Tài liệu cần cập nhật và quản lý phát hành

### 12.1. Bộ hồ sơ bảo trì

Theo quy trình tại `maintenance_docs/quy-trinh-tai-lieu.md`:

1. Kế hoạch bảo trì: phạm vi HT-DT-01, nguồn lực, ước lượng và mốc triển khai.
2. Phân tích tác động: hiện trạng, hai phương án, rủi ro và quyết định chọn phương án.
3. Đặc tả thay đổi: DT-01 đến DT-09 và công thức chỉ số.
4. Thiết kế bảo trì: UI, luồng dữ liệu, API/DTO và truy vấn tổng hợp.
5. Kiểm thử: DT-T01 đến DT-T24, dữ liệu mẫu, kết quả và minh chứng sau khi chạy.

### 12.2. Tài liệu dự án

- Mở rộng FR-13, UC-09, BR-22 và các trường hợp kiểm thử liên quan trong bộ đặc tả.
- Cập nhật hợp đồng API và kiến trúc module report; không ghi endpoint đề xuất là đã triển khai trước khi hoàn thành.
- Cập nhật tài liệu DB/schema chuẩn nếu thật sự thêm index.
- Cập nhật README backend/frontend về route, bộ lọc, ngày Việt Nam, doanh thu mô phỏng và cách xuất CSV.
- Đánh dấu yêu cầu thêm/sửa, dùng một mã thay đổi xuyên suốt hồ sơ và PR/commit.

### 12.3. Phát hành và phương án quay lui

- Trước tích hợp: lưu baseline, kiểm tra thay đổi đang có, không ghi đè công việc khác.
- Nếu có migration index: kiểm tra trên DB test, lưu kế hoạch sao lưu và đánh giá thời gian tạo index trước môi trường thật.
- Triển khai backend mới tương thích trước, sau đó frontend; API cũ vẫn hoạt động trong thời gian chuyển tiếp.
- Nếu phát sinh lỗi UI/báo cáo mới: quay về phiên bản giao diện trước và ngừng dùng endpoint mở rộng; không sửa/xóa giao dịch để làm số liệu “khớp”.
- Index bổ sung có thể giữ nguyên khi quay lui code; nếu cần gỡ phải có migration mới được review, không sửa lịch sử Flyway hoặc chạy reset dữ liệu.
- Thu thập ảnh giao diện trước/sau, mẫu CSV, kết quả SQL đối chiếu và báo cáo test thật. Không tự tạo minh chứng hoặc đánh dấu đạt khi chưa chạy.

## 13. Checklist nghiệm thu

- [ ] ADMIN có mục Doanh thu & thống kê và truy cập được route mới.
- [ ] Guest/CUSTOMER/STAFF không xem hoặc xuất được báo cáo.
- [ ] Bộ lọc ngày Việt Nam, phim/rạp, chọn nhanh và URL hoạt động đúng.
- [ ] Tổng doanh thu và giao dịch khớp SUCCESS theo paid_at; tiền không bị nhân theo ghế.
- [ ] Số vé và doanh thu bình quân đúng định nghĩa, kể cả kỳ rỗng và thanh toán 0 VND.
- [ ] Biểu đồ/bảng ngày-tháng có đủ mốc 0 và không tính ngoài khoảng.
- [ ] Nhóm phim/rạp đúng ID, phân trang/sort/count đúng; không loại dữ liệu lịch sử vì trạng thái hiện tại.
- [ ] CSV đầy đủ theo bộ lọc, an toàn, tiếng Việt đúng và không âm thầm cắt dữ liệu.
- [ ] Không lộ báo cáo hoặc tệp phản hồi của phiên cũ sau logout/đổi tài khoản.
- [ ] API cũ và các luồng booking/payment/ticket vẫn đạt hồi quy.
- [ ] Có kiểm thử MySQL thực, số đo hiệu năng và điều kiện đo được ghi rõ.
- [ ] Tài liệu, hợp đồng API và migration/index nếu có được cập nhật đồng bộ.
- [ ] Chỉ đánh dấu hoàn thành các mục đã được triển khai, kiểm thử và xác nhận thực tế.

## 14. Các quyết định đề xuất cần duyệt trước khi lập trình

1. Phạm vi chọn phương án B, triển khai theo từng lát, ưu tiên có màn hình cơ bản sớm.
2. Doanh thu tính theo ngày thanh toán Việt Nam; không tính lại theo ngày chiếu.
3. Đợt đầu có tổng quan, ngày/tháng, phim/rạp, vé bán, bình quân/giao dịch và CSV.
4. Giữ API cũ; API mới giới hạn 366 ngày, số tiền dạng chuỗi decimal.
5. Chưa hoàn tiền, lợi nhuận, occupancy, check-in, dự báo hoặc so sánh kỳ trước.
6. CSV xuất đầy đủ theo bộ lọc, giới hạn đề xuất 10.000 dòng; không thêm PDF/Excel lúc này.
7. Không có scheduler hoặc bảng tổng hợp mới cho báo cáo; index chỉ thêm sau khi đo và chọn số migration phù hợp.

**Tài liệu này là kế hoạch thực hiện, không phải xác nhận chức năng đã được bổ sung vào hệ thống.**
