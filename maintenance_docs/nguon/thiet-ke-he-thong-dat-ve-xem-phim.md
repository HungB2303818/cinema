# Tài liệu thiết kế hệ thống đặt vé xem phim – bản trích xuất

> **Nguồn gốc:** `G:\.shortcut-targets-by-id\11aB0S7HWNAWo7oMgTuqKDI6i-nyROzrJ\Cinema\thiet_ke_he_thong_dat_ve_xem_phim.docx`
> **Phiên bản tài liệu gốc:** 1.0 – ngày 03/11/2026 (theo trang bìa).
> **Mục đích:** bản trích xuất văn bản và bảng để tra cứu nhanh trong kho mã; **không thay thế** tệp `.docx` gốc.
> **Phương pháp:** đọc `word/document.xml` bằng Python, giữ tiêu đề, đoạn văn và bảng; hình ảnh/biểu đồ không được trích xuất.
> **Lưu ý:** tài liệu gốc tự mô tả là “tài liệu thiết kế đề xuất phục vụ học tập”, không phải đặc tả as-built. Mã nguồn hiện tại dùng React + TypeScript, trong khi tài liệu ghi Vue 3; xem mục đối chiếu trong `maintenance_docs/phan-tich-tac-dong-hieu-chinh.md`.

TÀI LIỆU PHÂN TÍCH & THIẾT KẾ HỆ THỐNG

HỆ THỐNG QUẢN LÝ
VÀ ĐẶT VÉ XEM PHIM TRỰC TUYẾN

Cinema Booking System  •  Software Design Specification

ĐỒ ÁN MÔN HỌC  |  JAVA SPRING BOOT

Phiên bản 1.0  •  Ngày 03/11/2026
Phạm vi: MVP cho một cụm rạp, có khả năng mở rộng nhiều cụm rạp
Database: MySQL 8.0.16+  •  Frontend: Vue 3

Tài liệu thiết kế đề xuất phục vụ học tập.
Không phải đặc tả của một hệ thống rạp chiếu phim đang vận hành.

# Thông tin tài liệu

| Trường | Giá trị |
|---|---|
| Tên tài liệu | Phân tích nghiệp vụ, thiết kế cơ sở dữ liệu và luồng hoạt động |
| Tên hệ thống | Cinema Booking System |
| Phiên bản | 1.0 – Thiết kế MVP cho đồ án môn học |
| Kiến trúc | Modular Monolith; REST API; Spring Boot |
| Công nghệ | Java, Spring Security, Spring Data JPA, MySQL 8, Vue 3, Docker |
| Đơn vị thời gian | Lưu UTC trong cơ sở dữ liệu, hiển thị Asia/Ho_Chi_Minh |
| Giả định | Thanh toán mô phỏng; một cụm rạp trước khi mở rộng |

# Mục lục nội dung

> • 1. Tổng quan, mục tiêu và phạm vi

> • 2. Tác nhân và phân quyền

> • 3. Mô hình nghiệp vụ và các quy tắc

> • 4. Danh sách ca sử dụng (Use Cases)

> • 5. Luồng hoạt động chi tiết

> • 6. Trạng thái và vòng đời dữ liệu

> • 7. Thiết kế cơ sở dữ liệu (ERD, từ điển dữ liệu)

> • 8. Ràng buộc và chiến lược nhất quán dữ liệu

> • 9. Kiến trúc hệ thống và các module

> • 10. Đặc tả REST API

> • 11. Bảo mật, chất lượng và vận hành

> • 12. Kế hoạch kiểm thử và tiêu chí nghiệm thu

> • 13. Lộ trình thực hiện, giả định và rủi ro

> • Phụ lục A. Ví dụ request/response

> • Phụ lục B. Hướng dẫn triển khai SQL DDL

> Lưu ý: Mở Navigation Pane trong Microsoft Word để di chuyển bằng các Heading. Tài liệu SQL DDL đầy đủ đi kèm dưới tên cinema_booking_schema.sql.

# 1. Tổng quan, mục tiêu và phạm vi

## 1.1. Bài toán

Khách hàng cần tra cứu phim, lịch chiếu và đặt vé trực tuyến mà không phải đến quầy. Cụm rạp cần quản lý ghế, phòng, suất chiếu, thanh toán và việc kiểm soát vé tại cổng. Thách thức đặc trưng là nhiều khách hàng có thể chọn cùng một ghế trong cùng một thời điểm, trong khi mỗi ghế chỉ được bán một lần cho một suất chiếu.

## 1.2. Mục tiêu của hệ thống

- Cho phép khách hàng xem phim đang/sắp chiếu, chọn suất chiếu, xem sơ đồ ghế và đặt vé.

- Quản lý danh mục phim, cụm rạp, phòng, ghế và lịch chiếu, tránh xếp lịch trùng phòng.

- Giữ ghế tạm thời trong 5 phút và không bán trùng ghế khi truy cập đồng thời.

- Xử lý thanh toán mô phỏng, phát hành mã vé duy nhất và hỗ trợ nhân viên check-in.

- Bảo đảm dữ liệu đặt vé, ghế và thanh toán nhất quán; có unit/integration test minh chứng.

## 1.3. Phạm vi chức năng

| Trong phạm vi MVP | Ngoài phạm vi MVP |
|---|---|
| Một hoặc nhiều phòng trong một cụm rạp | Thanh toán ngân hàng, cổng thanh toán thực |
| Chọn ghế đơn/nhóm, giữ 5 phút | Khuyến mãi, combo bắp nước, tích điểm |
| Khách hàng, nhân viên, quản trị viên | Hoàn tiền và hủy vé đã thanh toán |
| Thanh toán giả lập, check-in mã vé | Định giá động, đặt chỗ theo nhóm lớn |
| Báo cáo cơ bản, logging, kiểm thử | Microservices, CDN, đa vùng, ứng dụng mobile |

## 1.4. Giả định và quy ước

- Khách hàng bắt buộc đăng nhập trước khi đặt vé; khách vãng lai chỉ xem phim/lịch chiếu.

- Mỗi booking gắn đúng một suất chiếu, có thể chứa nhiều vé tương ứng nhiều ghế.

- Không cho giữ ghế mới khi còn dưới 10 phút đến giờ chiếu; giữ ghế tối đa 5 phút.

- Giá STANDARD là giá cơ bản của suất chiếu; VIP cộng phụ phí VIP đã cấu hình.

- Không sửa cấu hình ghế/phòng nếu còn suất chiếu tương lai chịu ảnh hưởng.

- Chưa cho khách hủy booking đã CONFIRMED (quy trình hoàn tiền nằm ngoài MVP).

- Tất cả mốc thời gian vận hành sử dụng UTC khi lưu/xử lý; UI hiển thị giờ Việt Nam.

# 2. Tác nhân và phân quyền

