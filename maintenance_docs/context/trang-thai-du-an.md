# TRẠNG THÁI DỰ ÁN – KẾT XUẤT CONTEXT LÀM VIỆC

**Dự án:** Cinema – hệ thống đặt vé xem phim  
**Học phần:** Bảo trì phần mềm – CT244  
**Ngày cập nhật:** 25/11/2026  
**Mục đích:** lưu lại trạng thái, quyết định, bằng chứng và việc tiếp theo để có thể tiếp tục làm việc giữa các phiên mà không phải dựng lại bối cảnh.

> Tệp này là **ghi chú làm việc**, không phải tài liệu nộp chính thức. Khi có mâu thuẫn, mã nguồn tại commit đang chạy và kết quả lệnh thực tế là nguồn có thẩm quyền; không ghi “Pass” cho nội dung chưa chạy.

---

## 1. Trạng thái nhanh

| Thuộc tính | Giá trị |
|---|---|
| Nhánh | `main` |
| Commit gốc trước ổn định | `3f61df03ed51c6a745ceb1ad11f2dfbae2d7fc23` – Merge PR #7 |
| Commit baseline hiện tại | `79c71788c5b6f2defdb2d1be59253ad0662f2166` – `chore: stabilize baseline after PR #7` |
| Thời điểm commit baseline | 25/11/2026 20:54:58 +07:00 |
| Khoảng pull gần nhất | `5100f5e..3f61df0` (fast-forward, không xung đột) |
| Trạng thái git | Baseline đã commit; tài liệu mới chưa được theo dõi (commit riêng) |
| Mã nguồn HC-01/02/03 | **Chưa triển khai** |
| Tài liệu kế hoạch | Đã có – v1.0 |
| Tài liệu phân tích tác động | Đã lập v0.2; D-01…D-07 và phạm vi HC-03 đã chốt; chờ ký phê duyệt CR |

### Tệp baseline đã commit (`79c7178`)

| Tệp | Loại thay đổi |
|---|---|
| `frontend/src/features/cinemas/components/CinemaCard.tsx` | Khôi phục nút “Phòng chiếu” gọi `onSelectCinema` |
| `frontend/src/pages/AdminRoomsPage.tsx` | Bỏ import `ShieldAlert`, `Building2` không dùng |
| `frontend/src/pages/HomePage.tsx` | Bỏ biến `totalElements` không dùng |
| `frontend/src/test/movie-hero-banner.test.tsx` | Cập nhật đường dẫn banner `.webp` |

Các thay đổi baseline **không phải** yêu cầu bảo trì HC-01/02/03 và đã được tách commit để không lẫn với lịch sử HC.

### Tài liệu mới chưa commit

| Tệp | Vai trò |
|---|---|
| `maintenance_docs/ke-hoach-bao-tri-hieu-chinh.md` | Kế hoạch bảo trì hiệu chỉnh v1.0 |
| `maintenance_docs/phan-tich-tac-dong-hieu-chinh.md` | Hồ sơ phân tích tác động v0.2 |
| `maintenance_docs/context/trang-thai-du-an.md` | Tệp này |
| `maintenance_docs/nguon/thiet-ke-he-thong-dat-ve-xem-phim.md` | Bản trích xuất tài liệu thiết kế gốc |

---

## 2. Kết quả kiểm tra thực tế

**Thời điểm chạy:** 25/11/2026, sau khi pull và ổn định baseline.  
**Phạm vi:** frontend tại thư mục `frontend/`.

| Lệnh | Kết quả | Ghi chú |
|---|---|---|
| `npm run build` | **Pass** | Vite build thành công; còn cảnh báo chunk > 500 kB |
| `npm run test` | **Pass** | 26 tệp, 196 test |
| `npm run lint` | **Pass** | 03 cảnh báo, 0 lỗi |

**Trước khi ổn định baseline:**

| Lệnh | Kết quả ban đầu | Nguyên nhân |
|---|---|---|
| `npm run build` | **Fail** – 04 lỗi TS6133 | Biến/import không dùng trong `CinemaCard.tsx`, `AdminRoomsPage.tsx`, `HomePage.tsx` |
| `npm run test` | **Fail** – 03/196 test | Thiếu nút “Phòng chiếu”; đường dẫn banner cũ |
| `npm run lint` | **Pass** với cảnh báo | Cảnh báo fast-refresh, biến không dùng, `featuredCount` |

**Backend:**

- `.\mvnw.cmd test`: **Not Run – Blocked**.
- Lý do: Docker Desktop/Testcontainers không hoạt động; `docker info` báo không kết nối được daemon.
- Không dùng kết quả frontend thay cho backend. Khi Docker sẵn sàng, chạy lại và ghi kết quả thực tế.

---

## 3. Việc đã hoàn thành

