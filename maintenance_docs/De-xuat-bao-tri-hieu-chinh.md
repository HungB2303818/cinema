# ĐỀ XUẤT BẢO TRÌ HIỆU CHỈNH HỆ THỐNG ĐẶT VÉ XEM PHIM

## 1. Mục đích và phạm vi

Tài liệu mô tả hai vấn đề cần hiệu chỉnh trong hệ thống:

1. Cho phép tạo suất chiếu diễn ra trước ngày khởi chiếu của phim.
2. Ẩn phim làm mất lịch chiếu công khai, gây hiểu nhầm cho khách đã đặt vé dù suất chiếu không bị hủy.

Mỗi vấn đề được trình bày theo hiện trạng, điều kiện tái hiện, tác động, căn cứ mã nguồn, hướng khắc phục và tiêu chí nghiệm thu.

**Cơ sở đánh giá:** đọc mã nguồn và nội dung trao đổi về nghiệp vụ. Chưa thực hiện tái hiện trực tiếp trên giao diện hoặc chạy kiểm thử cho các thay đổi đề xuất. Các kết quả kiểm thử trong tài liệu là kết quả mong đợi, không phải kết quả đã chạy.

**Phạm vi thực hiện của tài liệu:** đề xuất sửa lỗi; chưa thay đổi mã nguồn, API hoặc cơ sở dữ liệu.

## 2. Các nguyên tắc nghiệp vụ cần thống nhất

- Ngày khởi chiếu của phim là `releaseDate`; thời điểm bắt đầu suất chiếu là `startsAt`.
- Được phép lập lịch trước cho phim ở trạng thái **Sắp chiếu (`UPCOMING`)**, miễn là ngày diễn ra suất chiếu không sớm hơn ngày khởi chiếu.
- So sánh ngày suất chiếu với ngày khởi chiếu theo múi giờ Việt Nam (`Asia/Ho_Chi_Minh`), dù thời điểm được lưu bằng UTC.
- Trong phạm vi đề xuất này, không có ngoại lệ suất chiếu sớm. Nếu sau này cần suất chiếu sớm, phải bổ sung yêu cầu và quyền phê duyệt riêng.
- **Ẩn phim không đồng nghĩa với hủy suất chiếu hoặc hủy vé.** Phim có thể ngừng hiển thị để nhận đặt vé mới, nhưng các cam kết với khách đã đặt phải được bảo toàn.
- Không xóa dữ liệu lịch sử đặt vé, thanh toán hoặc vé đã phát hành để xử lý hai vấn đề này.
- Chỉ ADMIN có quyền cập nhật trạng thái phim và quản lý suất chiếu theo phân quyền hiện tại; không mở rộng quyền cho STAFF trong yêu cầu này.

## 3. HC-01 — Cho phép tạo suất chiếu trước ngày khởi chiếu của phim

### 3.1. Thông tin lỗi

| Thuộc tính | Nội dung |
|---|---|
| Mã lỗi | HC-01 |
| Nhóm bảo trì | Bảo trì hiệu chỉnh |
| Chức năng | Tạo và chỉnh sửa suất chiếu |
| Đối tượng trực tiếp | Quản trị viên |
| Đối tượng chịu ảnh hưởng | Khách hàng, bộ phận vận hành rạp |
| Mức ưu tiên đề xuất | Cao |

### 3.2. Mô tả hiện trạng

Form tạo suất chiếu cho phép chọn phim chưa khởi chiếu. Đây không phải lỗi nếu quản trị viên chỉ chuẩn bị lịch cho ngày khởi chiếu hoặc sau đó.

Vấn đề thực sự là hệ thống chưa kiểm tra quan hệ giữa ngày suất chiếu và ngày khởi chiếu. Vì vậy, quản trị viên có thể chọn phim có ngày khởi chiếu trong tương lai nhưng đặt suất vào một ngày sớm hơn ngày đó, nếu các điều kiện khác được đáp ứng.

Ví dụ phim có ngày khởi chiếu **20/12/2026**:

| Thao tác | Đánh giá nghiệp vụ |
|---|---|
| Tạo trước suất diễn ra ngày 21/12/2026 | Hợp lệ |
| Tạo suất diễn ra ngày 20/12/2026 | Hợp lệ |
| Tạo suất diễn ra ngày 15/12/2026 | Không hợp lệ trong phạm vi quy tắc đề xuất |

**Không khắc phục bằng cách loại bỏ toàn bộ phim UPCOMING khỏi danh sách chọn**, vì làm vậy sẽ cản trở nghiệp vụ lập lịch trước.

