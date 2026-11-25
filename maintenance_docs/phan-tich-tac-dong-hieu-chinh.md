# PHÂN TÍCH SỰ TÁC ĐỘNG CỦA CÁC YÊU CẦU THAY ĐỔI
## Hệ thống đặt vé xem phim Cinema – bảo trì hiệu chỉnh HC-01, HC-02, HC-03

**Học phần:** Bảo trì phần mềm – CT244  
**Dự án:** Cinema – hệ thống đặt vé xem phim  
**Phiên bản tài liệu:** 0.2 – bản dự thảo đã chốt quyết định kỹ thuật  
**Ngày lập:** 25/11/2026  
**Người lập:** Nhóm thực hiện Project 2  
**Trạng thái:** **Dự thảo 0.2 – đã chốt D-01…D-07 và phạm vi HC-03; phiếu phê duyệt CR chưa ký.**

> Tài liệu này lập hồ sơ phân tích tác động cho ba yêu cầu bảo trì hiệu chỉnh. Tài liệu không phải biên bản phê duyệt và không ghi nhận kết quả kiểm thử chưa chạy. Khi có mâu thuẫn, mã nguồn tại commit đang kiểm tra và kết quả lệnh thực tế là nguồn có thẩm quyền.

### Bảng theo dõi phiên bản

| Phiên bản | Ngày | Người cập nhật | Nội dung | Trạng thái |
|---|---|---|---|---|
| 0.1 | 25/11/2026 | Nhóm thực hiện | Khung hồ sơ, phân tích HC-01/02/03, so sánh phương án, ước lượng | Nháp |
| 0.2 | 25/11/2026 | Nhóm thực hiện | Chốt D-01…D-07; xác nhận HC-03 thuộc phạm vi; cập nhật trạng thái và câu hỏi mở | **Dự thảo đã chốt quyết định kỹ thuật** |
| 1.0 | | | Sau khi ban quản lý thay đổi ký phê duyệt CR | Chưa thực hiện |

---

## 1. Giới thiệu

### 1.1. Mục đích

Tài liệu xác định phạm vi, thành phần bị ảnh hưởng, phương án khắc phục, ước lượng nguồn lực và rủi ro cho ba yêu cầu bảo trì hiệu chỉnh:

- **HC-01:** chặn tạo/sửa suất chiếu diễn ra trước ngày khởi chiếu của phim.
- **HC-02:** bảo toàn thông tin và hành trình theo dõi đơn/lịch/vé khi phim bị ẩn; cảnh báo quản trị viên trước khi ẩn.
- **HC-03:** chặn tạo/sửa suất chiếu trong quá khứ hoặc sát giờ chiếu.

Kết quả dùng để:

1. Ban quản lý thay đổi quyết định chấp nhận, từ chối hoặc yêu cầu đánh giá thêm.
2. Cập nhật kế hoạch bảo trì, đặc tả yêu cầu (SRS), thiết kế (SDD) và tài liệu kiểm thử.
3. Bảo đảm thay đổi không phá vỡ API, phân quyền, quy tắc giữ ghế/thanh toán/check-in và dữ liệu giao dịch hiện có.

### 1.2. Nhóm người đọc

- Ban quản lý thay đổi và trưởng nhóm.
- Thành viên backend, frontend, kiểm thử và tài liệu.
- Người rà soát độc lập.
- Giảng viên/người đánh giá cần đối chiếu hồ sơ với mã nguồn và kết quả thực tế.

### 1.3. Phạm vi và phương pháp

**Trong phạm vi:**

- Ba yêu cầu HC-01, HC-02, HC-03.
- Phân tích mã nguồn as-built tại commit `3f61df0` (trước ổn định) và `79c7178` (baseline đã ổn định).
- Đối chiếu với tài liệu thiết kế gốc `thiet_ke_he_thong_dat_ve_xem_phim.docx` (phiên bản 1.0 – 03/11/2026).
- So sánh ít nhất hai phương án cho mỗi yêu cầu.
- Ước lượng nhân lực, công cụ, thời gian, chi phí và rủi ro.

**Ngoài phạm vi:**

- Hủy suất chiếu, hoàn tiền, đổi vé và xử lý tranh chấp thanh toán.
- Thay đổi quy tắc giữ ghế 5 phút, cutoff đặt vé 10 phút, check-in hoặc xác thực.
- Mở lại bán vé cho phim `HIDDEN`.
- Tự động xóa/dời dữ liệu lịch sử.
- Các yêu cầu bảo trì thích ứng, hoàn thiện, dự phòng.

**Phương pháp:**

- Đọc mã nguồn, đối chiếu tài liệu thiết kế và đề xuất gốc.
- Phân tích đường ảnh hưởng trực tiếp/gián tiếp.
- So sánh phương án theo cùng bộ tiêu chí.
- Ước lượng theo người-ngày; không tự đặt đơn giá tiền tệ khi nhóm chưa chốt.
- Chưa tái hiện trực tiếp trên giao diện trong bước lập hồ sơ; mọi kết quả kiểm thử sẽ được ghi sau khi chạy thực tế.

### 1.4. Thuật ngữ

| Thuật ngữ | Giải thích |
|---|---|
| CR | Yêu cầu thay đổi; trong tài liệu là HC-01/02/03 |
| HC | Bảo trì hiệu chỉnh |
| As-built | Mã nguồn và hành vi thực tế đang chạy, khác với tài liệu thiết kế đề xuất |
| `releaseDate` | Ngày khởi chiếu của phim trong bảng `movies` |
| `HIDDEN` | Trạng thái phim bị ẩn khỏi kênh công khai, không đồng nghĩa hủy suất/vé |
| `SCHEDULED` | Suất chiếu đang hoạt động |
| `CONFIRMED` | Booking đã xác nhận, vé đã phát hành |
| `PENDING` | Booking đang giữ ghế, chưa xác nhận |
| Cutoff 10 phút | Quy tắc không đặt vé muộn hơn 10 phút trước giờ chiếu |
| DTO | Đối tượng truyền dữ liệu giữa backend và frontend |
| N+1 | Lỗi hiệu năng do truy vấn danh sách kéo theo nhiều truy vấn con |
| RTM | Ma trận truy vết yêu cầu – thiết kế – kiểm thử |

### 1.5. Tài liệu tham khảo

| Tài liệu | Phiên bản/ngày | Vị trí |
|---|---|---|
| Kế hoạch bảo trì hiệu chỉnh | 1.0 – 25/11/2026 | `maintenance_docs/ke-hoach-bao-tri-hieu-chinh.md` |
| Đề xuất bảo trì hiệu chỉnh | Không ghi phiên bản | `maintenance_docs/De-xuat-bao-tri-hieu-chinh.md` |
| Tài liệu thiết kế hệ thống đặt vé xem phim | 1.0 – 03/11/2026 | Tệp `.docx` gốc; bản trích xuất tại `maintenance_docs/nguon/thiet-ke-he-thong-dat-ve-xem-phim.md` |
| Hướng dẫn xây dựng tài liệu Project 2 | Không ghi phiên bản | `maintenance_docs/ke-hoach-viet-tai-lieu-bao-tri.md` |
| Quy trình viết tài liệu | Không ghi phiên bản | `maintenance_docs/quy-trinh-tai-lieu.md` |
| Mã nguồn Cinema | Commit `3f61df0` (trước ổn định) và `79c7178` (baseline) – 25/11/2026 | Nhánh `main` |

### 1.6. Quy ước trạng thái

- `Not Run`: chưa chạy.
- `Blocked`: không thể chạy do môi trường/điều kiện.
- `Pass`/`Fail`: chỉ dùng sau khi chạy thực tế.
- `Draft`: hồ sơ đang soạn, chưa phê duyệt.
- `Approved`: chỉ dùng khi có quyết định thật của ban quản lý thay đổi.

### 1.7. Quyết định đã chốt ngày 25/11/2026

| Mã | Quyết định |
|---|---|
| D-01 | Phim chưa có `releaseDate` **không** được lập lịch; yêu cầu bổ sung ngày khởi chiếu trước |
| D-02 | Thời gian dẫn tối thiểu của HC-03 là **10 phút**, đồng bộ cutoff đặt vé |
| D-03 | **HC-03 thuộc phạm vi** bảo trì hiệu chỉnh |
| D-04 | Đổi `releaseDate` khi có suất vi phạm: **chặn** cập nhật; không tự dời/xóa suất |
| D-05 | Cảnh báo ẩn phim: **bắt buộc xác nhận** khi có cam kết hiệu lực |
| D-06 | **Bổ sung** `movieStatus`/`showtimeStatus` vào DTO booking; chỉ trả cho chủ đơn/ADMIN |
| D-07 | Index cho `hide-impact`: **chỉ thêm nếu đo thấy chậm**; migration riêng |

Các quyết định này là căn cứ để cập nhật SRS/SDD. Phiếu phê duyệt CR (Mẫu 2.4) vẫn cần chữ ký chính thức; tài liệu chưa được đánh dấu `Approved`.

---

## 2. Tổng quan các yêu cầu

| Mã | Tên yêu cầu | Loại | Ưu tiên | Khoảng trống chính | Trạng thái hồ sơ |
|---|---|---|---|---|---|
| HC-01 | Chặn suất chiếu trước ngày khởi chiếu | Hiệu chỉnh | Cao | Quy tắc nghiệp vụ và kiểm tra server còn thiếu | Draft – đã chốt D-01/D-04 |
| HC-02 | Bảo toàn thông tin đơn/lịch/vé khi ẩn phim | Hiệu chỉnh | Trung bình | DTO thiếu thông tin; thông báo/điều hướng chưa đủ; admin chưa được cảnh báo | Draft – đã chốt D-05/D-06/D-07 |
| HC-03 | Chặn suất chiếu trong quá khứ/sát giờ | Hiệu chỉnh | Trung bình | Chưa so sánh với thời gian hiện tại; UI không giới hạn | Draft – đã chốt D-02/D-03 |