| Tác nhân | Mô tả | Quyền chính |
|---|---|---|
| Guest | Chưa đăng nhập | Xem phim, danh sách suất chiếu, sơ đồ ghế (chỉ đọc). |
| Customer | Khách hàng có tài khoản | Tạo/hủy booking PENDING, thanh toán giả lập, xem vé/lịch sử của mình. |
| Staff | Nhân viên rạp | Tra cứu vé phục vụ check-in và ghi nhận check-in theo phạm vi được cấp. |
| Admin | Quản trị hệ thống | CRUD danh mục, tạo lịch chiếu, báo cáo, quản lý tài khoản. |
| Scheduler | Tác vụ hệ thống | Hết hạn booking, giải phóng ghế, đồng bộ trạng thái định kỳ. |

## 2.1. Ma trận quyền

| Chức năng | Guest | Customer | Staff | Admin |
|---|---|---|---|---|
| Tra cứu phim / suất chiếu | ✓ | ✓ | ✓ | ✓ |
| Tạo booking / giữ ghế | – | ✓ | – | – |
| Xem booking của chính mình | – | ✓ | – | ✓* |
| Thanh toán giả lập của mình | – | ✓ | – | – |
| Check-in vé | – | – | ✓ | ✓ |
| Quản lý phim/phòng/suất chiếu | – | – | – | ✓ |
| Xem báo cáo tổng hợp | – | – | – | ✓ |

> Lưu ý: Dấu *: quản trị viên tra cứu đơn phục vụ hỗ trợ theo yêu cầu nghiệp vụ; mọi truy cập cần được ghi audit log.

# 3. Mô hình nghiệp vụ và quy tắc

## 3.1. Thuật ngữ nghiệp vụ

| Thuật ngữ | Định nghĩa |
|---|---|
| Cinema | Một cụm rạp / địa điểm kinh doanh. |
| Room | Phòng chiếu thuộc một cụm rạp. |
| Seat | Ghế vật lý, xác định bằng hàng + số ghế, thuộc một phòng. |
| Showtime | Một lần chiếu cụ thể của một phim tại một phòng, có giờ và giá. |
| ShowtimeSeat | Bản ghi trạng thái bán/giữ của một ghế trong một suất chiếu. |
| Booking | Đơn đặt vé của một khách hàng cho một suất chiếu. |
| BookingSeat / Ticket | Chi tiết một ghế trong đơn, trở thành vé sau khi CONFIRMED. |
| Payment | Một lần thử thanh toán cho một đơn. |
| TicketCheckin | Xác nhận một vé được sử dụng tại cửa rạp. |

## 3.2. Quy tắc nghiệp vụ chi tiết (Business Rules)

| Mã | Quy tắc |
|---|---|
| BR-01 | Một suất chiếu thuộc đúng một phim và một phòng. |
| BR-02 | Hai suất chiếu cùng phòng không được trùng khoảng [bắt đầu, kết thúc + thời gian dọn phòng). |
| BR-03 | Một ghế vật lý là duy nhất theo (room_id, seat_row, seat_number). |
| BR-04 | Một showtime-seat là duy nhất theo (showtime_id, seat_id). |
| BR-05 | Ghế được đặt phải thuộc phòng chứa suất chiếu; không cho đặt ghế đang bảo trì. |
| BR-06 | Ghế AVAILABLE có thể được giữ; HELD còn hạn/BOOKED không thể cấp cho người khác. |
| BR-07 | Thời gian giữ ghế 5 phút, tính bằng đồng hồ hệ thống thống nhất (UTC). |
| BR-08 | Không cho đặt mới khi thời điểm hiện tại >= giờ bắt đầu suất chiếu - 10 phút. |
| BR-09 | Booking chỉ chứa ghế của một suất chiếu; số ghế phải >= 1 và không vượt giới hạn cấu hình (ví dụ 8). |
| BR-10 | Một yêu cầu đặt nhiều ghế là atomic: tất cả được giữ hoặc không ghế nào được giữ. |
| BR-11 | Thành tiền lưu snapshot giá của từng ghế; đơn giá không đổi nếu admin cập nhật giá sau đó. |
| BR-12 | Chỉ booking PENDING, chưa hết hạn, còn giữ đủ ghế mới được CONFIRMED. |
| BR-13 | Thanh toán giả lập thất bại có thể thử lại trước hạn; không phát hành vé. |
| BR-14 | Mỗi booking có tối đa một payment SUCCESS; cùng idempotency key chỉ xử lý một lần. |
| BR-15 | Booking hết hạn không thể xác nhận; cleanup chỉ giải phóng ghế đang thuộc booking hết hạn. |
| BR-16 | Khách chỉ được hủy booking PENDING do mình tạo; CONFIRMED không được hủy trong MVP. |
| BR-17 | Mỗi booking-seat sau CONFIRMED có mã vé ngẫu nhiên, duy nhất. |
| BR-18 | Mỗi vé chỉ được check-in một lần, trong khoảng từ trước giờ chiếu 30 phút đến hết giờ chiếu. |
| BR-19 | Không xóa vật lý dữ liệu đã có giao dịch; chỉ vô hiệu hóa hoặc đổi trạng thái. |
| BR-20 | Không cho thay đổi phòng/ghế/lịch chiếu khi thay đổi có thể ảnh hưởng đơn hiện có. |
| BR-21 | Chỉ admin có quyền tạo/sửa suất chiếu; staff chỉ có quyền nghiệp vụ check-in. |
| BR-22 | Báo cáo doanh thu dựa trên giao dịch SUCCESS, không cộng các lần thanh toán FAILED/PENDING. |

# 4. Danh sách ca sử dụng (Use Cases)

| Mã UC | Tên ca sử dụng | Tác nhân | Kết quả |
|---|---|---|---|
| UC-01 | Tra cứu phim và suất chiếu | Guest / Customer | Danh sách phim, suất, sơ đồ ghế |
| UC-02 | Tạo/sửa lịch chiếu | Admin | Lịch chiếu không trùng phòng |
| UC-03 | Tạo booking và giữ ghế | Customer | Booking PENDING / thông báo xung đột |
| UC-04 | Thanh toán mô phỏng | Customer | CONFIRMED và phát hành vé |
| UC-05 | Hủy booking chưa thanh toán | Customer | CANCELLED và trả ghế |
| UC-06 | Hết hạn booking tự động | Scheduler | EXPIRED và trả ghế |
| UC-07 | Check-in vé | Staff | Vé được đánh dấu đã sử dụng |
| UC-08 | Xem lịch sử & vé | Customer | Các booking và vé sở hữu |
| UC-09 | Xem báo cáo doanh thu | Admin | Tổng hợp giao dịch hợp lệ |

# 5. Luồng hoạt động chi tiết

## 5.1. Tổng thể quy trình đặt vé

*Hình 1. Luồng nghiệp vụ đặt vé từ chọn suất chiếu đến phát hành vé.*

