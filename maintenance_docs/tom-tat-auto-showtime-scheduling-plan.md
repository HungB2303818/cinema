# Tóm tắt kế hoạch tạo suất chiếu tự động

**Tài liệu nguồn:** `maintenance_docs/auto-showtime-scheduling-plan.md`  
**Trạng thái:** Kế hoạch đề xuất, chưa triển khai.  
**Loại bảo trì:** **Bảo trì hoàn thiện**, vì bổ sung khả năng tự động hóa nghiệp vụ lập lịch đang thực hiện thủ công.

## 1. Mục tiêu

Bổ sung chức năng tự động tạo suất chiếu theo kế hoạch do quản trị viên cấu hình, nhằm:

- Giảm thao tác tạo từng suất chiếu.
- Duy trì lịch chiếu cho các ngày sắp tới.
- Hạn chế trùng lịch và bỏ sót thời gian dọn phòng.
- Giúp quản trị viên theo dõi kết quả, phát hiện những ngày chưa sinh được lịch.

## 2. Các chức năng chính

| Chức năng | Mô tả |
|---|---|
| **Quản lý kế hoạch lịch chiếu** | Tạo, chỉnh sửa, bật hoặc tạm dừng kế hoạch cho từng phòng. Cấu hình khoảng ngày, thứ trong tuần, giờ hoạt động, thời gian dọn phòng, giá vé và danh sách phim ưu tiên. |
| **Tự động tạo suất hằng ngày** | Mặc định chạy lúc **00:30 giờ Việt Nam**, tạo lịch cho khoảng **7 ngày, gồm hôm nay và 6 ngày tiếp theo**. Có thể chạy bổ sung khi hệ thống khởi động. |
| **Sinh lịch theo yêu cầu** | Nút **“Sinh ngay”** cho phép quản trị viên bổ sung lịch trong khoảng tối đa **31 ngày**, thuộc thời gian hiệu lực của kế hoạch. |
| **Tự phân bổ phim vào giờ trống** | Xếp phim lần lượt, xoay vòng theo thứ tự ưu tiên; xét thời lượng phim, thời gian dọn phòng và lịch đã có. |
| **Theo dõi kết quả** | Hiển thị số suất đã tạo, số khung bị bỏ qua, lỗi và lý do theo từng ngày. |
| **Nhận biết nguồn tạo suất** | Đánh dấu suất được tạo tự động và xác định kế hoạch đã sinh ra suất đó. |

## 3. Cách thực hiện tổng quan

Quy trình vận hành gồm năm bước:

1. **Quản trị viên thiết lập kế hoạch:** chọn phòng, thời gian áp dụng, khung giờ hoạt động, phim và giá vé.
2. **Hệ thống kiểm tra điều kiện:** kế hoạch đang bật, rạp/phòng hoạt động, có ghế và có phim đủ điều kiện.
3. **Xác định khoảng thời gian còn trống:** giữ nguyên các suất đã có và tính cả thời gian dọn phòng.
4. **Phân bổ và tạo suất:** chọn phim phù hợp với khoảng trống; nếu khung không sử dụng được thì bỏ qua và tiếp tục.
5. **Ghi nhận kết quả:** quản trị viên xem nhật ký, kiểm tra lịch và chủ động sinh bổ sung khi cần.

Suất được tạo tự động sẽ được quản lý, bán vé và chỉnh sửa theo các quy tắc chung như suất tạo thủ công.

## 4. Các nguyên tắc cần bảo đảm

- Chỉ **ADMIN** được quản lý kế hoạch và yêu cầu sinh lịch.
- Không tạo suất chồng lấn với lịch đã có; phải tính cả thời gian dọn phòng.
- Không xếp phim **Ẩn** hoặc **Đã kết thúc**. Phim **Sắp chiếu** chỉ được xếp từ ngày khởi chiếu trở đi.
- Không sinh suất trong quá khứ hoặc trước mốc thời gian hiện tại cộng 10 phút.
- Chạy lại không tạo suất trùng; **“Sinh ngay”** chỉ bổ sung khoảng trống.
- Sửa hoặc tắt kế hoạch **không tự sửa, xóa hay hủy các suất đã sinh**, tránh ảnh hưởng khách đã đặt vé.

## 5. Phạm vi bảo trì và đánh giá kết quả

Hoạt động bảo trì sẽ bổ sung màn hình quản lý kế hoạch, cơ chế tạo lịch tự động, dữ liệu lưu kế hoạch và nhật ký; đồng thời kiểm thử khả năng chống trùng, điều kiện chọn phim và bảo toàn suất đã có.

**Kết quả mong đợi:** quản trị viên có thể cấu hình một lần để tạo nhiều suất hợp lệ, giảm công việc thủ công mà không ảnh hưởng lịch chiếu và giao dịch hiện hữu.

**Chưa thuộc phạm vi:** tối ưu phân bổ giữa nhiều phòng, giá vé động, xem trước lịch, khung giờ qua nửa đêm và tự động hủy suất đã sinh.