**Ghi chú về mức độ xác minh:** các kết luận dưới đây dựa trên đọc mã nguồn và tài liệu. Chưa chạy tái hiện trực tiếp cho từng HC. Khi thực hiện P1 của kế hoạch, cần ghi bước tái hiện, ảnh/log và đánh dấu kết quả thực tế.

---

## 3. HC-01 – Chặn suất chiếu trước ngày khởi chiếu

### 3.1. Phiếu đề xuất yêu cầu thay đổi (Mẫu 2.1)

| Trường | Nội dung |
|---|---|
| Dự án | Cinema – hệ thống đặt vé xem phim |
| Người đề xuất | Nhóm bảo trì – đại diện backend/frontend |
| Ngày đề xuất | 25/11/2026 |
| Liên hệ | Kênh nhóm và GitHub issue/PR của dự án |
| Mã đề xuất tạm | HC-01 |
| Tên yêu cầu | Chặn tạo/sửa suất chiếu diễn ra trước ngày khởi chiếu của phim |
| Hiện trạng | Hệ thống cho phép lưu suất chiếu có ngày bắt đầu trước `movies.release_date` nếu các điều kiện phòng, thời lượng và giá hợp lệ |
| Trạng thái mong muốn | Máy chủ từ chối mọi suất chiếu bắt đầu trước ngày khởi chiếu; giao diện hiển thị ngày khởi chiếu và chặn sớm; phim `UPCOMING` vẫn được lập lịch từ ngày khởi chiếu trở đi |
| Bối cảnh, ràng buộc | Không đổi đường dẫn API; không tự hủy/dời suất hoặc booking; so sánh ngày theo `Asia/Ho_Chi_Minh`; không tin dữ liệu ngày do client gửi |
| Lợi ích dự kiến | Ngăn bán vé cho suất chiếu không thể diễn ra; bảo vệ lịch chiếu và dữ liệu vận hành; giảm xử lý sự cố tại rạp |
| Minh chứng hiện trạng | `ShowtimeService.validateSchedule()` không kiểm tra `releaseDate`; `movieForSchedule()` chỉ chặn `HIDDEN`; `AdminShowtimeFormPage` chỉ lọc `HIDDEN`; `DateTimePicker` không có giới hạn ngày |
| Mức độ xác minh | Đọc mã nguồn; **chưa tái hiện trực tiếp** trên giao diện |
| Đính kèm | Kế hoạch bảo trì mục 7.1; đề xuất gốc mục 3; trích xuất thiết kế mục 7.3.2 và UC-02 |
| Chữ ký người đề xuất | Nhóm bảo trì (dự thảo, chưa ký) |

### 3.2. Phiếu tiếp nhận yêu cầu thay đổi (Mẫu 2.2)

| Trường | Nội dung |
|---|---|
| Mã yêu cầu chính thức | HC-01 |
| Người tiếp nhận | Ban quản lý thay đổi – đầu mối tài liệu |
| Ngày tiếp nhận | 25/11/2026 |
| Đặc tả/thiết kế gốc liên quan | UC-02 – Tạo/sửa lịch chiếu; BR-01, BR-02, BR-20; bảng `movies.release_date`; bảng `showtimes` |
| Phân loại | **Bảo trì hiệu chỉnh** |
| Lý do phân loại | Hành vi hiện tại trái với kỳ vọng nghiệp vụ cốt lõi: không thể chiếu phim trước ngày khởi chiếu. Không phải thích ứng môi trường hay hoàn thiện tính năng mới |
| Ưu tiên sơ bộ | **Cao** – ảnh hưởng trực tiếp lịch chiếu, bán vé và vận hành; tần suất phụ thuộc thao tác admin |
| Trùng lặp/phụ thuộc | Phụ thuộc HC-03 (cùng `validateSchedule`); cùng chạm `MovieService.update()` với HC-02; phụ thuộc D-01 và D-04 |
| Người phân tích | Backend + frontend + tài liệu |
| Trạng thái | Đã tiếp nhận; quyết định kỹ thuật đã chốt; chờ ký phê duyệt |

### 3.3. Bảng phân tích sự tác động (Mẫu 2.3)

#### 3.3.1. Hiện trạng và căn cứ

**Luồng hiện tại:**

1. Admin mở form tạo/sửa suất chiếu.
2. Form tải danh sách phim qua API admin, loại bỏ phim `HIDDEN`, nhưng không hiển thị/không kiểm tra `releaseDate`.
3. Admin chọn phim, phòng, giờ bắt đầu, giá và gửi form.
4. Backend gọi `ShowtimeService.create()` hoặc `update()`.
5. Cả hai gọi `validateSchedule(request, movie)`.
6. `validateSchedule()` chỉ kiểm tra:
   - `startsAt`/`endsAt` nằm trong khoảng `MIN_TIME`–`MAX_TIME`;
   - `endsAt > startsAt`;
   - `endsAt` đủ thời lượng phim;
   - thời gian dọn phòng không vượt `MAX_TIME`;
   - tổng giá không vượt giới hạn;
   - phần giây tối đa 3 chữ số.
7. Không có bước so sánh `startsAt` với `movie.releaseDate`.
8. `MovieService.update()` gán `releaseDate` mới mà không kiểm tra các suất `SCHEDULED` đã lập.

**Kết luận:** đây là lỗ hổng kiểm tra nghiệp vụ ở server, không chỉ là thiếu hướng dẫn giao diện. Sửa riêng giao diện không đủ vì có thể gọi thẳng API.

**Mức độ xác minh:** đọc mã nguồn; chưa chạy tái hiện. Khi tái hiện, dùng phim `UPCOMING` có `releaseDate` trong tương lai và tạo suất trước ngày đó; ghi lại HTTP status và dữ liệu sau lưu.

#### 3.3.2. Thành phần bị ảnh hưởng

| Thành phần | Loại ảnh hưởng | Nội dung | Mức |
|---|---|---|---|
| `ShowtimeService.validateSchedule()` | Trực tiếp | Bổ sung kiểm tra ngày khởi chiếu cho create/update | Cao |
| `ShowtimeService.movieForSchedule()` | Trực tiếp | Giữ chặn `HIDDEN`; bổ sung tiền điều kiện `releaseDate` nếu cần | Trung bình |
| `ShowtimeRepository` | Trực tiếp | Thêm truy vấn đếm/tìm suất `SCHEDULED` chưa kết thúc khi đổi `releaseDate` | Trung bình |
| `MovieService.update()` | Trực tiếp | Chặn đổi `releaseDate` làm suất hiện có vi phạm | Cao |
| `AdminShowtimeFormPage` | Trực tiếp | Hiển thị ngày khởi chiếu; kiểm tra trước khi gửi; thông báo lỗi | Cao |
| `DateTimePicker` | Trực tiếp | Thêm giới hạn ngày/giờ tối thiểu | Trung bình |
| `AdminMovieForm` | Trực tiếp | Hiển thị cảnh báo/không cho đổi ngày khởi chiếu nếu có suất vi phạm | Trung bình |
| API `POST/PUT /api/admin/showtimes` | Gián tiếp | Không đổi đường dẫn; thêm trường hợp lỗi `SCHEDULE_INVALID` | Thấp |
| API `PUT /api/admin/movies/{id}` | Gián tiếp | Có thể trả `RESOURCE_STATE_CONFLICT` khi đổi ngày khởi chiếu | Thấp |
| DTO `ShowtimeRequest`, `MovieRequest` | Không đổi | Đã có `startsAt` và `releaseDate`; không cần thêm trường | Thấp |
| CSDL | Không đổi | Không cần bảng/cột mới | Thấp |
| Kiểm thử backend | Trực tiếp | `ShowtimeServiceTest`, `MovieServiceTest`, integration API | Cao |
| Kiểm thử frontend | Trực tiếp | Form suất chiếu, `DateTimePicker`, form phim | Trung bình |
| Tài liệu | Trực tiếp | SRS, SDD, test case, RTM, hướng dẫn admin | Trung bình |
| Booking/vé hiện có | Gián tiếp | Không được tự hủy/sửa; chỉ chặn thao tác mới | Cao |

#### 3.3.3. Phương án

**PA1 – Chỉ giới hạn ở giao diện**

- Thêm `minDate` cho `DateTimePicker` theo `releaseDate` của phim.
- Kiểm tra trong `AdminShowtimeFormPage` trước khi gửi.
- Không sửa backend.

**PA2 – Chỉ kiểm tra ở máy chủ**

- Bổ sung kiểm tra `releaseDate` trong `validateSchedule()`.
- Không thay đổi giao diện.
- Admin nhận thông báo lỗi chung từ API.

**PA3 – Kiểm tra máy chủ + hướng dẫn giao diện + bảo vệ khi đổi ngày khởi chiếu**

- Backend kiểm tra `releaseDate` cho create/update.
- Frontend hiển thị ngày khởi chiếu, giới hạn chọn ngày và kiểm tra lại khi đổi phim/ngày.
- `MovieService.update()` chặn đổi `releaseDate` nếu có suất `SCHEDULED` chưa kết thúc bắt đầu trước ngày mới.
- Không tự dời/xóa suất.

**PA4 – Tự động dời hoặc xóa suất không hợp lệ khi đổi ngày khởi chiếu**

- Khi phát hiện suất vi phạm, tự động dời sang ngày khởi chiếu hoặc hủy.
- Không khuyến nghị: thay đổi dữ liệu ngoài ý muốn, ảnh hưởng booking/vé, trái BR-19/BR-20.

#### 3.3.4. So sánh phương án