## 5.2. UC-03 – Tạo booking và giữ ghế

| Thuộc tính | Đặc tả |
|---|---|
| Điều kiện trước | Customer đã đăng nhập; suất chiếu SCHEDULED, chưa đến cutoff đặt vé. |
| Đầu vào | showtimeId, seatIds (duy nhất, không rỗng), clientRequestId. |
| Điều kiện thành công | Tạo một booking PENDING, toàn bộ ghế HELD cùng booking, hết hạn sau 5 phút. |
| Điều kiện thất bại | Không phát sinh booking/giữ ghế khả dụng nửa chừng; trả lỗi phù hợp. |
| Tính nguyên tử | Toàn bộ nằm trong một database transaction. |

1.  Kiểm tra identity, trạng thái tài khoản và hợp lệ của dữ liệu (ghế trùng, rỗng, vượt 8 ghế).

2.  Kiểm tra clientRequestId: nếu yêu cầu giống hệt đã được xử lý, trả lại kết quả cũ; nếu key trùng nhưng payload khác, trả 409.

3.  Đọc suất chiếu và điều kiện thời gian; tính giá theo từng seat_type tại thời điểm tạo đơn.

4.  Mở transaction; lưu booking PENDING, hạn giữ; truy vấn showtime_seats cho từng ghế theo ID tăng dần và khóa bản ghi.

5.  Với ghế HELD đã quá hạn, cho phép thay thế người giữ (booking cũ vẫn không thể thanh toán và sẽ được scheduler hết hạn).

6.  Nếu bất kỳ ghế nào BOOKED/HELD còn hạn/không thuộc suất chiếu thì rollback toàn bộ.

7.  Cập nhật toàn bộ ghế thành HELD, current_booking_id = booking mới, hold_expires_at = expires_at; tạo các booking_seats với giá snapshot; tính total_amount.

8.  Commit và trả bookingId, bookingCode, tổng tiền, hạn giữ ghế.

> Lưu ý: Khi thực thi SELECT ... FOR UPDATE, tất cả luồng ghi phải dùng cùng thứ tự khóa: booking trước, ghế theo ID tăng dần. Cần xử lý deadlock bằng retry có giới hạn ở tầng service.

## 5.3. UC-04 – Thanh toán mô phỏng và phát hành vé

| Thuộc tính | Đặc tả |
|---|---|
| Điều kiện trước | Booking thuộc khách đang đăng nhập, trạng thái PENDING. |
| Đầu vào | bookingId, simulatedResult = SUCCESS/FAILED, idempotencyKey. |
| Thành công | Payment SUCCESS, booking CONFIRMED, showtime_seats BOOKED, tạo ticket_code. |
| Thất bại giả lập | Payment FAILED; booking vẫn PENDING nếu chưa hết hạn, có thể thử lại. |
| Thất bại do quá hạn | Booking EXPIRED và không phát hành vé. |

1.  Nhận yêu cầu thanh toán, xác thực chủ sở hữu booking; kiểm tra idempotencyKey để trả đúng kết quả khi client retry.

2.  Mở transaction; khóa booking theo ID, kiểm tra PENDING và expires_at lớn hơn thời gian UTC hiện tại.

3.  Khóa danh sách showtime_seats của booking theo ID tăng dần; xác minh mọi ghế đang HELD, current_booking_id đúng booking và chưa hết hạn.

4.  Nếu simulatedResult = FAILED: lưu payment FAILED, giữ booking PENDING; trả lỗi nghiệp vụ hoặc kết quả thất bại mô phỏng.

5.  Nếu SUCCESS: lưu payment SUCCESS, chuyển ghế sang BOOKED và xóa hold_expires_at; tạo ticket_code ngẫu nhiên cho từng booking_seat; cập nhật booking CONFIRMED và confirmed_at.

6.  Commit; trả booking_code, danh sách mã vé và trạng thái đã xác nhận.

Chống xử lý trùng: SQL có UNIQUE(idempotency_key) và unique generated-column cho phép tối đa một payment SUCCESS trên mỗi booking. Nếu thanh toán thành công được gửi lại, trả kết quả CONFIRMED hiện hữu thay vì phát hành vé mới.

## 5.4. UC-06 – Tự động hết hạn đơn

1.  Scheduler chạy định kỳ (đề xuất 30–60 giây) và đọc các booking PENDING có expires_at <= UTC_TIMESTAMP(3).

2.  Xử lý theo batch; khóa booking, sau đó khóa các ghế của booking theo thứ tự tăng dần.

3.  Chuyển booking sang EXPIRED; chỉ cập nhật sang AVAILABLE các showtime_seats hiện vẫn có current_booking_id bằng booking hết hạn.

4.  Xóa current_booking_id, hold_expires_at của ghế được giải phóng; commit.

5.  Nếu booking đã CONFIRMED hoặc ghế đã được người khác giữ hợp lệ, bỏ qua phần dữ liệu không còn thuộc quyền sở hữu của booking cũ.

Điều kiện hết hạn được quyết định theo thời gian trong database, không phụ thuộc scheduler chạy đúng giây thứ 300. Một ghế HELD quá hạn được coi là có thể đặt lại ngay cả khi scheduler chưa xử lý xong.

## 5.5. UC-05 – Hủy booking PENDING

1.  Customer gọi API hủy booking, server xác thực đúng chủ sở hữu.

2.  Khóa booking; chỉ cho hủy nếu trạng thái PENDING.

3.  Khóa và giải phóng các ghế hiện còn current_booking_id = booking được hủy.

4.  Đổi trạng thái CANCELLED và ghi thời điểm cập nhật; commit.

5.  Nếu đã CONFIRMED, trả 409 vì hoàn tiền ngoài MVP; nếu đã CANCELLED, có thể trả trạng thái hiện tại theo nguyên tắc idempotent.

## 5.6. UC-02 – Tạo suất chiếu, tránh trùng phòng

1.  Admin nhập movie, room, giờ bắt đầu, giá cơ bản, phụ phí VIP, phút dọn phòng.

2.  Server tính ends_at = starts_at + duration_minutes của phim; kiểm tra thời gian hợp lệ.

3.  Trong transaction: SELECT phòng FOR UPDATE để tuần tự hóa mọi thao tác xếp lịch trên cùng phòng.

4.  Kiểm tra giao nhau của các khoảng [starts_at, ends_at + cleanup_minutes) với các suất SCHEDULED hiện có của phòng.

5.  Nếu trùng thì trả 409; nếu không, tạo showtime và khởi tạo showtime_seats cho tất cả ghế ACTIVE của phòng.

6.  Commit. Không thay đổi ghế/lịch chiếu đã có booking PENDING/CONFIRMED.

Điều kiện trùng khoảng: new.start < existing.end_plus_cleanup AND existing.start < new.end_plus_cleanup. Độ dài khoảng sử dụng đơn vị phút, chuẩn hóa về UTC.