### 3.3. Điều kiện và các bước tái hiện

**Điều kiện:**

- Có tài khoản ADMIN.
- Có phim không bị ẩn, với `releaseDate` đã xác định, ví dụ 20/12/2026.
- Có rạp và phòng đang hoạt động, phòng có ghế hoạt động.
- Khoảng thời gian thử nghiệm không trùng suất khác trong phòng.

**Các bước:**

1. Đăng nhập bằng tài khoản ADMIN.
2. Mở **Quản lý suất chiếu → Tạo suất mới**.
3. Chọn phim có ngày khởi chiếu 20/12/2026.
4. Chọn phòng hợp lệ.
5. Chọn giờ bắt đầu vào ngày 15/12/2026; nhập giá vé và các thông tin hợp lệ khác.
6. Nhấn tạo suất chiếu.

**Hiện trạng theo mã nguồn:** chưa có kiểm tra ngày khởi chiếu để từ chối yêu cầu này.

**Kết quả mong đợi:** không lưu suất và hiển thị cảnh báo rõ ràng ngay tại trường ngày giờ.

### 3.4. Căn cứ mã nguồn

| Tệp | Nhận định |
|---|---|
| `frontend/src/pages/AdminShowtimeFormPage.tsx` | Danh sách phim chỉ loại `HIDDEN`; xử lý gửi form chưa đối chiếu giờ bắt đầu với `releaseDate`. |
| `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java` | `movieForSchedule()` chỉ chặn phim ẩn; `validateSchedule()` kiểm tra thời lượng, khoảng thời gian và giá nhưng chưa so sánh ngày khởi chiếu. Cả tạo và cập nhật suất đều gọi hàm này. |
| `backend/src/main/java/com/example/cinema/showtime/dto/ShowtimeRequest.java` | Có kiểm tra trường bắt buộc, giá và thời gian dọn phòng; không có kiểm tra chéo với ngày khởi chiếu của phim. |

### 3.5. Tác động

- Tạo lịch chiếu sai so với thông tin khởi chiếu đã công bố.
- Khách có thể nhìn thấy hoặc đặt vé vào suất không đúng lịch phát hành theo nghiệp vụ đã thống nhất.
- Phát sinh nhu cầu sửa lịch, giải thích hoặc xử lý các đơn đã đặt.
- Giao diện không cảnh báo sớm, khiến quản trị viên chỉ nhận ra sai sót sau khi lưu hoặc sau khi phát sinh đặt vé.

### 3.6. Hướng khắc phục

#### a. Hiệu chỉnh giao diện

- Hiển thị **ngày khởi chiếu** ngay khi chọn phim.
- Giới hạn ngày chọn tối thiểu theo ngày khởi chiếu nếu thành phần chọn ngày giờ hỗ trợ.
- Kiểm tra lại khi đổi phim, đổi ngày giờ và trước khi gửi form.
- Khi không hợp lệ, giữ nguyên dữ liệu đã nhập, đánh dấu trường ngày giờ và không gửi yêu cầu lưu.
- Vẫn cho phép chọn phim **Sắp chiếu** để tạo lịch hợp lệ trong tương lai.

**Thông báo đề xuất:**

> Không thể tạo suất chiếu trước ngày khởi chiếu 20/12/2026. Vui lòng chọn ngày chiếu từ 20/12/2026 trở đi.

#### b. Hiệu chỉnh xử lý nghiệp vụ

- Bổ sung kiểm tra vào luồng dùng chung cho cả tạo và cập nhật suất chiếu.
- Đọc `releaseDate` từ dữ liệu phim tại máy chủ, không tin ngày do giao diện tự gửi.
- Chuyển `startsAt` sang ngày Việt Nam rồi áp dụng quy tắc:

```text
ngày_suất_chiếu = startsAt theo Asia/Ho_Chi_Minh

nếu releaseDate có giá trị và ngày_suất_chiếu < releaseDate:
    từ chối lưu suất chiếu
```

- Trả lỗi nghiệp vụ có thông báo cụ thể; có thể sử dụng mã `SCHEDULE_INVALID` hiện có để hạn chế thay đổi hợp đồng API.
- Giữ nguyên các kiểm tra phòng, ghế, trùng lịch, thời lượng và bảo vệ suất đã có booking.
- Với phim chưa có `releaseDate`, không tự suy đoán ngày. Cần chốt chính sách trước khi triển khai; đề xuất yêu cầu bổ sung ngày khởi chiếu trước khi cho lập lịch.