| Tiêu chí | PA1 – Chỉ UI | PA2 – Chỉ server | PA3 – Server + UI + bảo vệ | PA4 – Tự dời/xóa |
|---|---|---|---|---|
| Cách thực hiện | Giới hạn ngày trên form | Kiểm tra trong service | Kết hợp PA2 + UI + kiểm tra `MovieService.update` | Tự động sửa dữ liệu |
| Phạm vi | Frontend | Backend | Backend + frontend + repository + tài liệu | Backend + dữ liệu |
| Nhân lực/kỹ năng | 1 FE | 1 BE | 1 BE + 1 FE + tester | 1 BE + DBA/người vận hành |
| Công cụ/môi trường | React, Vitest | Java, JUnit, Mockito | Như PA2 + Vitest/RTL + MySQL/Testcontainers | Như PA3 + backup/rollback |
| Thời gian dự kiến | 0,5 người-ngày | 1,0 người-ngày | 2,5 người-ngày | 3,5+ người-ngày |
| Chi phí trực tiếp | 0 đồng | 0 đồng | 0 đồng | 0 đồng + rủi ro dữ liệu |
| Chống bỏ qua API | **Không** | **Có** | **Có** | Có |
| Lập lịch trước cho phim `UPCOMING` | Có | Có | Có | Có nhưng dữ liệu bị đổi |
| Tác động booking/vé | Không | Không | Không tự hủy/sửa | **Có thể phá cam kết** |
| Khả năng kiểm thử | Thấp (chỉ UI) | Trung bình | Cao | Thấp do nhiều nhánh dữ liệu |
| Rủi ro | Bỏ qua bằng API; cảm giác an toàn giả | UX kém; admin khó hiểu lỗi | Trung bình, có kiểm soát | Cao: mất dữ liệu, sai lịch sử |
| Kết luận | **Loại** | **Dự phòng** | **Chọn** | **Loại** |

#### 3.3.5. Phương án đề xuất: PA3

**a. Backend – kiểm tra khi tạo/sửa suất**

Trong `validateSchedule(request, movie)`, sau các kiểm tra hiện có:

```java
LocalDate showDate = request.startsAt().atZone(VIETNAM).toLocalDate();
LocalDate releaseDate = movie.getReleaseDate();
if (releaseDate == null) {
    throw new AppException(ErrorCode.SCHEDULE_INVALID,
            "Phim chưa có ngày khởi chiếu. Vui lòng cập nhật ngày khởi chiếu trước khi lập lịch.");
}
if (showDate.isBefore(releaseDate)) {
    throw new AppException(ErrorCode.SCHEDULE_INVALID,
            "Suất chiếu không được bắt đầu trước ngày khởi chiếu " + releaseDate + ".");
}
```

- Dùng `movie` đọc từ `MovieRepository` tại server; không nhận `releaseDate` từ request.
- Áp dụng cho cả `create()` và `update()` vì cả hai dùng chung `validateSchedule()`.
- Giữ nguyên kiểm tra `HIDDEN`, phòng, ghế, trùng lịch, thời lượng và bảo vệ suất đã có booking.
- Dùng `ErrorCode.SCHEDULE_INVALID` (HTTP 422) để hạn chế thay đổi hợp đồng API. Nếu nhóm muốn thông báo riêng, có thể bổ sung mã mới sau khi phê duyệt; mặc định không thêm.

**b. Backend – bảo vệ khi đổi ngày khởi chiếu**

Trong `MovieService.update()`:

1. So sánh `request.releaseDate()` với `movie.getReleaseDate()`.
2. Nếu ngày mới muộn hơn và có suất `SCHEDULED` chưa kết thúc (`endsAt > databaseTime.now()`) bắt đầu trước ngày mới:
   - không lưu thay đổi;
   - trả `RESOURCE_STATE_CONFLICT` kèm số lượng và thời gian sớm nhất cần xử lý;
   - không tự dời/xóa suất.
3. Nếu ngày mới sớm hơn hoặc bằng: cho phép, vì không làm suất hiện có vi phạm.
4. Nếu `releaseDate` bị đặt về `null`: áp dụng D-01; đề xuất từ chối khi còn suất chưa kết thúc để tránh mất mốc kiểm soát.

Repository đề xuất:

```java
@Query("select count(s) from Showtime s where s.movie.id = :movieId " +
       "and s.status = 'SCHEDULED' and s.startsAt < :newReleaseStart and s.endsAt > :now")
long countActiveBeforeRelease(@Param("movieId") Long movieId,
                              @Param("newReleaseStart") Instant newReleaseStart,
                              @Param("now") Instant now);
```

Trong đó `newReleaseStart` là `newReleaseDate.atStartOfDay(VIETNAM).toInstant()`.

**c. Frontend – form suất chiếu**

- Hiển thị ngày khởi chiếu ngay dưới tên phim được chọn.
- Bổ sung prop `minDateTime?: string` cho `DateTimePicker` (định dạng `yyyy-MM-ddTHH:mm`, giờ Việt Nam).
- Với HC-01, giá trị tối thiểu là `releaseDate` lúc `00:00`; khi triển khai chung với HC-03, lấy `max(releaseDate 00:00, now + 10 phút)`.
- Kiểm tra lại khi:
  - đổi phim;
  - đổi ngày/giờ;
  - bấm gửi.
- Nếu không hợp lệ: giữ dữ liệu đã nhập, đánh dấu trường giờ bắt đầu, hiển thị thông báo nêu ngày khởi chiếu; không gọi API.
- Vẫn cho phép chọn phim `UPCOMING` và lập lịch từ ngày khởi chiếu trở đi.

**d. Frontend – form phim**

- Khi admin đổi `releaseDate` sang ngày muộn hơn, hiển thị cảnh báo rằng có thể có suất chiếu bị ảnh hưởng.
- Nếu backend trả `RESOURCE_STATE_CONFLICT`, hiển thị thông báo rõ và giữ dữ liệu form để admin sửa.
- Không tự dời/xóa suất từ giao diện.

**e. Kiểm thử**

- Unit backend: `releaseDate` null, trước, đúng ngày, sau ngày; biên 00:00–00:30 giờ Việt Nam; create/update; phim `HIDDEN` vẫn bị chặn.
- Unit backend: đổi `releaseDate` khi có/không có suất chưa kết thúc; suất đã kết thúc không chặn.
- Integration API: gọi thẳng `POST/PUT /api/admin/showtimes` bỏ qua UI; `PUT /api/admin/movies/{id}`.
- Frontend: chọn phim có ngày khởi chiếu; thử chọn ngày trước; đổi phim; lỗi server; không gọi API khi dữ liệu sai.
- Hồi quy: tạo/sửa suất hợp lệ, chống trùng phòng, đặt vé, check-in.

#### 3.3.6. Ước lượng nguồn lực, thời gian, chi phí

| Hạng mục | Vai trò | Người-ngày dự kiến |
|---|---|---|
| Kiểm tra `releaseDate` trong service | Backend | 0,75 |
| Truy vấn + bảo vệ `MovieService.update` | Backend | 0,25 |
| Giới hạn ngày và thông báo trên form | Frontend | 0,75 |
| Unit/integration/UI test | Backend + frontend + tester | 0,50 |
| Tài liệu, review, RTM | Tài liệu + reviewer | 0,25 |
| **Tổng** | | **2,50** |

- **Công cụ:** Java 25/JDK (source 17), Spring Boot 3.3.5, JUnit 5, Mockito, MySQL 8.0.36/Testcontainers; React 19, TypeScript 7, Vitest, RTL.
- **Chi phí trực tiếp:** 0 đồng (công cụ mã nguồn mở, máy cá nhân, DB cục bộ). Không tự quy đổi tiền công khi nhóm chưa chốt đơn giá.
- **Điều kiện:** D-01 và D-04 được chốt; Docker/Testcontainers hoạt động để chạy integration test.

#### 3.3.7. Rủi ro và biện pháp

| Mã | Rủi ro | Khả năng | Ảnh hưởng | Biện pháp |
|---|---|---|---|---|
| R01-01 | So sánh ngày sai múi giờ | Trung bình | Cao | Dùng `Asia/Ho_Chi_Minh`; test 00:00–00:30 và biên ngày |
| R01-02 | `releaseDate` rỗng gây chặn nhầm | Trung bình | Trung bình | Chốt D-01; thông báo yêu cầu bổ sung ngày |
| R01-03 | Đổi `releaseDate` làm hỏng lịch đã có | Trung bình | Cao | Chặn cập nhật nếu có suất chưa kết thúc vi phạm; không tự dời |
| R01-04 | Dữ liệu cũ đã vi phạm | Cao | Trung bình | Chỉ báo cáo, không tự xóa; xử lý theo nghiệp vụ |
| R01-05 | UI chặn nhưng API vẫn nhận | Thấp | Cao | Bắt buộc kiểm tra server; test gọi thẳng API |
| R01-06 | Xung đột nhánh với HC-03 | Trung bình | Thấp | Làm tuần tự hoặc thống nhất điểm chèn `validateSchedule` |
| R01-07 | Test cũ dùng mốc thời gian cố định | Trung bình | Trung bình | Stub `DatabaseTime`; dùng dữ liệu test xác định |

#### 3.3.8. Câu hỏi mở và quyết định

- **D-01 – đã chốt:** phim chưa có `releaseDate` **không** được lập lịch; yêu cầu bổ sung ngày khởi chiếu trước.
- **D-04 – đã chốt:** **chặn** đổi `releaseDate` khi có suất vi phạm; không tự dời/xóa.

Câu hỏi còn lại:

1. Có cần mã lỗi riêng `MOVIE_RELEASE_DATE_CONFLICT` hay dùng `SCHEDULE_INVALID`/`RESOURCE_STATE_CONFLICT`? Đề xuất: dùng mã hiện có.
2. Có cho phép nhập suất lịch sử cho mục đích demo/báo cáo không? Đề xuất: không; nếu cần, tạo quyền/cờ riêng và phê duyệt sau.
3. Phim `ENDED` có được tạo suất mới không? Hiện chỉ chặn `HIDDEN`; đề xuất giữ ngoài phạm vi HC-01, ghi nhận để xem xét sau.

### 3.4. Phiếu phê duyệt yêu cầu thay đổi (Mẫu 2.4)