## 5.7. UC-07 – Check-in vé

1.  Staff đăng nhập, nhập/scan ticket_code.

2.  Khóa hoặc ghi transaction đối với booking_seat có ticket_code; kiểm tra booking CONFIRMED và suất chiếu chưa bị hủy.

3.  Kiểm tra khung thời gian check-in [starts_at - 30 phút, ends_at].

4.  Tạo ticket_checkins với staff_id, checked_in_at; UNIQUE(booking_seat_id) ngăn quét vé thành công hai lần.

5.  Trả tên phim, giờ chiếu, phòng, vị trí ghế và kết quả check-in.

## 5.8. UC-08/09 – Lịch sử và báo cáo

Lịch sử cá nhân truy vấn bookings theo userId xác thực, join showtimes, movies, booking_seats; hiển thị mã vé chỉ với booking CONFIRMED. Báo cáo admin tính doanh thu bằng SUM(payments.amount) với payments.status = SUCCESS, gộp theo ngày xác nhận thanh toán; có bộ lọc phim, suất, ngày và cụm rạp.

# 6. Trạng thái và vòng đời dữ liệu

## 6.1. Booking State Machine

*Hình 2. Các chuyển trạng thái của booking từ PENDING.*

| Trạng thái | Ý nghĩa | Cho phép chuyển tiếp |
|---|---|---|
| PENDING | Đơn đã tạo, đang giữ ghế / chờ thanh toán | CONFIRMED, EXPIRED, CANCELLED, FAILED |
| CONFIRMED | Thanh toán thành công, đã có vé | Trạng thái kết thúc trong MVP |
| EXPIRED | Quá hạn, không còn quyền giữ ghế | Trạng thái kết thúc |
| CANCELLED | Khách hủy trước xác nhận | Trạng thái kết thúc |
| FAILED | Lỗi nghiệp vụ không thể khôi phục, đã giải phóng ghế | Trạng thái kết thúc |

> Lưu ý: Một lần payment FAILED không đồng nghĩa booking FAILED: booking có thể tiếp tục PENDING để khách thử lại trong thời gian còn giữ ghế.

## 6.2. Trạng thái ghế theo suất chiếu

| Trạng thái | Điều kiện dữ liệu | Chuyển đổi |
|---|---|---|
| AVAILABLE | current_booking_id = NULL; hold_expires_at = NULL | AVAILABLE → HELD |
| HELD | current_booking_id != NULL; hold_expires_at != NULL | HELD → BOOKED / AVAILABLE / HELD (đã hết hạn) |
| BOOKED | current_booking_id != NULL; hold_expires_at = NULL | Trạng thái kết thúc trong MVP |

Ghế vật lý seats.status = MAINTENANCE không nên nhầm với trạng thái đặt của showtime_seats. Một ghế A1 ở suất chiếu 18:00 có thể BOOKED và đồng thời AVAILABLE ở suất chiếu 21:00.

# 7. Thiết kế cơ sở dữ liệu

## 7.1. Tổng quan thiết kế dữ liệu

Thiết kế logic gồm 11 bảng. Mỗi bảng có khóa chính BIGINT; khóa ngoại và chỉ mục được bổ sung theo đường truy cập. MySQL dùng InnoDB để hỗ trợ transaction và row-level locking. Tên trường và danh sách ràng buộc bên dưới khớp với file SQL DDL đi kèm.

| Nhóm | Bảng |
|---|---|
| Tài khoản | users |
| Danh mục | movies, cinemas, rooms, seats |
| Chiếu phim | showtimes, showtime_seats |
| Bán vé | bookings, booking_seats, payments |
| Kiểm soát vé | ticket_checkins |

### 7.1.1. Nguyên tắc thiết kế dữ liệu

- Phân biệt ghế vật lý (seats) với ghế có thể bán theo một suất chiếu (showtime_seats).

- Booking giữ nguyên dữ liệu lịch sử; booking_seats không bị xóa khi đơn hết hạn hoặc hủy.

- Giá bán được snapshot vào booking_seats.unit_price, không phụ thuộc giá hiển thị hiện tại.

- Mỗi ghế trong một suất có đúng một bản ghi showtime_seats; current_booking_id biểu thị chủ sở hữu hiện hành.

- Không dùng cờ isBooked chung ở bảng seats vì ghế được tái sử dụng ở nhiều suất chiếu.

| Suất chiếu | Ghế | Trạng thái | Đơn đang sở hữu |
|---|---|---|---|
| 101 – 19:00 | A1 | BOOKED | BK0001001 |
| 101 – 19:00 | A2 | HELD | BK0001002 |
| 102 – 21:30 | A1 | AVAILABLE | — |

## 7.2. ERD mức logic

*Hình 3. ERD logic: PK/FK và quan hệ chính của 11 bảng.*

> Lưu ý: Mũi tên đứt booking → showtime_seats biểu thị booking đang sở hữu ghế HELD hoặc BOOKED. booking_seats lưu lịch sử ghế của nhiều lần đặt, kể cả các lần đã hết hạn.

## 7.3. Từ điển dữ liệu chi tiết

### 7.3.1. users – Người dùng và phân quyền

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK, AUTO_INCREMENT | Định danh tài khoản |
| full_name | VARCHAR(150) | NOT NULL | Họ tên |
| email | VARCHAR(255) | UNIQUE, NOT NULL | Email đăng nhập |
| password_hash | VARCHAR(255) | NOT NULL | Mật khẩu đã hash |
| role | ENUM | NOT NULL | CUSTOMER/STAFF/ADMIN |
| status | ENUM | NOT NULL | ACTIVE/INACTIVE |
| created_at | DATETIME(3) | NOT NULL | UTC |

### 7.3.2. movies – Thông tin phim

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh phim |
| title | VARCHAR(255) | NOT NULL | Tên phim |
| description | TEXT | NULL | Giới thiệu |
| duration_minutes | SMALLINT UNSIGNED | > 0 | Thời lượng |
| genre | VARCHAR(100) | NULL | Thể loại |
| age_rating | VARCHAR(20) | NULL | Phân loại tuổi |
| release_date | DATE | NULL | Ngày phát hành |
| poster_url | VARCHAR(500) | NULL | Ảnh poster |
| status | ENUM | NOT NULL | UPCOMING/SHOWING/ENDED/HIDDEN |

### 7.3.3. cinemas – Cụm rạp

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh cụm rạp |
| name | VARCHAR(150) | NOT NULL | Tên cụm |
| address | VARCHAR(255) | NOT NULL | Địa chỉ |
| status | ENUM | NOT NULL | ACTIVE/INACTIVE |