1. Pull mã nguồn mới nhất bằng `git pull --ff-only origin main`; fast-forward, không xung đột.
2. Khảo sát baseline, phát hiện build/test fail do thay đổi upstream.
3. Ổn định baseline bằng 04 chỉnh sửa nhỏ, không liên quan nghiệp vụ HC.
4. Đọc đề bài, đề xuất bảo trì hiệu chỉnh và mẫu tài liệu của môn học.
5. Xác minh nguyên nhân gốc HC-01, HC-02 trong mã nguồn.
6. Rà soát và đề xuất HC-03 để đáp ứng tối thiểu 03 yêu cầu hiệu chỉnh.
7. Lập `maintenance_docs/ke-hoach-bao-tri-hieu-chinh.md`.
8. Trích xuất tài liệu thiết kế gốc sang Markdown để tra cứu.
9. Đối chiếu tài liệu thiết kế gốc với mã nguồn as-built; ghi nhận sai lệch Vue 3/React.
10. Chốt D-01…D-07 theo đề xuất và xác nhận HC-03 thuộc phạm vi (25/11/2026).
11. Commit riêng phần ổn định baseline: `79c7178`.

---

## 4. Quyết định đã chốt (trong phạm vi kế hoạch)

| Mã | Quyết định |
|---|---|
| Q-01 | Máy chủ là nơi quyết định cuối cùng; mọi kiểm tra nghiệp vụ phải làm lại ở backend |
| Q-02 | So sánh ngày nghiệp vụ theo `Asia/Ho_Chi_Minh`, lưu UTC |
| Q-03 | Ẩn phim (`HIDDEN`) chỉ ngừng hiển thị/bán mới; **không** tự hủy suất chiếu, booking hoặc vé |
| Q-04 | Thay đổi API theo hướng bổ sung (thêm trường DTO/endpoint), không đổi nghĩa trường cũ |
| Q-05 | Không tự động xóa/dời dữ liệu lịch sử; chỉ báo cáo và xử lý theo nghiệp vụ |
| Q-06 | Mỗi HC có nhánh, commit, PR, test và tiêu chí nghiệm thu riêng |
| Q-07 | Không mở lại bán vé cho phim `HIDDEN` |
| Q-08 | Giữ nguyên quyền ADMIN/STAFF/CUSTOMER và quyền sở hữu booking/vé |
| Q-09 | Test chưa chạy ghi `Not Run`; bị chặn ghi `Blocked`; không ghi Pass giả định |

## 5. Quyết định D-01…D-07 đã chốt (25/11/2026)

Các quyết định dưới đây đã được nhóm xác nhận theo đề xuất trong hồ sơ phân tích tác động. Việc ký phiếu phê duyệt CR chính thức vẫn là bước riêng.

| Mã | Nội dung | Quyết định |
|---|---|---|
| D-01 | Phim chưa có `releaseDate` có được lập lịch? | **Không**; yêu cầu bổ sung ngày khởi chiếu trước |
| D-02 | Thời gian dẫn tối thiểu của HC-03 | **10 phút**, đồng bộ cutoff đặt vé |
| D-03 | HC-03 có thuộc phạm vi bảo trì hiệu chỉnh? | **Có** |
| D-04 | Đổi `releaseDate` khi có suất vi phạm | **Chặn** cập nhật; không tự dời/xóa suất |
| D-05 | Cảnh báo ẩn phim | **Bắt buộc xác nhận** khi có cam kết hiệu lực |
| D-06 | Bổ sung `movieStatus`/`showtimeStatus` vào DTO booking | **Có**; chỉ trả cho chủ đơn/ADMIN |
| D-07 | Index cho truy vấn `hide-impact` | **Chỉ thêm nếu đo thấy chậm**; migration riêng |

**Không còn quyết định kỹ thuật mở.** Còn chờ: ký phiếu phê duyệt CR (Mẫu 2.4) và chạy backend test khi Docker/Testcontainers sẵn sàng.

---

## 6. Bản đồ tài liệu

| Tài liệu | Vai trò | Trạng thái |
|---|---|---|
| `maintenance_docs/ke-hoach-viet-tai-lieu-bao-tri.md` | Hướng dẫn/mẫu tài liệu của môn học | Nguồn tham khảo |
| `maintenance_docs/quy-trinh-tai-lieu.md` | Thứ tự và quy trình viết 05 tài liệu | Nguồn tham khảo |
| `maintenance_docs/De-xuat-bao-tri-hieu-chinh.md` | Đề xuất gốc HC-01, HC-02 | Đã đọc |
| `maintenance_docs/ke-hoach-bao-tri-hieu-chinh.md` | Kế hoạch bảo trì hiệu chỉnh | Đã lập v1.0 |
| `maintenance_docs/phan-tich-tac-dong-hieu-chinh.md` | Hồ sơ 04 biểu mẫu cho HC-01/02/03 | Đã lập v0.2; chờ ký phê duyệt |
| `maintenance_docs/nguon/thiet-ke-he-thong-dat-ve-xem-phim.md` | Bản trích xuất tài liệu thiết kế gốc | Đã tạo |
| `maintenance_docs/admin-revenue-statistics-plan.md` | Kế hoạch tính năng báo cáo doanh thu (tham khảo) | Có sẵn |
| `maintenance_docs/tom-tat-auto-showtime-scheduling-plan.md` | Kế hoạch tự động xếp lịch (tham khảo) | Có sẵn |