| Trường | Nội dung |
|---|---|
| Mã yêu cầu | HC-01 |
| Hồ sơ trình duyệt | Phiếu đề xuất, phiếu tiếp nhận, bảng phân tích tác động, kế hoạch bảo trì mục 7.1 |
| Người trình | Nhóm bảo trì |
| Ngày trình | 25/11/2026 |
| Phương án đề nghị | **PA3 – Server + UI + bảo vệ khi đổi ngày khởi chiếu** |
| Điều kiện kèm theo | D-01/D-04 đã chốt; không có migration bắt buộc; test biên múi giờ; không tự hủy/dời suất |
| Quyết định | ☐ Chấp nhận  ☐ Từ chối  ☐ Cần đánh giá thêm |
| Lý do/ghi chú | Quyết định kỹ thuật đã chốt ngày 25/11/2026; chờ ký phê duyệt chính thức |
| Người phê duyệt | Ô trống – chưa ký |
| Ngày phê duyệt | Ô trống |
| Trạng thái hồ sơ | **Draft – đã chốt quyết định kỹ thuật, chờ ký phê duyệt** |

---

## 4. HC-02 – Bảo toàn thông tin đơn, lịch và vé khi ẩn phim

### 4.1. Phiếu đề xuất yêu cầu thay đổi (Mẫu 2.1)

| Trường | Nội dung |
|---|---|
| Dự án | Cinema – hệ thống đặt vé xem phim |
| Người đề xuất | Nhóm bảo trì – đại diện backend/frontend |
| Ngày đề xuất | 25/11/2026 |
| Liên hệ | Kênh nhóm và GitHub issue/PR của dự án |
| Mã đề xuất tạm | HC-02 |
| Tên yêu cầu | Bảo toàn thông tin đơn, lịch và vé khi phim bị ẩn; cảnh báo trước khi ẩn |
| Hiện trạng | Phim `HIDDEN` bị loại khỏi kênh công khai (đúng nghiệp vụ), nhưng khách đã đặt chỉ thấy thông báo chung “không tồn tại hoặc đã bị ẩn”; DTO đơn/vé thiếu tên rạp, trạng thái phim/suất và giờ kết thúc; admin có thể ẩn phim mà không thấy cảnh báo về suất/booking đang hiệu lực |
| Trạng thái mong muốn | Khách đã đặt vẫn xem được đơn/lịch/vé; giao diện phân biệt rõ “phim ngừng hiển thị” với “suất bị hủy”; admin được cảnh báo và xác nhận trước khi ẩn nếu còn cam kết hiệu lực; phim vẫn không được bán công khai |
| Bối cảnh, ràng buộc | Không mở lại bán vé cho `HIDDEN`; không tự hủy suất/booking/vé; không hoàn tiền; giữ quyền sở hữu và phân quyền; DTO chỉ bổ sung trường |
| Lợi ích dự kiến | Giảm hiểu nhầm và khiếu nại; khách biết vé còn giá trị; admin thấy tác động trước khi ẩn; bảo toàn dữ liệu lịch sử |
| Minh chứng hiện trạng | `MovieService.getPublic()` trả 404 với `HIDDEN`; `BookingQueries`/`TicketQueries` vẫn cho chủ đơn xem; `BookingSummaryResponse` thiếu `cinemaName`, `roomName`, `movieStatus`, `showtimeStatus`, `endsAt`; `BookingDetailResponse` thiếu `cinemaName`, trạng thái phim/suất, `endsAt`; `AdminMovieForm` không có cảnh báo |
| Mức độ xác minh | Đọc mã nguồn; **chưa tái hiện trực tiếp**. Đề xuất gốc mô tả “ẩn phim làm mất lịch chiếu”, nhưng mã nguồn cho thấy đơn/vé vẫn truy cập được; cần tái hiện để xác nhận hành vi thực tế |
| Đính kèm | Kế hoạch bảo trì mục 7.2; đề xuất gốc mục 4; trích xuất thiết kế mục 7.3.7–7.3.9 và UC-08 |
| Chữ ký người đề xuất | Nhóm bảo trì (dự thảo, chưa ký) |

### 4.2. Phiếu tiếp nhận yêu cầu thay đổi (Mẫu 2.2)

| Trường | Nội dung |
|---|---|
| Mã yêu cầu chính thức | HC-02 |
| Người tiếp nhận | Ban quản lý thay đổi – đầu mối tài liệu |
| Ngày tiếp nhận | 25/11/2026 |
| Đặc tả/thiết kế gốc liên quan | UC-08 – Xem lịch sử & vé; BR-19, BR-20; bảng `bookings`, `booking_seats`, `showtimes`, `movies`; API `/api/bookings/me`, `/api/bookings/{id}`, `/api/bookings/{id}/tickets` |
| Phân loại | **Bảo trì hiệu chỉnh** |
| Lý do phân loại | Hệ thống đang thiếu thông tin/điều hướng cần thiết để khách hiểu đúng tác động của việc ẩn phim và để admin thấy cảnh báo trước khi ẩn. Đây là khiếm khuyết hành vi so với kỳ vọng nghiệp vụ, không phải tính năng mới |
| Ưu tiên sơ bộ | **Trung bình**; nâng cao nếu tái hiện cho thấy khách không xem được đơn/vé đã thanh toán |
| Trùng lặp/phụ thuộc | Cùng chạm `MovieService.update()` với HC-01; phụ thuộc D-05, D-06, D-07 |
| Người phân tích | Backend + frontend + tài liệu |
| Trạng thái | Đã tiếp nhận; quyết định kỹ thuật đã chốt; chờ ký phê duyệt |

### 4.3. Bảng phân tích sự tác động (Mẫu 2.3)

#### 4.3.1. Hiện trạng và căn cứ

**Những gì đang đúng:**

- `MovieService.list()` loại `HIDDEN` khỏi danh sách công khai.
- `MovieService.getPublic()` trả 404 với `HIDDEN`.
- `ShowtimeService.publicMovie()` và `seatMap()` chặn truy cập công khai với phim `HIDDEN`.
- `BookingQueries.detail()`, `TicketQueries.tickets()` và `CheckinTransactions` **không** chặn chỉ vì phim `HIDDEN`; chủ đơn vẫn truy cập được trong điều kiện trạng thái hợp lệ.
- `ShowtimeRepository` đã loại phim `HIDDEN` khỏi lịch công khai.

**Khoảng trống đã xác nhận bằng mã nguồn:**

1. `BookingSummaryResponse` chỉ có `movieTitle`, `startsAt`, tiền, thời gian tạo/hết hạn; thiếu tên rạp, tên phòng, trạng thái phim, trạng thái suất và `endsAt`.
2. `BookingDetailResponse` có `roomName` nhưng thiếu `cinemaName`, trạng thái phim/suất và `endsAt`.
3. `BookingQueries.detail()` dùng `bookings.findById(id)` không có `EntityGraph`; các quan hệ được nạp lazy trong transaction. Chưa phải lỗi chức năng nhưng nên tối ưu khi bổ sung trường.
4. `MovieDetailsPage` hiển thị “không tồn tại hoặc đã bị ẩn” và chỉ có nút quay lại danh sách phim; không hướng dẫn khách đã đặt vào “Vé của tôi”.
5. `AdminMovieForm` cho đổi trạng thái sang `HIDDEN` mà không hiển thị số suất/booking đang hiệu lực và không yêu cầu xác nhận.

**Kết luận khảo sát:** chưa có căn cứ kết luận ẩn phim làm mất vé. Vấn đề chính là **thiếu thông tin, thiếu thông báo phân biệt và thiếu cảnh báo quản trị**. Vì vậy HC-02 giữ nguyên hành vi ẩn khỏi kênh công khai, chỉ bổ sung thông tin/điều hướng/cảnh báo.

**Mức độ xác minh:** đọc mã nguồn; chưa chạy tái hiện. Khi tái hiện, cần kiểm tra:
- khách đã đăng nhập mở `/my-tickets` và `/bookings/{id}` sau khi phim bị ẩn;
- khách mở lại link phim công khai;
- admin ẩn phim có booking `CONFIRMED`;
- check-in vé của phim `HIDDEN`.

#### 4.3.2. Thành phần bị ảnh hưởng

| Thành phần | Loại ảnh hưởng | Nội dung | Mức |
|---|---|---|---|
| `BookingSummaryResponse` | Trực tiếp | Thêm `cinemaName`, `roomName`, `movieStatus`, `showtimeStatus`, `endsAt` | Trung bình |
| `BookingDetailResponse` | Trực tiếp | Thêm `cinemaName`, `movieStatus`, `showtimeStatus`, `endsAt` | Trung bình |
| `BookingQueries` | Trực tiếp | Map trường mới; dùng truy vấn có `EntityGraph` cho detail | Trung bình |
| `BookingRepository` | Trực tiếp | Thêm `findDetailById` có `EntityGraph`; có thể thêm truy vấn đếm | Trung bình |
| `ShowtimeRepository` | Trực tiếp | Thêm truy vấn đếm suất `SCHEDULED` chưa kết thúc theo phim | Trung bình |
| `AdminMovieController` / `MovieService` | Trực tiếp | Thêm endpoint đọc `hide-impact` (ADMIN) | Trung bình |
| `TicketQueries`, `CheckinTransactions` | Kiểm tra, không đổi | Xác nhận vẫn cho chủ đơn/STAFF xử lý vé của phim `HIDDEN` | Thấp |
| `MyTicketsPage` | Trực tiếp | Hiển thị rạp, trạng thái, thông báo phim ngừng hiển thị | Cao |
| `BookingDetailPage` | Trực tiếp | Hiển thị rạp, trạng thái, thông báo theo điều kiện | Cao |
| `BookingSuccessPage` | Trực tiếp | Hiển thị rạp; thông báo nếu phim bị ẩn sau khi mua | Trung bình |
| `MovieDetailsPage` | Trực tiếp | Thông báo trung tính + liên kết “Vé của tôi” | Trung bình |
| `AdminMovieForm` | Trực tiếp | Gọi `hide-impact`, hiển thị modal xác nhận trước khi ẩn | Cao |
| Types/hooks frontend | Trực tiếp | Bổ sung trường DTO, hook `useMovieHideImpact` | Trung bình |
| API booking | Gián tiếp | Chỉ bổ sung trường; client cũ bỏ qua trường mới | Thấp |
| API admin mới | Trực tiếp | `GET /api/admin/movies/{id}/hide-impact`; chỉ ADMIN | Trung bình |
| CSDL | Không đổi | Không cần schema; có thể cân nhắc index nếu chậm | Thấp |
| Kiểm thử | Trực tiếp | Booking integration, DTO contract, UI, phân quyền, N+1 | Cao |
| Tài liệu | Trực tiếp | SRS, SDD, test case, RTM, hướng dẫn admin | Trung bình |
| Bảo mật | Trực tiếp | Endpoint mới chỉ ADMIN; DTO chỉ chủ đơn/ADMIN | Trung bình |
| Hiệu năng | Gián tiếp | Tránh N+1; đếm `hide-impact` có thể chậm nếu thiếu index | Trung bình |