### 7.3.4. rooms – Phòng chiếu

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh phòng |
| cinema_id | BIGINT | FK → cinemas | Thuộc cụm rạp |
| name | VARCHAR(50) | UNIQUE trong cinema | Tên phòng |
| status | ENUM | NOT NULL | ACTIVE/MAINTENANCE |

### 7.3.5. seats – Ghế vật lý trong phòng

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh ghế |
| room_id | BIGINT | FK → rooms | Phòng sở hữu |
| seat_row | VARCHAR(5) | NOT NULL | Hàng A/B/C |
| seat_number | SMALLINT UNSIGNED | > 0 | Số ghế |
| seat_type | ENUM | NOT NULL | STANDARD/VIP |
| status | ENUM | NOT NULL | ACTIVE/MAINTENANCE |

### 7.3.6. showtimes – Một suất chiếu cụ thể

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh suất chiếu |
| movie_id | BIGINT | FK → movies | Phim được chiếu |
| room_id | BIGINT | FK → rooms | Phòng chiếu |
| starts_at | DATETIME(3) | NOT NULL | UTC; giờ bắt đầu |
| ends_at | DATETIME(3) | > starts_at | UTC; giờ kết thúc |
| cleanup_minutes | SMALLINT UNSIGNED | DEFAULT 15 | Thời gian dọn phòng |
| base_price | DECIMAL(12,2) | >= 0 | Giá vé STANDARD |
| vip_surcharge | DECIMAL(12,2) | >= 0 | Phụ phí VIP |
| status | ENUM | NOT NULL | SCHEDULED/CANCELLED/COMPLETED |

### 7.3.7. bookings – Đơn đặt vé

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh đơn |
| booking_code | VARCHAR(32) | UNIQUE | Mã đơn hiển thị |
| user_id | BIGINT | FK → users | Khách đặt |
| showtime_id | BIGINT | FK → showtimes | Suất chiếu |
| client_request_id | VARCHAR(64) | UNIQUE theo user, NULL | Chống gửi lặp |
| status | ENUM | NOT NULL | PENDING/CONFIRMED/EXPIRED/CANCELLED/FAILED |
| total_amount | DECIMAL(12,2) | >= 0 | Tổng giá snapshot |
| expires_at | DATETIME(3) | NOT NULL | UTC; hạn giữ ghế |
| created_at | DATETIME(3) | NOT NULL | Ngày tạo UTC |
| updated_at | DATETIME(3) | NOT NULL | Cập nhật UTC |
| confirmed_at | DATETIME(3) | NULL | Ngày xác nhận |

### 7.3.8. showtime_seats – Trạng thái một ghế trong một suất chiếu

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh bản ghi |
| showtime_id | BIGINT | FK → showtimes | Suất chiếu |
| seat_id | BIGINT | FK → seats | Ghế vật lý |
| status | ENUM | NOT NULL | AVAILABLE/HELD/BOOKED |
| current_booking_id | BIGINT | FK → bookings, NULL | Booking đang giữ/sở hữu |
| hold_expires_at | DATETIME(3) | NULL | Hạn giữ (chỉ HELD) |
| version | BIGINT UNSIGNED | DEFAULT 0 | Phiên bản phục vụ concurrency |

### 7.3.9. booking_seats – Chi tiết ghế của một booking, dữ liệu lịch sử

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh chi tiết |
| booking_id | BIGINT | FK → bookings | Đơn |
| showtime_seat_id | BIGINT | FK → showtime_seats | Ghế trong suất |
| ticket_code | VARCHAR(48) | UNIQUE, NULL | Có khi xác nhận vé |
| unit_price | DECIMAL(12,2) | >= 0 | Giá tại thời điểm tạo đơn |

### 7.3.10. payments – Lịch sử các lần thanh toán

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh giao dịch |
| booking_id | BIGINT | FK → bookings | Đơn được thanh toán |
| method | ENUM | NOT NULL | MOCK/CASH |
| status | ENUM | NOT NULL | INITIATED/SUCCESS/FAILED |
| amount | DECIMAL(12,2) | >= 0 | Số tiền |
| idempotency_key | VARCHAR(64) | UNIQUE | Chống xử lý lặp |
| transaction_code | VARCHAR(100) | UNIQUE, NULL | Mã giao dịch |
| failure_reason | VARCHAR(255) | NULL | Lý do thất bại |
| paid_at | DATETIME(3) | NULL | Ngày thành công |
| created_at | DATETIME(3) | NOT NULL | Ngày tạo |
| successful_booking_id | BIGINT (generated) | UNIQUE khi SUCCESS | Giới hạn một SUCCESS / booking |

### 7.3.11. ticket_checkins – Lịch sử check-in từng vé

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| id | BIGINT | PK | Định danh check-in |
| booking_seat_id | BIGINT | FK, UNIQUE | Một vé check-in tối đa một lần |
| staff_id | BIGINT | FK → users | Nhân viên xác nhận |
| checked_in_at | DATETIME(3) | NOT NULL | Thời điểm xác nhận UTC |

## 7.4. Quan hệ, khóa và chỉ mục quan trọng

| Bảng | Constraint / index | Mục đích |
|---|---|---|
| seats | UNIQUE(room_id, seat_row, seat_number) | Không trùng mã ghế trong cùng phòng. |
| showtime_seats | UNIQUE(showtime_id, seat_id) | Không có hai bản ghi trạng thái cho một ghế/suất. |
| booking_seats | UNIQUE(booking_id, showtime_seat_id) | Không thêm cùng ghế hai lần vào một booking. |
| booking_seats | UNIQUE(ticket_code) | Mã vé không trùng; NULL trước CONFIRMED. |
| bookings | UNIQUE(user_id, client_request_id) | Chống gửi request tạo booking lặp. |
| payments | UNIQUE(idempotency_key) | Chống thanh toán trùng do retry. |
| payments | UNIQUE(successful_booking_id) (generated) | Tối đa một thanh toán SUCCESS/booking. |
| ticket_checkins | UNIQUE(booking_seat_id) | Chống check-in lần thứ hai. |
| bookings | INDEX(status, expires_at) | Tối ưu tìm booking hết hạn. |
| showtimes | INDEX(room_id, starts_at, ends_at) | Kiểm tra lịch chiếu xung đột. |

## 7.5. Các bất biến dữ liệu liên bảng

- booking_seats.showtime_seat_id phải thuộc đúng showtime_id của booking; không chỉ dựa vào FK đơn lẻ.

- showtime_seats.seat_id phải thuộc room_id của showtime; điều kiện này cần validate ở service hoặc dùng cơ chế ràng buộc bổ sung.

- SHOWTIME_SEAT BOOKED phải tham chiếu một booking CONFIRMED; HELD chỉ có ý nghĩa trước expires_at.

- Tổng bookings.total_amount bằng SUM(booking_seats.unit_price) tại thời điểm tạo đơn.

- Giá không bị tính lại khi xem lịch sử, kể cả nếu quản trị viên thay đổi base_price.