#### c. Rà soát dữ liệu và thay đổi liên quan

- Lập danh sách các suất hiện có diễn ra trước ngày khởi chiếu; không tự động xóa hoặc dời các suất đã có khách đặt.
- Kiểm tra tác động khi quản trị viên thay đổi ngày khởi chiếu của phim. Không để thao tác đổi ngày tạo ra các suất vi phạm mà không có cảnh báo hoặc cơ chế kiểm soát.
- Các trường hợp đã bán vé cần được xử lý riêng theo quyết định nghiệp vụ; không nằm trong việc tự động hiệu chỉnh dữ liệu của yêu cầu này.

### 3.7. Kiểm thử và tiêu chí nghiệm thu

| Mã kiểm thử | Tình huống | Kết quả mong đợi |
|---|---|---|
| HC01-T01 | Phim UPCOMING, suất diễn ra sau ngày khởi chiếu | Cho phép lưu nếu các điều kiện khác hợp lệ. |
| HC01-T02 | Suất diễn ra đúng ngày khởi chiếu | Cho phép lưu. |
| HC01-T03 | Suất diễn ra trước ngày khởi chiếu | Từ chối lưu, hiện thông báo có ngày khởi chiếu. |
| HC01-T04 | Sửa một suất đủ điều kiện chỉnh sửa sang ngày trước khởi chiếu | Từ chối cập nhật, dữ liệu cũ không bị thay đổi. |
| HC01-T05 | Gửi yêu cầu trực tiếp, bỏ qua kiểm tra giao diện | Máy chủ vẫn từ chối suất trước ngày khởi chiếu. |
| HC01-T06 | Suất lúc 00:30 ngày khởi chiếu theo giờ Việt Nam, tương ứng ngày UTC trước đó | Cho phép lưu; không so sánh nhầm theo ngày UTC. |
| HC01-T07 | Chọn phim A, nhập ngày hợp lệ, sau đó đổi sang phim B có ngày khởi chiếu muộn hơn | Kiểm tra lại ngày và cảnh báo nếu không còn hợp lệ. |
| HC01-T08 | Phim HIDDEN hoặc phòng không đủ điều kiện | Vẫn bị chặn theo quy tắc hiện có. |

**Điều kiện nghiệm thu:** giao diện và máy chủ cùng chặn suất trước ngày khởi chiếu, nhưng không làm mất khả năng lập lịch trước cho phim sắp chiếu.

## 4. HC-02 — Ẩn phim làm mất lịch chiếu, gây hiểu nhầm cho khách đã đặt vé

### 4.1. Thông tin lỗi

| Thuộc tính | Nội dung |
|---|---|
| Mã lỗi | HC-02 |
| Nhóm bảo trì | Bảo trì hiệu chỉnh thông tin và hành trình sử dụng |
| Chức năng | Ẩn phim, xem lịch chiếu, xem đơn và vé đã đặt |
| Đối tượng trực tiếp | Khách đã đặt vé; quản trị viên thực hiện ẩn phim |
| Mức ưu tiên đề xuất | Trung bình; nâng lên cao nếu kiểm thử phát hiện khách không thể xem đơn hoặc vé đã thanh toán. |

### 4.2. Mô tả hiện trạng

Theo nghiệp vụ đã trao đổi, quản trị viên ẩn phim nhưng không hủy các suất chiếu của phim đó. Tuy nhiên, phim và lịch chiếu liên quan không còn xuất hiện ở giao diện công khai. Khách đã đặt quay lại tìm lịch có thể hiểu nhầm rằng buổi chiếu đã bị hủy hoặc vé không còn sử dụng được.

**Điểm cần phân biệt:**

- Việc loại phim HIDDEN khỏi danh sách công khai không tự nó là lỗi.
- Vấn đề cần hiệu chỉnh là giao diện chưa giải thích rõ cho khách đã đặt, trong khi lịch chiếu vẫn diễn ra và quyền sử dụng vé phải được giữ nguyên.
- Mã nguồn hiện tại vẫn cho phép chủ đơn truy cập thông tin booking và vé qua các chức năng dành riêng cho họ. Chưa có căn cứ kết luận ẩn phim làm mất hoặc xóa vé.
- Yêu cầu này không bắt buộc đưa phim ẩn trở lại danh sách bán vé công khai.

### 4.3. Điều kiện và các bước tái hiện

**Điều kiện:**