---

## 7. Bản đồ mã nguồn trọng yếu

### HC-01 – Suất chiếu trước ngày khởi chiếu

| Thành phần | Tệp |
|---|---|
| Kiểm tra lịch | `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java` (`validateSchedule`, `movieForSchedule`, `create`, `update`) |
| DTO yêu cầu | `backend/src/main/java/com/example/cinema/showtime/dto/ShowtimeRequest.java` |
| Truy vấn suất theo phim | `backend/src/main/java/com/example/cinema/showtime/repository/ShowtimeRepository.java` |
| Cập nhật phim | `backend/src/main/java/com/example/cinema/catalog/service/MovieService.java` (`update`, `apply`) |
| Form suất chiếu | `frontend/src/pages/AdminShowtimeFormPage.tsx` |
| Chọn ngày giờ | `frontend/src/shared/components/ui/DateTimePicker.tsx` |
| Kiểu dữ liệu phim | `frontend/src/features/movies/types/movie.types.ts` |

### HC-02 – Ẩn phim và thông tin đơn/vé

| Thành phần | Tệp |
|---|---|
| Truy vấn đơn | `backend/src/main/java/com/example/cinema/booking/service/BookingQueries.java` |
| DTO tóm tắt | `backend/src/main/java/com/example/cinema/booking/dto/BookingSummaryResponse.java` |
| DTO chi tiết | `backend/src/main/java/com/example/cinema/booking/dto/BookingDetailResponse.java` |
| Vé | `backend/src/main/java/com/example/cinema/ticket/service/TicketQueries.java` |
| Check-in | `backend/src/main/java/com/example/cinema/ticket/service/CheckinTransactions.java` |
| Quản trị phim | `backend/src/main/java/com/example/cinema/catalog/controller/AdminMovieController.java` |
| Chi tiết phim công khai | `frontend/src/pages/MovieDetailsPage.tsx` |
| Vé của tôi | `frontend/src/pages/MyTicketsPage.tsx` |
| Chi tiết đơn | `frontend/src/pages/BookingDetailPage.tsx` |
| Thanh toán thành công | `frontend/src/pages/BookingSuccessPage.tsx` |
| Form phim admin | `frontend/src/features/movies/components/admin/AdminMovieForm.tsx` |

### HC-03 – Suất chiếu trong quá khứ/sát giờ

| Thành phần | Tệp |
|---|---|
| Kiểm tra lịch | `ShowtimeService.validateSchedule()` |
| Thời gian DB | `backend/src/main/java/com/example/cinema/common/time/DatabaseTime.java` |
| Test hiện có | `backend/src/test/java/com/example/cinema/showtime/service/ShowtimeServiceTest.java` |
| Chọn ngày giờ | `frontend/src/shared/components/ui/DateTimePicker.tsx` |
| Form suất chiếu | `frontend/src/pages/AdminShowtimeFormPage.tsx` |

---

## 8. Tài liệu thiết kế gốc và sai lệch cần lưu ý

**Nguồn:** `G:\.shortcut-targets-by-id\11aB0S7HWNAWo7oMgTuqKDI6i-nyROzrJ\Cinema\thiet_ke_he_thong_dat_ve_xem_phim.docx` (đường dẫn đầy đủ ghi trong bản trích xuất).  
**Phiên bản:** 1.0 – 03/11/2026.  
**Tính chất:** tài liệu thiết kế đề xuất phục vụ học tập, không phải đặc tả as-built.

**Nội dung liên quan:**

- BR-02: chống trùng phòng theo khoảng `[starts_at, ends_at + cleanup_minutes)`.
- BR-08: không đặt vé khi đã quá 10 phút trước giờ chiếu.
- BR-19: không xóa vật lý dữ liệu đã có giao dịch.
- BR-20: không đổi phòng/ghế/lịch chiếu nếu ảnh hưởng đơn hiện có.
- UC-02: tạo/sửa lịch chiếu; bước 2 chỉ ghi “kiểm tra thời gian hợp lệ”, chưa nêu quy tắc `releaseDate`.
- `movies.release_date` cho phép `NULL`; trạng thái `UPCOMING/SHOWING/ENDED/HIDDEN`.
- `showtimes.status`: `SCHEDULED/CANCELLED/COMPLETED`.