#### 4.3.3. Phương án

**PA1 – Cho phim `HIDDEN` hiển thị lại**

- Bỏ lọc `HIDDEN` ở danh sách/chi tiết công khai.
- Không khuyến nghị: mở lại bán vé ngoài ý muốn, trái mục đích ẩn.

**PA2 – Chỉ sửa thông báo 404**

- Đổi nội dung `MovieDetailsPage`, thêm liên kết “Vé của tôi”.
- Không bổ sung DTO, không cảnh báo admin.
- Không khuyến nghị: chưa giải quyết thông tin thiếu trong đơn/vé và rủi ro admin ẩn phim.

**PA3 – Giữ phim ẩn + bổ sung DTO/thông báo + cảnh báo admin**

- Giữ nguyên hành vi ẩn khỏi public.
- Bổ sung trường DTO theo hướng additive.
- Cập nhật ba màn hình đơn/vé và màn hình phim.
- Thêm endpoint `hide-impact` và modal xác nhận cho admin.
- Khuyến nghị.

**PA4 – Tự động hủy suất/booking khi ẩn phim**

- Khi ẩn, tự động hủy suất và vé.
- Không khuyến nghị: trái cam kết với khách, trái BR-19/BR-20, cần hoàn tiền ngoài phạm vi.

#### 4.3.4. So sánh phương án

| Tiêu chí | PA1 – Hiện lại | PA2 – Chỉ sửa 404 | PA3 – Giữ ẩn + DTO + cảnh báo | PA4 – Tự hủy |
|---|---|---|---|---|
| Cách thực hiện | Bỏ lọc `HIDDEN` | Đổi text + link | DTO + UI + endpoint + modal | Hủy suất/vé tự động |
| Bán vé mới cho phim ẩn | **Có** | Không | Không | Không |
| Khách đã đặt theo dõi được đơn/vé | Có nhưng sai mục đích ẩn | Một phần | **Đầy đủ, có giải thích** | Có nhưng vé bị hủy |
| Phân biệt ẩn phim/hủy suất | Không | Một phần | **Có** | Không cần vì đã hủy |
| Admin thấy tác động trước khi ẩn | Không | Không | **Có** | Không |
| Tác động dữ liệu | Không | Không | Không | **Có, phá cam kết** |
| Nhân lực | 0,25 người-ngày | 0,5 người-ngày | 4,5 người-ngày | 5+ người-ngày |
| Chi phí trực tiếp | 0 đồng | 0 đồng | 0 đồng | 0 đồng + hoàn tiền |
| Khả năng kiểm thử | Thấp | Thấp | Cao | Thấp do nhiều nhánh |
| Rủi ro | Trái nghiệp vụ | Thiếu thông tin | Trung bình, có kiểm soát | Cao |
| Kết luận | **Loại** | **Loại** | **Chọn** | **Loại** |

#### 4.3.5. Phương án đề xuất: PA3

**a. Bổ sung DTO (chỉ trả cho chủ đơn/ADMIN)**

`BookingSummaryResponse`:

```java
public record BookingSummaryResponse(
    Long bookingId, String bookingCode, BookingStatus status, BookingStatus effectiveStatus,
    String movieTitle, String cinemaName, String roomName,
    MovieStatus movieStatus, ShowtimeStatus showtimeStatus,
    Instant startsAt, Instant endsAt,
    BigDecimal totalAmount, Instant createdAt, Instant expiresAt) { }
```

`BookingDetailResponse`:

```java
public record BookingDetailResponse(
    Long bookingId, String bookingCode, Long showtimeId,
    String movieTitle, String cinemaName, String roomName,
    MovieStatus movieStatus, ShowtimeStatus showtimeStatus,
    Instant startsAt, Instant endsAt,
    BookingStatus status, BookingStatus effectiveStatus,
    BigDecimal totalAmount, Instant createdAt, Instant expiresAt,
    List<SeatItem> seats) { }
```

- `from()` lấy dữ liệu từ quan hệ đã nạp; không gọi API phim công khai.
- Thay đổi là additive; client cũ vẫn đọc được trường cũ.
- Không đưa PII của khách khác vào DTO.

**b. Truy vấn**

- `BookingRepository.findByUserId` đã có `EntityGraph` cho `showtime`, `showtime.movie`, `showtime.room`, `showtime.room.cinema`; giữ nguyên.
- Thêm `findDetailById` với `EntityGraph` tương tự để `BookingQueries.detail()` không phát sinh lazy load ngoài ý muốn.
- Với `hide-impact`, thêm truy vấn đếm:
  - số suất `SCHEDULED` có `endsAt > now`;
  - số booking `CONFIRMED` thuộc các suất đó;
  - số booking `PENDING` còn hạn (`expiresAt > now`).
- Nếu đo thấy chậm, cân nhắc index `showtimes(movie_id, status, ends_at)` và `bookings(showtime_id, status)`; migration riêng, không gộp vào HC-02 nếu chưa được duyệt.

**c. Endpoint cảnh báo ẩn phim**

`GET /api/admin/movies/{id}/hide-impact` – ADMIN.

Response đề xuất:

```json
{
  "movieId": 12,
  "title": "Dune: Hành Tinh Cát – Phần Ba",
  "activeShowtimes": 3,
  "confirmedBookings": 18,
  "pendingBookings": 2,
  "earliestStart": "2026-12-01T10:00:00Z",
  "latestEnd": "2026-12-03T14:30:00Z"
}
```

- Chỉ đọc, không thay đổi dữ liệu.
- Nếu phim không tồn tại: 404.
- Nếu người gọi không phải ADMIN: 403 (theo `@PreAuthorize` hiện có).
- Không trả danh sách khách hàng hoặc mã vé.

**d. Quy tắc hiển thị thông báo**

Chỉ hiển thị “vé vẫn có giá trị sử dụng” khi đồng thời:

- booking `CONFIRMED`;
- suất `SCHEDULED`;
- thời điểm hiện tại trước `endsAt`;
- phim `HIDDEN`.

Nội dung đề xuất:

> Phim hiện không còn hiển thị để đặt vé mới. Suất chiếu của bạn vẫn diễn ra theo lịch; vé đã thanh toán vẫn có giá trị sử dụng.

Các trường hợp khác:

- `PENDING` còn hạn: “Đơn đang giữ ghế; có thể tiếp tục thanh toán theo chính sách hiện tại.” Không gọi là vé đã phát hành.
- `EXPIRED`, `CANCELLED`: hiển thị đúng trạng thái; không khẳng định vé còn giá trị.
- Suất `CANCELLED` hoặc đã kết thúc: không hiển thị “vẫn diễn ra”.
- Không dùng nhãn “Hợp lệ” cố định; dùng “Đã phát hành” nếu cần.

**e. Cập nhật màn hình**

- `MyTicketsPage`: hiển thị tên rạp/phòng, thông báo theo quy tắc, giữ nút xem chi tiết/vé.
- `BookingDetailPage`: hiển thị tên rạp, trạng thái suất/phim, thông báo theo quy tắc.
- `BookingSuccessPage`: hiển thị tên rạp; thông báo nếu phim bị ẩn sau khi mua.
- `MovieDetailsPage`: thay thông báo 404 bằng nội dung trung tính:

> Nội dung này hiện không còn hiển thị công khai. Nếu bạn đã đặt vé, vui lòng đăng nhập và vào “Vé của tôi” để kiểm tra thông tin suất chiếu.

- Không tiết lộ booking/vé cho người không sở hữu; giữ kiểm tra đăng nhập và quyền sở hữu hiện có.

**f. Cảnh báo trước khi ẩn phim**

- `AdminMovieForm`: khi người dùng đổi trạng thái sang `HIDDEN` và đang sửa phim, gọi `hide-impact`.
- Nếu có cam kết hiệu lực, hiển thị modal:
  - ẩn phim chỉ ngừng hiển thị và nhận đặt mới;
  - không hủy suất, không hủy vé;
  - đơn giữ chỗ còn hạn xử lý theo chính sách hiện tại;
  - số suất/booking bị ảnh hưởng.
- Nếu endpoint lỗi: hiển thị cảnh báo chung, không chặn thao tác ẩn; ghi nhận lỗi để kiểm tra.
- Không cấm ẩn chỉ vì booking lịch sử của suất đã kết thúc.
- Không tự động hủy hoặc hoàn tiền.

**g. Kiểm thử**

- Ẩn phim có booking `CONFIRMED` cho suất chưa kết thúc → đơn/vé không bị hủy; khách xem đầy đủ.
- Chủ đơn xem chi tiết sau khi ẩn → có thông báo phân biệt.
- Khách mở lại link phim công khai → có hướng dẫn “Vé của tôi”; không khẳng định sai vé bị hủy.
- Khách chưa đặt tìm phim `HIDDEN`/tạo booking mới → không được bán công khai.
- Check-in vé `CONFIRMED` của phim ẩn trong khung giờ hợp lệ → thành công.
- `PENDING` còn hạn → thông báo đúng; vẫn thanh toán được.
- `EXPIRED`/`CANCELLED` → không hiện thông báo vé còn giá trị.
- Người khác truy cập đơn/vé → bị từ chối.
- ADMIN ẩn phim có cam kết hiệu lực → có cảnh báo/xác nhận.
- Phim chỉ có booking của suất đã kết thúc → không bị cấm ẩn.
- DTO có trường mới; client cũ vẫn đọc được trường cũ.
- `hide-impact` gọi bằng STAFF/CUSTOMER → 403.
- Endpoint cảnh báo lỗi → có cảnh báo chung, không tự hủy dữ liệu.
- Danh sách đơn nhiều bản ghi → không N+1 quá mức.