- Có phim đang hiển thị và có suất chiếu chưa kết thúc.
- Khách đã đặt và thanh toán thành công, được phát hành vé.
- Suất chiếu vẫn giữ nguyên, không bị hủy.

**Các bước:**

1. Khách đăng nhập, đặt và thanh toán vé cho một suất chiếu.
2. ADMIN chuyển phim sang trạng thái **Ẩn (`HIDDEN`)**.
3. Khách quay lại danh sách phim, lịch chiếu hoặc đường dẫn công khai đã lưu để kiểm tra buổi chiếu.
4. Kiểm tra nội dung thông báo, khả năng chuyển về đơn đã đặt và thông tin hiển thị trong **Vé của tôi**.

**Hiện trạng cần kiểm chứng trên giao diện:** phim và lịch liên quan không còn được truy cập như trước; trang công khai có thể báo không tìm thấy hoặc phim đã bị ẩn nhưng không giải thích tình trạng vé của khách.

**Kết quả mong đợi:** khách hiểu rõ phim chỉ ngừng hiển thị để nhận đặt vé mới; vẫn kiểm tra được lịch của mình, xem được vé và không bị dẫn đến kết luận sai rằng suất đã bị hủy.

### 4.4. Căn cứ mã nguồn

| Tệp | Nhận định |
|---|---|
| `backend/src/main/java/com/example/cinema/catalog/service/MovieService.java` | Danh sách công khai loại HIDDEN; `getPublic()` trả không tìm thấy với phim HIDDEN. `update()` chưa kiểm tra booking trước khi đổi trạng thái. |
| `backend/src/main/java/com/example/cinema/showtime/service/ShowtimeService.java` | `publicMovie()` và `seatMap()` chặn truy cập công khai khi phim HIDDEN; đây không phải thao tác hủy suất. |
| `backend/src/main/java/com/example/cinema/booking/service/BookingQueries.java` | Tra cứu lịch sử và chi tiết đơn theo người dùng, không từ chối chỉ vì phim bị ẩn. |
| `backend/src/main/java/com/example/cinema/ticket/service/TicketQueries.java` | Chủ đơn có thể lấy vé của booking CONFIRMED; không kiểm tra HIDDEN để vô hiệu hóa vé. |
| `backend/src/main/java/com/example/cinema/ticket/service/CheckinTransactions.java` | Check-in kiểm tra booking, vé, thời gian và suất hủy; không chặn chỉ vì phim bị ẩn. |
| `frontend/src/pages/MovieDetailsPage.tsx` | Thông báo không tìm thấy gộp trường hợp phim không tồn tại và phim bị ẩn; chưa giải thích riêng quyền lợi khách đã đặt. |
| `frontend/src/pages/MyTicketsPage.tsx`, `frontend/src/pages/BookingDetailPage.tsx`, `frontend/src/pages/BookingSuccessPage.tsx` | Là các màn hình cần duy trì hành trình xem đơn, lịch và vé cho khách đã đặt. |

### 4.5. Tác động

- Khách không tìm lại được lịch qua đường dẫn quen thuộc và lo ngại vé đã mua mất giá trị.
- Tăng yêu cầu hỗ trợ, xác minh lịch chiếu hoặc hoàn tiền do hiểu nhầm.
- Thiếu nhất quán giữa thông tin công khai và thông tin trong đơn của khách.
- Làm giảm sự tin tưởng dù giao dịch và suất chiếu thực tế vẫn được giữ nguyên.

### 4.6. Hướng khắc phục

#### a. Tách rõ ý nghĩa các trạng thái trên giao diện

- **Ẩn phim:** ngừng hiển thị phim để khách mới khám phá và tạo đơn mới.
- **Suất chiếu vẫn diễn ra:** tiếp tục thực hiện các cam kết với khách đã đặt.
- **Hủy suất chiếu:** là một hành vi nghiệp vụ riêng, không được suy ra chỉ từ trạng thái HIDDEN của phim.
- Không dùng nhãn hoặc thông báo khiến khách hiểu “phim bị ẩn” là “vé đã bị hủy”.

#### b. Bảo đảm thông tin cho khách đã đặt

- Giữ thông tin buổi chiếu trong **Vé của tôi**, **Chi tiết đơn** và trang vé: tên phim, rạp, phòng, ngày giờ, ghế và trạng thái đơn.
- Nếu dữ liệu trả về hiện chưa đủ, bổ sung tối thiểu thông tin rạp và dấu hiệu phim đang bị ẩn trong DTO dành cho chủ đơn. Không yêu cầu giao diện gọi API chi tiết phim công khai để dựng thông tin vé.
- Với đơn CONFIRMED của phim bị ẩn nhưng suất vẫn hợp lệ, hiển thị thông báo:

> Phim hiện không còn hiển thị để đặt vé mới. Suất chiếu của bạn vẫn diễn ra theo lịch; vé đã thanh toán vẫn có giá trị sử dụng.

- Chỉ hiển thị nội dung này khi trạng thái suất và thời gian còn phù hợp; không áp dụng cho suất đã hủy hoặc đã kết thúc.
- Với đơn PENDING còn hạn, hiển thị thông báo riêng rằng khách có thể tiếp tục thanh toán trong thời gian giữ ghế còn lại theo hành vi hiện tại; không gọi đó là vé đã mua hoặc đã phát hành.
- Với đơn EXPIRED hoặc CANCELLED, hiển thị đúng trạng thái, không thông báo rằng vé còn giá trị.
- Không gắn nhãn “Hợp lệ” cố định nếu chưa xác định được tình trạng sử dụng vé; có thể dùng “Đã phát hành” cho trạng thái phát hành.

#### c. Hiệu chỉnh hành trình truy cập lại lịch chiếu

- Từ đơn đã đặt, dẫn khách tới thông tin buổi chiếu thuộc đơn, không buộc họ đi qua trang phim công khai đã bị ẩn.
- Khi khách mở đường dẫn công khai không còn khả dụng, cung cấp hướng dẫn trung tính và liên kết **Vé của tôi** để kiểm tra đơn.
- Không công khai thông tin booking hoặc vé chỉ vì người truy cập biết ID phim/suất. Thông tin dành riêng cho chủ đơn phải tiếp tục yêu cầu đăng nhập và kiểm tra quyền sở hữu.

**Thông báo dự phòng đề xuất cho trang công khai:**

> Nội dung này hiện không còn hiển thị công khai. Nếu bạn đã đặt vé, vui lòng đăng nhập và vào “Vé của tôi” để kiểm tra thông tin suất chiếu.

Thông báo dự phòng không tự khẳng định suất của người truy cập vẫn diễn ra khi chưa xác minh được đơn và trạng thái thực tế.

#### d. Cảnh báo cho quản trị viên trước khi ẩn

- Khi phim còn suất chưa kết thúc có đơn PENDING còn hạn hoặc đơn CONFIRMED, hiển thị cảnh báo trước khi xác nhận.
- Giải thích tác động: ngừng nhận đặt vé mới, không tự động hủy suất hoặc vé; đơn giữ ghế còn hạn được xử lý theo chính sách hiện tại.
- Không cấm ẩn chỉ vì phim có bất kỳ lịch sử booking nào; các suất đã kết thúc không phải lý do để ngăn thao tác này.

**Thông báo đề xuất:**

> Phim đang có suất chiếu chưa kết thúc đã phát sinh đặt vé. Ẩn phim chỉ ngừng hiển thị và nhận đặt vé mới, không hủy suất chiếu hoặc vé đã phát hành. Bạn có muốn tiếp tục?

#### e. Giới hạn thay đổi

- Giữ nguyên hiệu lực booking, vé và lịch sử thanh toán; không tự động hủy hoặc hoàn tiền khi ẩn phim.
- Không mở lại quyền tạo đơn mới cho phim HIDDEN chỉ để giải quyết vấn đề hiển thị.
- Không dùng thao tác ẩn phim để thay thế quy trình hủy suất chiếu.
- Quy trình hủy suất, thông báo hủy và hoàn tiền là yêu cầu riêng, ngoài phạm vi tài liệu này.
- Nếu cần thêm dữ liệu hiển thị, ưu tiên mở rộng DTO từ dữ liệu hiện có; chưa có cơ sở yêu cầu thêm bảng hoặc thay đổi schema.

### 4.7. Kiểm thử và tiêu chí nghiệm thu