- Không có hai suất chiếu SCHEDULED chồng khoảng thời gian tại cùng một room.

- Mỗi ticket_checkins.booking_seat_id phải chỉ tới vé có booking CONFIRMED và còn trong khung giờ check-in.

> Lưu ý: Đa số bất biến liên bảng không thể được bảo đảm đầy đủ chỉ bằng CHECK và FOREIGN KEY thông thường. Service layer cùng transaction và integration tests là thành phần thiết yếu.

# 8. Chiến lược nhất quán và xử lý concurrency

## 8.1. Transaction boundary

| Giao dịch | Khóa và cập nhật nguyên tử | Cách xử lý lỗi |
|---|---|---|
| Tạo booking | Booking mới + các row showtime_seats + booking_seats | Rollback toàn bộ nếu bất kỳ ghế nào không hợp lệ. |
| Thanh toán thành công | Booking + showtime_seats + payment + ticket_code | Rollback và không phát hành vé nếu bị hết hạn/xung đột. |
| Hủy / hết hạn | Booking + đúng các ghế còn sở hữu | Giải phóng có điều kiện theo current_booking_id. |
| Tạo suất chiếu | Khóa room + kiểm tra khoảng thời gian + tạo showtime/seats | Rollback nếu lịch trùng hoặc khởi tạo ghế thất bại. |
| Check-in | Kiểm tra vé + insert duy nhất ticket_checkins | UNIQUE constraint ngăn check-in lặp. |

## 8.2. Kịch bản tranh chấp đồng thời

Hai khách A và B cùng chọn ghế A1 tại suất chiếu 19:00. Transaction A khóa showtime_seats row của ghế. Transaction B phải chờ. Sau khi A commit HELD, B kiểm tra thấy ghế HELD còn hạn và trả HTTP 409. Kết quả: chỉ một booking sở hữu quyền giữ ghế.

| BEGIN;<br>SELECT id, status, current_booking_id, hold_expires_at<br>FROM showtime_seats<br>WHERE id IN (501, 502)<br>ORDER BY id<br>FOR UPDATE;<br>-- Chỉ khi tất cả ghế AVAILABLE hoặc HELD đã hết hạn:<br>-- UPDATE các ghế thành HELD và gắn current_booking_id của booking mới.<br>-- INSERT booking_seats, cập nhật tổng tiền, COMMIT.<br>COMMIT; |
|---|

Có thể thay SELECT FOR UPDATE bằng conditional UPDATE và kiểm tra affected rows, nhưng không nên phối hợp thiếu kiểm soát giữa native SQL updates và entity state trong JPA. MVP đề xuất một chiến lược nhất quán: pessimistic row locks, transaction và unique constraints.

## 8.3. Xử lý hạn giữ ghế

Một booking có trạng thái PENDING nhưng expires_at đã qua được xem là hết hạn về mặt nghiệp vụ, ngay cả khi batch job chưa chạy. API thanh toán phải kiểm tra thời hạn trong transaction. API giữ ghế có thể giành ghế HELD quá hạn dưới khóa hàng; batch cleanup sau đó chuyển booking cũ thành EXPIRED mà không được giải phóng ghế đã chuyển sang booking khác.

## 8.4. Idempotency và khóa tuần tự

- Tạo booking dùng clientRequestId theo người dùng; cùng key/cùng payload trả cùng đơn, key trùng payload khác trả 409.

- Thanh toán dùng idempotencyKey; server không tạo payment SUCCESS lần hai khi client retry.

- Thứ tự khóa thống nhất: booking → showtime_seats theo ID tăng dần; riêng xếp lịch: room trước khi tạo showtime.

- Deadlock hoặc lock timeout được retry giới hạn, có jitter nhỏ và logging, không retry vô hạn.

- Không trả trạng thái CONFIRMED cho client trước khi transaction commit thành công.

# 9. Kiến trúc hệ thống và các module

## 9.1. Kiến trúc logic

| Vue 3 Web Client<br>\|<br>\| HTTPS + JWT<br>v<br>Spring Boot Modular Monolith<br>\|-- auth           : JWT, role, current user<br>\|-- catalog        : movies, cinemas, rooms, seats<br>\|-- showtime       : schedule, conflicts, showtime seats<br>\|-- booking        : holds, booking lifecycle, concurrency<br>\|-- payment        : simulated payments, idempotency<br>\|-- ticket         : ticket codes, check-in<br>\|-- reporting      : revenue & occupancy<br>\|-- jobs           : expire pending bookings<br>\|<br>v<br>MySQL 8 / InnoDB |
|---|

## 9.2. Gợi ý package Spring Boot

| com.example.cinema<br>auth/{controller,service,security,dto}<br>catalog/{controller,service,repository,entity,dto}<br>showtime/{controller,service,repository,entity,dto}<br>booking/{controller,service,repository,entity,dto}<br>payment/{controller,service,repository,entity,dto}<br>ticket/{controller,service,repository,entity,dto}<br>report/{controller,service,dto}<br>job/{scheduler}<br>common/{exception,config,util} |
|---|

## 9.3. Quy tắc thiết kế mã nguồn

- Controller chỉ xác thực request, chọn HTTP code và chuyển DTO; business rules đặt trong Service.

- Entity JPA không trả trực tiếp ra API; dùng DTO và MapStruct để tránh lazy loading, rò rỉ thông tin.

- Không cho client truyền userId chủ đơn; lấy từ JWT SecurityContext.

- Mọi phương thức ghi nhiều bảng được đánh dấu @Transactional và kiểm soát ngoại lệ nhất quán.

- Không lưu toàn bộ ghế trong Redis ở MVP; MySQL là source of truth cho số ghế đã bán.

- Scheduler dùng @Scheduled và query index; cân nhắc Quartz khi cần chạy phân tán trong tương lai.

# 10. Đặc tả REST API

## 10.1. Danh sách endpoint

| Method | Endpoint | Quyền | Mục đích |
|---|---|---|---|
| GET | /api/movies | Public | Danh sách phim, bộ lọc trạng thái |
| GET | /api/movies/{id} | Public | Chi tiết phim |
| GET | /api/movies/{id}/showtimes | Public | Lịch chiếu theo ngày |
| GET | /api/showtimes/{id}/seats | Public | Sơ đồ ghế và trạng thái hiệu lực |
| POST | /api/auth/register | Public | Đăng ký customer |
| POST | /api/auth/login | Public | Đăng nhập, JWT |
| POST | /api/bookings | Customer | Giữ ghế và tạo PENDING |
| GET | /api/bookings/me | Customer | Lịch sử đặt vé |
| GET | /api/bookings/{id} | Owner/Admin | Chi tiết đơn |
| POST | /api/bookings/{id}/cancel | Owner | Hủy đơn PENDING |
| POST | /api/bookings/{id}/payments/mock | Owner | Thanh toán mô phỏng |
| GET | /api/bookings/{id}/tickets | Owner/Admin | Danh sách vé đã phát hành |
| POST | /api/staff/tickets/check-in | Staff/Admin | Check-in một vé |
| POST | /api/admin/movies | Admin | Thêm phim |
| PUT | /api/admin/movies/{id} | Admin | Cập nhật phim |
| POST | /api/admin/rooms | Admin | Thêm phòng |
| POST | /api/admin/rooms/{id}/seats | Admin | Tạo sơ đồ ghế |
| POST | /api/admin/showtimes | Admin | Tạo suất chiếu và snapshot ghế |
| PUT | /api/admin/showtimes/{id} | Admin | Sửa suất khi chưa có booking |
| GET | /api/admin/reports/revenue | Admin | Doanh thu theo khoảng ngày |