#### 4.3.6. Ước lượng nguồn lực, thời gian, chi phí

| Hạng mục | Vai trò | Người-ngày dự kiến |
|---|---|---|
| DTO + mapping + truy vấn detail | Backend | 1,00 |
| Endpoint `hide-impact` + truy vấn đếm | Backend | 0,75 |
| Types/hooks + ba màn hình đơn/vé + màn hình phim | Frontend | 1,25 |
| Modal xác nhận ẩn phim + form phim | Frontend | 0,50 |
| Test backend/integration/UI/phân quyền/N+1 | Backend + frontend + tester | 0,75 |
| Tài liệu, review, RTM | Tài liệu + reviewer | 0,25 |
| **Tổng** | | **4,50** |

- **Công cụ:** như HC-01; thêm Hibernate statistics/EXPLAIN để kiểm tra N+1 và truy vấn đếm.
- **Chi phí trực tiếp:** 0 đồng. Không cần dịch vụ ngoài.
- **Điều kiện:** D-05, D-06, D-07 được chốt; có dữ liệu test phim `HIDDEN` + booking `CONFIRMED`/`PENDING`.

#### 4.3.7. Rủi ro và biện pháp

| Mã | Rủi ro | Khả năng | Ảnh hưởng | Biện pháp |
|---|---|---|---|---|
| R02-01 | Thông báo gây hiểu nhầm vé còn giá trị | Trung bình | Cao | Chỉ hiện khi đủ điều kiện; test PENDING/EXPIRED/CANCELLED/ENDED |
| R02-02 | N+1 khi thêm trường | Trung bình | Trung bình | `EntityGraph`/projection; đo số truy vấn |
| R02-03 | Endpoint `hide-impact` chậm | Thấp | Trung bình | Đếm theo khóa chính/chỉ mục; index riêng nếu được duyệt |
| R02-04 | Rò rỉ dữ liệu khách khác | Thấp | Cao | Chỉ ADMIN; DTO chỉ chủ đơn/ADMIN; test quyền sở hữu |
| R02-05 | Modal xác nhận bị bỏ qua do lỗi API | Trung bình | Trung bình | Có cảnh báo chung; không tự hủy dữ liệu; ghi log |
| R02-06 | Thay đổi DTO phá client cũ | Thấp | Trung bình | Chỉ thêm trường; test contract; không đổi tên/kiểu trường cũ |
| R02-07 | Ẩn phim làm mất lịch công khai ngoài ý muốn | Thấp | Trung bình | Giữ hành vi hiện có; chỉ bổ sung thông tin, không mở bán |

#### 4.3.8. Câu hỏi mở và quyết định

- **D-05 – đã chốt:** **bắt buộc xác nhận** khi ẩn phim còn cam kết hiệu lực.
- **D-06 – đã chốt:** **bổ sung** `movieStatus`/`showtimeStatus` vào DTO booking; chỉ trả cho chủ đơn/ADMIN.
- **D-07 – đã chốt:** **chỉ thêm index** cho `hide-impact` nếu đo thấy chậm; migration riêng.

Câu hỏi còn lại:

1. Có cần thêm `movieId` vào DTO để liên kết phim không? Đề xuất: không bắt buộc; nếu thêm, vẫn là additive.
2. Nội dung thông báo chính xác do nhóm/giảng viên chốt; tránh khẳng định pháp lý về hoàn tiền.
3. Có hiển thị thông báo cho booking `FAILED` không? Đề xuất: không; chỉ trạng thái hiện tại.

### 4.4. Phiếu phê duyệt yêu cầu thay đổi (Mẫu 2.4)

| Trường | Nội dung |
|---|---|
| Mã yêu cầu | HC-02 |
| Hồ sơ trình duyệt | Phiếu đề xuất, phiếu tiếp nhận, bảng phân tích tác động, kế hoạch bảo trì mục 7.2 |
| Người trình | Nhóm bảo trì |
| Ngày trình | 25/11/2026 |
| Phương án đề nghị | **PA3 – Giữ ẩn + bổ sung DTO/thông báo + cảnh báo admin** |
| Điều kiện kèm theo | D-05/D-06/D-07 đã chốt; không tự hủy vé; endpoint chỉ ADMIN; test quyền sở hữu và N+1 |
| Quyết định | ☐ Chấp nhận  ☐ Từ chối  ☐ Cần đánh giá thêm |
| Lý do/ghi chú | Quyết định kỹ thuật đã chốt ngày 25/11/2026; chờ ký phê duyệt chính thức |
| Người phê duyệt | Ô trống – chưa ký |
| Ngày phê duyệt | Ô trống |
| Trạng thái hồ sơ | **Draft – đã chốt quyết định kỹ thuật, chờ ký phê duyệt** |

---

## 5. HC-03 – Chặn suất chiếu trong quá khứ hoặc sát giờ

### 5.1. Phiếu đề xuất yêu cầu thay đổi (Mẫu 2.1)

| Trường | Nội dung |
|---|---|
| Dự án | Cinema – hệ thống đặt vé xem phim |
| Người đề xuất | Nhóm bảo trì – đại diện backend/frontend |
| Ngày đề xuất | 25/11/2026 |
| Liên hệ | Kênh nhóm và GitHub issue/PR của dự án |
| Mã đề xuất tạm | HC-03 |
| Tên yêu cầu | Chặn tạo/sửa suất chiếu trong quá khứ hoặc sát giờ chiếu |
| Hiện trạng | `ShowtimeService.validateSchedule()` không so sánh `startsAt` với thời gian hiện tại; `DateTimePicker` cho chọn mọi ngày/giờ; admin có thể lưu suất đã qua hoặc chỉ còn vài phút, tạo tồn kho không thể bán |
| Trạng thái mong muốn | Máy chủ từ chối suất bắt đầu trước `now + thời gian dẫn`; giao diện không cho chọn thời điểm không hợp lệ; suất hợp lệ trong tương lai vẫn tạo được; dữ liệu lịch sử không bị tự động sửa/xóa |
| Bối cảnh, ràng buộc | Dùng `DatabaseTime` làm nguồn thời gian; thời gian dẫn mặc định 10 phút, đồng bộ cutoff đặt vé; không đổi API; không tự xóa suất cũ |
| Lợi ích dự kiến | Tránh tồn kho không thể bán; giảm nhiễu lịch/báo cáo; thống nhất quy tắc thời gian với luồng đặt vé |
| Minh chứng hiện trạng | `validateSchedule()` chỉ kiểm tra khoảng thời gian, thời lượng, giá; `DateTimePicker` không có `min`; `BookingRules.requireBeforeCutoff()` dùng 600 giây cho đặt vé; `DatabaseTime` đã có sẵn |
| Mức độ xác minh | Đọc mã nguồn; **chưa tái hiện trực tiếp** |
| Đính kèm | Kế hoạch bảo trì mục 7.3; trích xuất thiết kế UC-02 và BR-08 |
| Chữ ký người đề xuất | Nhóm bảo trì (dự thảo, chưa ký) |

### 5.2. Phiếu tiếp nhận yêu cầu thay đổi (Mẫu 2.2)

| Trường | Nội dung |
|---|---|
| Mã yêu cầu chính thức | HC-03 |
| Người tiếp nhận | Ban quản lý thay đổi – đầu mối tài liệu |
| Ngày tiếp nhận | 25/11/2026 |
| Đặc tả/thiết kế gốc liên quan | UC-02 – Tạo/sửa lịch chiếu; BR-08 (cutoff đặt vé); bảng `showtimes`; `DatabaseTime` |
| Phân loại | **Bảo trì hiệu chỉnh** |
| Lý do phân loại | Hành vi cho phép lưu suất đã qua/sát giờ là khiếm khuyết so với kỳ vọng vận hành; không phải thích ứng môi trường hay tính năng mới |
| Ưu tiên sơ bộ | **Trung bình** – ảnh hưởng vận hành, dữ liệu lịch và tồn kho; không trực tiếp làm mất vé đã bán |
| Trùng lặp/phụ thuộc | Cùng `validateSchedule` và `DateTimePicker` với HC-01; phụ thuộc D-02 và D-03 |
| Người phân tích | Backend + frontend + tài liệu |
| Trạng thái | Đã tiếp nhận; D-02/D-03 đã chốt; chờ ký phê duyệt |

### 5.3. Bảng phân tích sự tác động (Mẫu 2.3)

#### 5.3.1. Hiện trạng và căn cứ

- `ShowtimeService.validateSchedule()` không gọi `databaseTime.now()` và không kiểm tra `startsAt` so với hiện tại.
- `DateTimePicker` không có prop giới hạn ngày/giờ tối thiểu; form không kiểm tra thời điểm trước khi gửi.
- `BookingRules.requireBeforeCutoff()` chặn đặt vé khi `now >= startsAt - 600 giây`; vì vậy suất đã qua hoặc sát giờ sẽ có tồn kho không thể bán.
- `DatabaseTime` đọc `UTC_TIMESTAMP(3)` từ DB, đã được dùng trong `seatMap()` và booking; nên dùng cùng nguồn để nhất quán và dễ kiểm thử.
- Tài liệu thiết kế UC-02 bước 2 chỉ ghi “kiểm tra thời gian hợp lệ”, chưa nêu quy tắc cụ thể; BR-08 chỉ nói về cutoff đặt vé, không nói về tạo suất.

**Kết luận:** cần bổ sung quy tắc rõ ràng và kiểm tra server; đây là lỗ hổng nghiệp vụ, không chỉ là thiếu tiện ích giao diện.