**Sai lệch với mã nguồn hiện tại:**

| Điểm | Tài liệu thiết kế | Mã nguồn as-built |
|---|---|---|
| Frontend | Vue 3 | React 19 + TypeScript + Vite |
| Số bảng | 11 bảng | Có thêm migration/bảng phát sinh (V4–V7); cần đối chiếu khi viết SDD |
| Quy tắc release date | Không có | Cũng chưa có → HC-01 là lỗ hổng nghiệp vụ |
| Quy tắc suất chiếu quá khứ | Không nêu rõ | Cũng chưa có → HC-03 là lỗ hổng nghiệp vụ |
| Hành vi ẩn phim | Không nêu rõ | Ẩn khỏi public nhưng không hủy vé; thiếu thông tin giải thích → HC-02 |

**Kết luận:** dùng tài liệu thiết kế gốc để tham chiếu nghiệp vụ và truy vết, nhưng **mã nguồn là nguồn as-built**. Khi viết SDD, cần ghi rõ sai lệch và không âm thầm sửa tài liệu gốc.

---

## 9. Rủi ro và lưu ý

- **Không commit lẫn** thay đổi baseline với thay đổi HC.
- **Không sửa file không liên quan**; giữ nguyên route admin/customer, API, phân quyền và CRUD.
- HC-01 và HC-03 cùng sửa `ShowtimeService.validateSchedule()` và `DateTimePicker` → dễ xung đột nhánh; làm tuần tự hoặc thống nhất điểm chèn.
- HC-01 và HC-02 cùng chạm `MovieService.update()` → thống nhất thứ tự kiểm tra.
- Test backend phụ thuộc Docker/Testcontainers; nếu môi trường không có Docker, ghi `Blocked`, không suy diễn kết quả.
- Tài liệu thiết kế gốc ghi Vue 3 nhưng mã nguồn dùng React; không dùng tài liệu gốc để suy ra chi tiết UI as-built.
- Không đưa khóa Cloudinary/JWT/DB vào tài liệu hoặc kho mã.

---

## 10. Việc tiếp theo

| Thứ tự | Việc | Đầu ra | Trạng thái |
|---|---|---|---|
| 1 | Commit riêng phần ổn định baseline | Commit `79c7178` | **Hoàn tất** |
| 2 | Hoàn tất hồ sơ phân tích tác động HC-01/02/03 | 04 biểu mẫu/CR, so sánh phương án | **Hoàn tất bản 0.2** |
| 3 | Chốt D-01…D-07 và phạm vi HC-03 | Quyết định ngày 25/11/2026 | **Hoàn tất** |
| 4 | Ký phiếu phê duyệt CR | Mẫu 2.4 cho HC-01/02/03 | Chờ |
| 5 | Cập nhật SRS | REQ-HC01/02/03 | **Hoàn tất draft v0.1** (`dac-ta-yeu-cau-bao-tri.md`) |
| 6 | Cập nhật SDD | DES-HC01/02/03 | **Hoàn tất draft v0.1** (`thiet-ke-phan-mem-bao-tri.md`) |
| 7 | Kế hoạch/test case HC | HC01/02/03 + hồi quy | **Hoàn tất draft v0.1** (`tai-lieu-kiem-thu-bao-tri.md`, tất cả Not Run/Blocked) |
| 8 | Triển khai + test thực tế | Code HC-03→HC-01→HC-02, kết quả thực thi | Chưa |
| 8 | Kiểm thử hồi quy, báo cáo, slide | Kết quả thực tế | Chưa |

---

## 11. Lệnh chạy lại kiểm tra

```powershell
cd "F:\HOC TAP\Bao tri phan mem\Project2\Cinema\frontend"
npm run build
npm run test
npm run lint

cd "..\backend"
.\mvnw.cmd test   # cần Docker/Testcontainers
```

Ghi kèm: commit, thời điểm, người chạy, số test pass/fail/skip, log/ảnh minh chứng.

---

## 12. Lịch sử cập nhật

| Ngày | Nội dung |
|---|---|
| 25/11/2026 | Tạo tệp; ghi nhận baseline, kết quả kiểm tra, quyết định và việc tiếp theo |
| 25/11/2026 | Chốt D-01…D-07; xác nhận HC-03 thuộc phạm vi; commit baseline `79c7178`; hoàn tất phân tích tác động v0.2 |
| 25/11/2026 | Tạo SRS v0.1, SDD v0.1, test plan v0.1 cho HC-01/02/03; cập nhật kế hoạch bảo trì v1.1; chưa triển khai HC code |