## 10.2. Quy ước request/response

- Body JSON UTF-8; timestamp chuẩn ISO 8601 có Z hoặc offset trong API; server chuẩn hóa UTC.

- GET danh sách có page, size, sort; hạn chế size tối đa để bảo vệ database.

- POST tạo booking nhận clientRequestId; POST payment nhận idempotencyKey.

- Lỗi sử dụng JSON có code, message, timestamp, path và fieldErrors nếu validation thất bại.

- HTTP 400: dữ liệu sai; 401: chưa xác thực; 403: không đủ quyền; 404: không tìm thấy; 409: xung đột trạng thái/ghế/lịch; 422: quy tắc nghiệp vụ không đáp ứng.

## 10.3. Ví dụ tạo booking và xử lý lỗi

| POST /api/bookings<br>Authorization: Bearer <jwt><br>Content-Type: application/json<br>{<br>"showtimeId": 101,<br>"seatIds": [1, 2],<br>"clientRequestId": "6c1282ed-cbc3-4fb9-9017-0ea88953b1a4"<br>}<br>HTTP/1.1 201 Created<br>{<br>"bookingId": 1001,<br>"bookingCode": "BK0001001",<br>"status": "PENDING",<br>"totalAmount": 160000.00,<br>"expiresAt": "2026-11-10T11:35:00Z"<br>} |
|---|

| HTTP/1.1 409 Conflict<br>{<br>"code": "SEAT_UNAVAILABLE",<br>"message": "Một hoặc nhiều ghế không còn khả dụng.",<br>"timestamp": "2026-11-10T11:30:01Z",<br>"path": "/api/bookings"<br>} |
|---|

# 11. Bảo mật, chất lượng và vận hành

## 11.1. Bảo mật ứng dụng

- Hash mật khẩu bằng BCrypt hoặc Argon2; không lưu mật khẩu rõ hay đưa password_hash vào response.

- Spring Security với xác thực JWT, phân quyền theo role và kiểm tra ownership đối với booking.

- Không tin dữ liệu totalAmount/unitPrice do client gửi; tính lại trên server và lưu snapshot.

- Không đưa JWT, password, ticket_code hoặc PII nhạy cảm vào log công khai.

- Ticket_code nên là giá trị ngẫu nhiên không đoán được (ít nhất 128 bit entropy); staff phải xác thực khi check-in.

- Giới hạn số request đăng nhập/check-in/thanh toán mô phỏng; kiểm tra input, phân trang và validate dữ liệu.

- Không hard-code mật khẩu database/JWT secret trong Git; sử dụng biến môi trường hoặc secret manager.

## 11.2. Các yêu cầu phi chức năng (NFR)

| Mã | Yêu cầu đề xuất | Cách kiểm tra |
|---|---|---|
| NFR-01 | Không bao giờ có hai booking CONFIRMED cùng sở hữu một showtime_seat. | Integration test 20 request đồng thời. |
| NFR-02 | Đặt nhiều ghế đảm bảo all-or-nothing. | Test rollback khi 1 ghế BOOKED. |
| NFR-03 | Các endpoint xem danh sách có phân trang. | Test với tập dữ liệu lớn. |
| NFR-04 | API trả lỗi nhất quán, không lộ stacktrace. | Test 400/401/403/404/409. |
| NFR-05 | Thao tác ghi có log nghiệp vụ và request correlation ID. | Kiểm tra log và trace lỗi. |
| NFR-06 | DB có cơ chế sao lưu phục vụ demo / kiểm thử. | Thử restore database thử nghiệm. |
| NFR-07 | Chỉ hiển thị thời gian UTC sau khi đổi sang Asia/Ho_Chi_Minh. | Kiểm tra lệch +07:00. |
| NFR-08 | Các API đọc thông thường có mục tiêu p95 < 800ms trong môi trường demo. | Đo với kịch bản tải được ghi nhận. |

> Lưu ý: NFR-08 là mục tiêu đề xuất để kiểm thử, không phải số liệu hiệu năng đã được đo.

## 11.3. Triển khai MVP

Chạy ứng dụng Spring Boot, web frontend và MySQL qua Docker Compose (có thể tách frontend Vite build ra Nginx). Cấu hình biến môi trường cho DB URL, username, password, JWT secret, thời gian giữ ghế. Sử dụng Flyway hoặc Liquibase để quản lý migration, không dùng ddl-auto=update ở môi trường triển khai. Bắt buộc cấu hình timezone phiên MySQL là UTC (+00:00), vì mặc định CURRENT_TIMESTAMP theo timezone của session; đồng thời cấu hình JDBC/Hibernate theo UTC.

# 12. Kiểm thử và nghiệm thu

## 12.1. Ma trận kiểm thử nghiệp vụ

| Mã | Tình huống | Kỳ vọng | Quy tắc |
|---|---|---|---|
| TC-01 | Đặt một ghế AVAILABLE | Booking PENDING, ghế HELD 5 phút | BR-06/07 |
| TC-02 | Đặt ghế BOOKED | HTTP 409, không tạo đơn | BR-06 |
| TC-03 | Hai request đồng thời cùng một ghế | Chỉ một request giữ ghế thành công | BR-06/10 |
| TC-04 | Chọn 3 ghế, một ghế bị đặt | Rollback mọi cập nhật | BR-10 |
| TC-05 | Ghế HELD đã hết hạn, người khác giữ | Người mới giữ được, đơn cũ không xác nhận | BR-07/15 |
| TC-06 | Thanh toán trước hết hạn | Payment SUCCESS, vé được phát hành | BR-12/17 |
| TC-07 | Thanh toán sau hết hạn | Từ chối, không phát hành vé | BR-12/15 |
| TC-08 | Gửi lại idempotencyKey đã thành công | Trả trạng thái cũ, không phát hành vé mới | BR-14 |
| TC-09 | Hủy PENDING | CANCELLED, ghế giải phóng | BR-16 |
| TC-10 | Hủy CONFIRMED | 409, giữ nguyên dữ liệu | BR-16 |
| TC-11 | Tạo suất chiếu trùng phòng | 409, không tạo dữ liệu | BR-02 |
| TC-12 | Đặt ghế phòng khác | 400/422, không giữ ghế | BR-05 |
| TC-13 | Check-in vé hợp lệ | Một record ticket_checkins | BR-18 |
| TC-14 | Check-in cùng vé lần thứ hai | 409, không thêm record | BR-18 |
| TC-15 | Customer xem booking của user khác | 403 hoặc 404, không rò rỉ dữ liệu | BR-21 |
| TC-16 | Thanh toán FAILED rồi SUCCESS trước hạn | Giữ PENDING sau FAILED; CONFIRMED sau SUCCESS | BR-13 |