**Mức độ xác minh:** đọc mã nguồn; chưa tái hiện. Khi tái hiện, tạo suất có `startsAt = now - 10 phút` và `startsAt = now + 5 phút`; ghi lại HTTP status và dữ liệu sau lưu.

#### 5.3.2. Thành phần bị ảnh hưởng

| Thành phần | Loại ảnh hưởng | Nội dung | Mức |
|---|---|---|---|
| `ShowtimeService.validateSchedule()` | Trực tiếp | Thêm kiểm tra `startsAt` so với `databaseTime.now()` + thời gian dẫn | Cao |
| `DatabaseTime` | Không đổi | Dùng làm nguồn thời gian; đã có | Thấp |
| `ShowtimeRequest` | Không đổi | Đã có `startsAt`; không cần trường mới | Thấp |
| `AdminShowtimeFormPage` | Trực tiếp | Kiểm tra trước khi gửi; thông báo lỗi | Trung bình |
| `DateTimePicker` | Trực tiếp | Thêm `minDateTime`; chặn ngày/giờ không hợp lệ | Trung bình |
| API `POST/PUT /api/admin/showtimes` | Gián tiếp | Không đổi đường dẫn; thêm trường hợp `SCHEDULE_INVALID` | Thấp |
| DTO | Không đổi | Không cần thêm trường | Thấp |
| CSDL | Không đổi | Không cần migration | Thấp |
| Test backend | Trực tiếp | Stub `DatabaseTime`; test biên 9:59/10:00/10:01 | Cao |
| Test frontend | Trực tiếp | Chọn ngày/giờ bị chặn; thông báo | Trung bình |
| Tài liệu | Trực tiếp | SRS, SDD, test case, RTM | Trung bình |
| Dữ liệu lịch sử | Gián tiếp | Không tự xóa/sửa suất đã có | Trung bình |

#### 5.3.3. Phương án

**PA1 – Chỉ giới hạn ở giao diện**

- Thêm `minDateTime` và kiểm tra form.
- Không sửa backend.

**PA2 – Chỉ chặn suất đã qua ở máy chủ**

- Từ chối nếu `startsAt <= now`.
- Không có thời gian dẫn; vẫn cho tạo suất còn 1 phút.

**PA3 – Chặn ở máy chủ + giao diện, dùng thời gian dẫn 10 phút**

- Từ chối nếu `startsAt < now + 10 phút`.
- Giao diện giới hạn theo cùng quy tắc.
- Khuyến nghị.

**PA4 – Cho phép nhập lịch sử bằng quyền/cờ riêng**

- Mặc định chặn; ADMIN có cờ `allowHistorical` được phép tạo suất quá khứ cho mục đích demo/nhập liệu.
- Không khuyến nghị cho MVP: tăng phức tạp phân quyền, dễ lạm dụng, chưa có yêu cầu nghiệp vụ rõ.

#### 5.3.4. So sánh phương án

| Tiêu chí | PA1 – Chỉ UI | PA2 – Chỉ chặn quá khứ | PA3 – Server + UI + 10 phút | PA4 – Cờ nhập lịch sử |
|---|---|---|---|---|
| Cách thực hiện | Giới hạn form | So sánh `now` | So sánh `now + 10 phút` ở server và UI | Thêm quyền/cờ |
| Chống bỏ qua API | **Không** | Có | **Có** | Có, nhưng mở ngoại lệ |
| Suất sát giờ | Vẫn tạo được | Vẫn tạo được | **Bị chặn** | Tùy cờ |
| Đồng bộ cutoff đặt vé | Không | Một phần | **Có** | Có |
| Tác động dữ liệu | Không | Không | Không | Có thể tạo dữ liệu lịch sử |
| Nhân lực | 0,5 người-ngày | 1,0 người-ngày | 2,0 người-ngày | 2,5+ người-ngày |
| Chi phí trực tiếp | 0 đồng | 0 đồng | 0 đồng | 0 đồng |
| Khả năng kiểm thử | Thấp | Trung bình | **Cao** | Trung bình |
| Rủi ro | Bỏ qua API | Suất sát giờ không bán được | Trung bình, có kiểm soát | Phức tạp phân quyền |
| Kết luận | **Loại** | **Cân nhắc** | **Chọn** | **Loại/hoãn** |

#### 5.3.5. Phương án đề xuất: PA3

**a. Backend**

Trong `ShowtimeService`:

```java
private static final long MIN_LEAD_SECONDS = 600; // đồng bộ cutoff đặt vé 10 phút
```

Trong `validateSchedule()`:

```java
Instant earliestStart = databaseTime.now().plusSeconds(MIN_LEAD_SECONDS);
if (starts.isBefore(earliestStart)) {
    throw new AppException(ErrorCode.SCHEDULE_INVALID,
            "Suất chiếu phải bắt đầu sau thời điểm hiện tại ít nhất 10 phút.");
}
```

- Dùng `isBefore` để thời điểm đúng `now + 10:00` được chấp nhận.
- Áp dụng cho cả `create()` và `update()`.
- Không sửa/xóa suất đã tồn tại trong quá khứ; chỉ chặn thao tác mới.
- Nếu nghiệp vụ cần nhập lịch sử, phải có quyền/cờ riêng và phê duyệt (PA4), mặc định không.
- Cân nhắc đưa `MIN_LEAD_SECONDS` thành hằng dùng chung với `BookingRules` để tránh lệch quy tắc; nếu không, ghi chú rõ lý do.

**b. Frontend**

- Bổ sung `minDateTime` cho `DateTimePicker` (giờ Việt Nam).
- Giá trị tối thiểu = `now + 10 phút`, làm tròn lên phút gần nhất để tránh chọn thời điểm vừa tròn nhưng bị server từ chối do chênh lệch vài giây.
- Không cho chọn ngày trước hôm nay; với hôm nay, chặn giờ/phút trước mốc tối thiểu.
- Khi đổi ngày/giờ hoặc gửi form, kiểm tra lại; nếu không hợp lệ, hiển thị lỗi và không gọi API.
- Khi triển khai chung với HC-01: `minDateTime = max(releaseDate 00:00, now + 10 phút)`.

**c. Kiểm thử**

- `ShowtimeServiceTest`: thêm stub `when(databaseTime.now()).thenReturn(fixedNow)` cho mọi test create/update; nếu không, mock trả `null` gây NPE.
- Test biên: `now + 9:59` → từ chối; `now + 10:00` → cho phép; `now + 10:01` → cho phép.
- Test `startsAt` trong quá khứ, sửa suất sang quá khứ, gọi thẳng API.
- Test múi giờ Việt Nam, đặc biệt 00:00–00:30.
- Test suất cũ đã tồn tại không bị tự động xóa/sửa.
- Frontend: không cho chọn; thông báo; không gọi API.

#### 5.3.6. Ước lượng nguồn lực, thời gian, chi phí

| Hạng mục | Vai trò | Người-ngày dự kiến |
|---|---|---|
| Kiểm tra thời gian + hằng số | Backend | 0,75 |
| `minDateTime` + kiểm tra form | Frontend | 0,50 |
| Test backend/UI/biên | Backend + frontend + tester | 0,50 |
| Tài liệu, review, RTM | Tài liệu + reviewer | 0,25 |
| **Tổng** | | **2,00** |

- **Công cụ:** như HC-01.
- **Chi phí trực tiếp:** 0 đồng.
- **Điều kiện:** D-02 và D-03 được chốt; Docker/Testcontainers hoạt động.

#### 5.3.7. Rủi ro và biện pháp

| Mã | Rủi ro | Khả năng | Ảnh hưởng | Biện pháp |
|---|---|---|---|---|
| R03-01 | Thay đổi hành vi nhập liệu lịch sử | Trung bình | Trung bình | Chốt D-02/D-03; thông báo cho admin; không tự xóa dữ liệu cũ |
| R03-02 | Test cũ dùng mốc cố định bị NPE | Cao | Trung bình | Stub `DatabaseTime` cho mọi test create/update |
| R03-03 | Lệch múi giờ khi so sánh | Trung bình | Cao | Dùng `Instant`/UTC và `Asia/Ho_Chi_Minh` đúng chỗ; test biên |
| R03-04 | UI làm tròn phút gây lệch server | Trung bình | Thấp | Làm tròn lên; server vẫn là nguồn quyết định |
| R03-05 | Xung đột nhánh với HC-01 | Trung bình | Thấp | Làm tuần tự; thống nhất điểm chèn và prop `minDateTime` |
| R03-06 | Admin không thể sửa suất đã bắt đầu | Thấp | Trung bình | Ghi nhận là hành vi mong muốn; nếu cần, thiết kế quyền riêng |

#### 5.3.8. Câu hỏi mở và quyết định

- **D-02 – đã chốt:** thời gian dẫn tối thiểu là **10 phút**, đồng bộ cutoff đặt vé.
- **D-03 – đã chốt:** **HC-03 thuộc phạm vi** bảo trì hiệu chỉnh.

Câu hỏi còn lại:

1. Có cấu hình thời gian dẫn bằng property không? Đề xuất: hằng số trước; nếu cần, chuyển thành cấu hình sau.
2. Có cho phép ADMIN sửa suất đã bắt đầu nhưng chưa kết thúc không? Đề xuất: không trong phạm vi này.
3. Có cần mã lỗi riêng cho suất quá khứ không? Đề xuất: dùng `SCHEDULE_INVALID`.

### 5.4. Phiếu phê duyệt yêu cầu thay đổi (Mẫu 2.4)

| Trường | Nội dung |
|---|---|
| Mã yêu cầu | HC-03 |
| Hồ sơ trình duyệt | Phiếu đề xuất, phiếu tiếp nhận, bảng phân tích tác động, kế hoạch bảo trì mục 7.3 |
| Người trình | Nhóm bảo trì |
| Ngày trình | 25/11/2026 |
| Phương án đề nghị | **PA3 – Server + UI + thời gian dẫn 10 phút** |
| Điều kiện kèm theo | D-02/D-03 đã chốt; stub `DatabaseTime`; test biên; không tự sửa dữ liệu lịch sử |
| Quyết định | ☐ Chấp nhận  ☐ Từ chối  ☐ Cần đánh giá thêm |
| Lý do/ghi chú | Quyết định kỹ thuật đã chốt ngày 25/11/2026; chờ ký phê duyệt chính thức |
| Người phê duyệt | Ô trống – chưa ký |
| Ngày phê duyệt | Ô trống |
| Trạng thái hồ sơ | **Draft – đã chốt quyết định kỹ thuật, chờ ký phê duyệt** |