| Mã kiểm thử | Tình huống | Kết quả mong đợi |
|---|---|---|
| HC02-T01 | Ẩn phim có đơn CONFIRMED cho suất chưa kết thúc | Đơn và vé không bị hủy; khách vẫn xem đầy đủ lịch của mình. |
| HC02-T02 | Chủ đơn xem chi tiết sau khi phim bị ẩn | Có thông báo phân biệt ngừng hiển thị với hủy chiếu, nếu suất vẫn hợp lệ. |
| HC02-T03 | Khách mở lại liên kết phim công khai đã lưu | Có hướng dẫn về Vé của tôi, không khẳng định sai rằng vé bị hủy. |
| HC02-T04 | Khách chưa đặt tìm phim HIDDEN hoặc gửi yêu cầu tạo booking mới | Phim vẫn không được bán công khai; không tạo được booking mới. |
| HC02-T05 | Check-in vé đã thanh toán của phim bị ẩn trong thời gian hợp lệ | Được check-in nếu các điều kiện khác hợp lệ. |
| HC02-T06 | Booking PENDING còn hạn khi phim bị ẩn | Thông báo đúng tình trạng giữ chỗ; vẫn có thể thanh toán theo chính sách hiện tại. |
| HC02-T07 | Booking EXPIRED hoặc CANCELLED | Không hiển thị thông báo khẳng định vé còn giá trị. |
| HC02-T08 | Một khách khác truy cập đơn hoặc vé không thuộc mình | Vẫn bị từ chối; không lộ thông tin riêng tư. |
| HC02-T09 | ADMIN ẩn phim còn suất có booking hiệu lực | Có cảnh báo và yêu cầu xác nhận đúng nội dung. |
| HC02-T10 | Phim chỉ có booking thuộc suất đã kết thúc | Không bị cấm ẩn chỉ vì có lịch sử booking. |
| HC02-T11 | Suất đã hủy hoặc kết thúc | Không hiện thông báo “vẫn diễn ra theo lịch” hoặc nhãn “Hợp lệ” một cách mặc định. |

**Điều kiện nghiệm thu:** ẩn phim không làm khách mất khả năng theo dõi đơn và lịch của mình; giao diện phân biệt được phim ngừng hiển thị với suất bị hủy, đồng thời vẫn giữ cơ chế phân quyền và ngừng bán hiện tại.

## 5. Kế hoạch thực hiện đề xuất

| Giai đoạn | Nội dung | Đầu ra mong muốn |
|---|---|---|
| 1. Xác nhận và tái hiện | Chốt quy tắc ngày khởi chiếu, trường hợp thiếu ngày, chính sách đơn giữ ghế khi ẩn; tái hiện trên dữ liệu thử. | Biên bản hiện trạng, ảnh trước sửa, dữ liệu và bước tái hiện. |
| 2. Phân tích tác động | Rà soát form suất chiếu, kiểm tra máy chủ, cập nhật phim, luồng xem đơn và vé. | Danh sách tệp, API và kiểm thử bị ảnh hưởng; đối chiếu ID yêu cầu/quy tắc nghiệp vụ hiện có trước khi triển khai. |
| 3. Hiệu chỉnh HC-01 | Bổ sung kiểm tra ngày tại giao diện và máy chủ; xem xét tác động khi đổi ngày khởi chiếu. | Không lưu được suất trước ngày khởi chiếu theo quy tắc đã duyệt. |
| 4. Hiệu chỉnh HC-02 | Bổ sung thông báo, thông tin buổi chiếu và điều hướng từ đơn; cảnh báo trước khi ẩn. | Khách theo dõi được vé, lịch và hiểu đúng tác động của việc ẩn phim. |
| 5. Kiểm thử và nghiệm thu | Chạy các ca đề xuất và hồi quy các luồng có liên quan. | Kết quả thực chạy, ảnh sau sửa, danh sách lỗi còn lại nếu có. |

### Yêu cầu hồi quy chung

- Không làm thay đổi quy tắc giữ ghế, thời hạn thanh toán và ngừng nhận giữ ghế trước giờ chiếu.
- Không ảnh hưởng khả năng chống bán trùng ghế, tính nguyên tử của booking và tính idempotent của thanh toán.
- Không làm thay đổi giá của đơn đã tạo hoặc xóa lịch sử giao dịch.
- Không cho phép sửa suất đã có booking trái với ràng buộc hiện tại.
- Tiếp tục kiểm tra quyền ADMIN, STAFF và quyền sở hữu booking/vé.
- Ghi rõ lệnh kiểm thử và kết quả thực tế khi triển khai; không coi kiểm thử chưa chạy hoặc bị bỏ qua là đã đạt.

## 6. Tổng kết yêu cầu sửa

**HC-01:** chặn suất diễn ra trước ngày khởi chiếu, không chặn việc lập lịch trước cho phim sắp chiếu.

**HC-02:** giữ phim ẩn khỏi kênh bán công khai nhưng bảo toàn thông tin buổi chiếu, đơn và vé cho khách đã đặt; giải thích rõ rằng ẩn phim không phải hủy suất chiếu.