## 12.2. Kiểm thử concurrency

Sử dụng Testcontainers MySQL, Spring Boot integration test và ExecutorService/CountDownLatch để đồng bộ thời điểm bắt đầu 20 request giữ ghế A1. Kết quả mong đợi: đúng một booking PENDING sở hữu ghế; 19 request còn lại nhận lỗi nghiệp vụ; không có booking_seats mồ côi. Tương tự, chạy test thanh toán 10 request lặp idempotencyKey và xác nhận chỉ một payment SUCCESS.

## 12.3. Tiêu chí nghiệm thu

- Toàn bộ use case UC-01 đến UC-09 được thực hiện trong phạm vi MVP.

- Cơ sở dữ liệu tạo thành công bằng script DDL, FK và unique constraints hợp lệ.

- Có ERD và giải thích bảng showtime_seats trong báo cáo.

- Thực hiện được luồng hoàn chỉnh: tra phim → suất → ghế → PENDING → SUCCESS → ticket → check-in.

- Thử nghiệm được tình huống giữ ghế hết hạn, thanh toán trùng và đặt đồng thời.

- Có các unit test và integration test nghiệp vụ quan trọng; không phụ thuộc dữ liệu nhập bằng tay.

- Hệ thống triển khai chạy local qua Docker Compose và có hướng dẫn README.

# 13. Lộ trình, giả định và rủi ro

## 13.1. Lộ trình đề xuất 5 tuần

| Tuần | Hạng mục | Đầu ra |
|---|---|---|
| 1 | Phân tích, ERD, DDL, authentication, seed data | Thiết kế + DB + JWT |
| 2 | Quản lý phim, rạp, phòng, ghế, suất chiếu | CRUD danh mục + chống trùng lịch |
| 3 | Giữ ghế, booking, timeout, concurrency | Quy trình PENDING và tests |
| 4 | Thanh toán mô phỏng, vé, check-in, lịch sử | Luồng đặt vé đầy đủ |
| 5 | UI hoàn thiện, báo cáo, Docker, test và tài liệu | Demo + test report + README |

## 13.2. Rủi ro kỹ thuật và phương án giảm thiểu

| Rủi ro | Hậu quả | Biện pháp |
|---|---|---|
| Không khóa đồng thời | Bán trùng ghế | InnoDB transaction, row locks, test race. |
| Scheduler chậm | Ghế hiển thị HELD dù hết hạn | Kiểm tra expires_at theo giờ DB khi đọc/giữ/confirm. |
| DB và JVM lệch múi giờ | Sai thời điểm hết hạn | UTC cho persistence, offset trong API, test UTC+7. |
| Client gửi request lặp | Đơn/tiền ghi nhận trùng | Idempotency và UNIQUE keys. |
| Admin sửa lịch sau khi có vé | Sai phòng hoặc giờ chiếu | Khóa chỉnh sửa khi đã có booking. |
| Phạm vi đồ án phình to | Không hoàn thành | MVP trước, Redis/WebSocket/QR nâng cao sau. |

# Phụ lục A. Ví dụ dữ liệu và request/response

## A.1. Một suất chiếu và sơ đồ ghế

| showtimeId = 101<br>movie = "Phim mẫu"<br>room = "Phòng 01"<br>startsAt = "2026-11-10T12:00:00Z"  // 19:00 giờ Việt Nam<br>endsAt   = "2026-11-10T14:00:00Z"  // 21:00 giờ Việt Nam<br>basePrice = 75000<br>vipSurcharge = 20000<br>seat A1: AVAILABLE \| seat A2: HELD \| seat B1: BOOKED |
|---|

## A.2. Thanh toán mô phỏng

| POST /api/bookings/1001/payments/mock<br>{<br>"simulatedResult": "SUCCESS",<br>"idempotencyKey": "pay-1001-f61d0b1f-4b7e-4f80"<br>}<br>HTTP/1.1 200 OK<br>{<br>"bookingCode": "BK0001001",<br>"status": "CONFIRMED",<br>"paymentStatus": "SUCCESS",<br>"tickets": [<br>{ "seat": "A1", "ticketCode": "f2e42f..." },<br>{ "seat": "A2", "ticketCode": "e0a77c..." }<br>]<br>} |
|---|

## A.3. Check-in vé

| POST /api/staff/tickets/check-in<br>{ "ticketCode": "<random-ticket-code>" }<br>HTTP/1.1 200 OK<br>{<br>"result": "CHECKED_IN",<br>"movieTitle": "Phim mẫu",<br>"roomName": "Phòng 01",<br>"seatLabel": "A1",<br>"checkedInAt": "2026-11-10T11:40:00Z"<br>} |
|---|

# Phụ lục B. Hướng dẫn triển khai cơ sở dữ liệu

File SQL đi kèm: cinema_booking_schema.sql, gồm 11 lệnh CREATE TABLE theo thứ tự khóa ngoại, toàn bộ PK/FK/UNIQUE/CHECK/index và generated column bảo vệ một lần thanh toán thành công trên mỗi đơn. Chạy trên MySQL 8.0.16+ (phiên bản hỗ trợ CHECK được thực thi).

1.  Tạo schema bằng cách chạy file cinema_booking_schema.sql trên một MySQL 8.

2.  Tạo tài khoản DB quyền tối thiểu cho ứng dụng (SELECT/INSERT/UPDATE; không cấp DROP/ALTER trong runtime).

3.  Triển khai migration bằng Flyway hoặc Liquibase; không chỉnh cấu trúc thủ công sau khi đã phát sinh dữ liệu.

4.  Tạo seed dữ liệu: 1 rạp, 2 phòng, 30–50 ghế/phòng, 3 phim, 4 suất chiếu, 1 admin, 1 staff, 2 customer.

5.  Kiểm thử tính toàn vẹn FK/unique; sau đó chạy các integration tests với MySQL Testcontainers.

Các quyết định cần xác nhận trước khi nâng cấp production: chính sách hoàn tiền, cập nhật lịch chiếu khi đã bán vé, hỗ trợ nhiều rạp, lịch giá phức tạp, tích hợp thanh toán thật, quy trình đối soát và quy định lưu trữ dữ liệu.