---

## 6. Tổng hợp tác động và phụ thuộc

### 6.1. Ma trận phụ thuộc

| CR | Thành phần dùng chung | Phụ thuộc với | Mức xung đột |
|---|---|---|---|
| HC-01 | `ShowtimeService.validateSchedule`, `DateTimePicker`, `AdminShowtimeFormPage`, `MovieService.update` | HC-03, HC-02 | Trung bình |
| HC-02 | `MovieService.update`, `BookingRepository`, `BookingQueries` | HC-01 | Thấp |
| HC-03 | `ShowtimeService.validateSchedule`, `DateTimePicker`, `AdminShowtimeFormPage` | HC-01 | Trung bình |

### 6.2. Thứ tự triển khai đề xuất

1. **HC-03 trước** – thay đổi nhỏ, thiết lập kiểm tra thời gian và prop `minDateTime`, giúp HC-01 kế thừa.
2. **HC-01 sau** – bổ sung kiểm tra `releaseDate` và bảo vệ `MovieService.update`, dùng chung hạ tầng UI/thời gian.
3. **HC-02 cuối** – chủ yếu là DTO/UI/endpoint, ít chồng lấn với hai HC còn lại.

Lý do: HC-03 và HC-01 cùng sửa `validateSchedule`, `DateTimePicker`, `AdminShowtimeFormPage`; làm tuần tự tránh xung đột. HC-02 chạm `MovieService.update` nhưng có thể review sau khi HC-01 ổn định.

### 6.3. Tác động đến tài liệu thiết kế gốc

Tài liệu thiết kế gốc (1.0 – 03/11/2026) **không phải as-built**; có các sai lệch:

| Điểm | Tài liệu gốc | Mã nguồn hiện tại | Xử lý |
|---|---|---|---|
| Frontend | Vue 3 | React 19 + TypeScript + Vite | Ghi nhận sai lệch trong SDD; không sửa tài liệu gốc |
| Số bảng | 11 bảng | Có thêm migration V4–V7 và bảng phát sinh | Đối chiếu khi viết SDD |
| Quy tắc `releaseDate` | Không có | Không có | Bổ sung BR mới |
| Quy tắc suất chiếu quá khứ | Không nêu rõ | Không có | Bổ sung BR mới |
| Hành vi ẩn phim | Không nêu rõ | Ẩn public, vẫn giữ vé | Bổ sung BR mới |

**Quy tắc nghiệp vụ đề xuất bổ sung (đánh số tiếp theo, cần duyệt):**

- **BR-23:** Suất chiếu không được bắt đầu trước `movies.release_date`; so sánh theo ngày nghiệp vụ `Asia/Ho_Chi_Minh`.
- **BR-24:** Ẩn phim không hủy suất chiếu, booking hoặc vé; vé `CONFIRMED` của suất chưa kết thúc vẫn có giá trị sử dụng.
- **BR-25:** Không đổi `release_date` sang ngày muộn hơn nếu còn suất `SCHEDULED` chưa kết thúc bắt đầu trước ngày mới; không tự dời/xóa suất.
- **BR-26:** Suất chiếu mới phải bắt đầu sau thời điểm hiện tại ít nhất 10 phút, thống nhất với cutoff đặt vé.

Các mã BR-23…BR-26 là **đề xuất**, chưa có trong tài liệu gốc; cần ban quản lý thay đổi chấp nhận trước khi đưa vào SRS/SDD.

### 6.4. Điều chỉnh ước lượng so với kế hoạch

| Hạng mục kế hoạch | Ước lượng kế hoạch (người-ngày) | Ước lượng sau phân tích | Ghi chú |
|---|---|---|---|
| P5 – HC-01 | 2,0 | 2,5 | Thêm bảo vệ `MovieService.update` và test biên |
| P6 – HC-02 | 3,5 | 4,5 | Thêm endpoint `hide-impact`, modal, DTO, test N+1 |
| P7 – HC-03 | 1,5 | 2,0 | Thêm test biên và stubbing `DatabaseTime` |
| P8 – Kiểm thử/hồi quy | 2,0 | 2,0 | Giữ nguyên |
| **Tổng P5–P8** | **9,0** | **11,0** | Kế hoạch tổng 16 người-ngày vẫn có thể giữ nếu các mục khác không đổi; cần cập nhật khi chốt |

Khuyến nghị: cập nhật kế hoạch lên phiên bản 1.1 sau khi CR được duyệt, không tự sửa bản 1.0 đã phát hành.

---

## 7. Truy vết

| CR | Nguồn yêu cầu | Quy tắc/UC liên quan | SRS dự kiến | Thiết kế dự kiến | Test case | Trạng thái |
|---|---|---|---|---|---|---|
| HC-01 | Đề xuất gốc mục 3; kế hoạch 7.1 | UC-02, BR-01/02/20, `movies.release_date` | REQ-HC01 | DES-HC01 | HC01-T01…T12 | Draft – D-01/D-04 đã chốt |
| HC-02 | Đề xuất gốc mục 4; kế hoạch 7.2 | UC-08, BR-19/20, API booking | REQ-HC02 | DES-HC02 | HC02-T01…T15 | Draft – D-05/D-06/D-07 đã chốt |
| HC-03 | Rà soát mã nguồn; kế hoạch 7.3 | UC-02, BR-08, `DatabaseTime` | REQ-HC03 | DES-HC03 | HC03-T01…T10 | Draft – D-02/D-03 đã chốt |

RTM đầy đủ sẽ được cập nhật khi SRS/SDD/test case được chốt. Không đánh dấu “đã đạt” khi chưa có kết quả thực thi.

---

## 8. Kết luận và kiến nghị

1. **HC-01:** cần thiết và có căn cứ mã nguồn; **đề nghị PA3**, D-01/D-04 đã chốt.
2. **HC-02:** không xác nhận được việc “mất vé”; vấn đề thực tế là thiếu thông tin/điều hướng và thiếu cảnh báo admin. **Đề nghị PA3** với phạm vi đã thu hẹp, giữ nguyên hành vi ẩn khỏi public; D-05/D-06/D-07 đã chốt.
3. **HC-03:** cần thiết để đủ tối thiểu 03 yêu cầu hiệu chỉnh và để thống nhất quy tắc thời gian; **đề nghị PA3**, D-02/D-03 đã chốt.
4. **Thứ tự:** HC-03 → HC-01 → HC-02 để giảm xung đột.
5. **Không** tự hủy/dời suất, không hoàn tiền, không mở lại bán vé cho phim `HIDDEN`.
6. **Trước khi code:** baseline đã commit (`79c7178`); D-01…D-07 đã chốt; cập nhật kế hoạch lên 1.1; tạo SRS/SDD/test case tương ứng; ký phiếu phê duyệt CR.
7. **Sau khi code:** chạy test thực tế, ghi kết quả kèm commit và minh chứng; không ghi Pass cho test chưa chạy.

---

## 9. Phụ lục

### 9.1. Bằng chứng mã nguồn rút gọn

**`ShowtimeService.validateSchedule()` – không kiểm tra `releaseDate`/`now`:**

```java
private void validateSchedule(ShowtimeRequest request, Movie movie) {
    Instant starts = request.startsAt();
    Instant ends = request.endsAt();
    if (starts.isBefore(MIN_TIME) || starts.isAfter(MAX_TIME) || ends.isAfter(MAX_TIME)
            || !ends.isAfter(starts) || ends.isBefore(starts.plus(movie.getDurationMinutes(), ChronoUnit.MINUTES))
            || ends.plus(request.cleanupMinutes(), ChronoUnit.MINUTES).isAfter(MAX_TIME)
            || request.basePrice().add(request.vipSurcharge()).compareTo(MAX_PRICE) > 0) {
        throw new AppException(ErrorCode.SCHEDULE_INVALID, "...");
    }
    if (starts.getNano() % 1_000_000 != 0 || ends.getNano() % 1_000_000 != 0) {
        throw new AppException(ErrorCode.VALIDATION_ERROR, "...");
    }
}
```

**`BookingSummaryResponse` – thiếu thông tin rạp/trạng thái/`endsAt`:**

```java
public record BookingSummaryResponse(Long bookingId, String bookingCode, BookingStatus status,
        BookingStatus effectiveStatus, String movieTitle, Instant startsAt,
        BigDecimal totalAmount, Instant createdAt, Instant expiresAt) { }
```

**`DateTimePicker` – không có giới hạn ngày tối thiểu:**

- Component nhận `value`, `onChange`, `error`, `disabled`; không có prop `min`/`minDateTime`.

### 9.2. Kết quả kiểm tra baseline (frontend)

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npm run build` | Pass | Còn cảnh báo chunk > 500 kB |
| `npm run test` | Pass | 26 tệp, 196 test |
| `npm run lint` | Pass | 03 cảnh báo, 0 lỗi |

Backend `mvnw test`: **Not Run – Blocked** do Docker/Testcontainers không hoạt động tại thời điểm lập hồ sơ. Không dùng kết quả frontend thay cho backend.

### 9.3. Ghi chú trích xuất tài liệu thiết kế

- Bản trích xuất: `maintenance_docs/nguon/thiet-ke-he-thong-dat-ve-xem-phim.md`.
- Hình ảnh/biểu đồ trong `.docx` không được trích xuất; cần mở tệp gốc khi viết SDD.
- Tài liệu gốc tự mô tả là “tài liệu thiết kế đề xuất phục vụ học tập”, không phải đặc tả as-built.
- Sai lệch Vue 3/React và số bảng cần được ghi rõ trong SDD, không tự sửa tài liệu gốc.
