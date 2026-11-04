# Dữ liệu phim sắp chiếu (Crawl từ CGV)

Dữ liệu được cào trực tiếp từ trang Phim Sắp Chiếu của CGV Cinemas Việt Nam:
- **Nguồn:** [https://www.cgv.vn/default/movies/coming-soon-1.html](https://www.cgv.vn/default/movies/coming-soon-1.html)
- **Thời gian cào:** 03/11/2026
- **Tổng số phim:** 34 phim sắp chiếu

## Danh sách tệp dữ liệu

1. **[`cgv_coming_soon_movies.json`](cgv_coming_soon_movies.json):**
   - Định dạng JSON có cấu trúc đầy đủ, bao gồm các trường chuẩn hóa theo bảng `movies` và các metadata mở rộng:
     - `title`: Tên phim tiếng Việt / gốc
     - `description`: Tóm tắt nội dung phim (synopsis chi tiết)
     - `duration_minutes`: Thời lượng (phút)
     - `genre`: Thể loại phim
     - `age_rating`: Phân loại độ tuổi (`P`, `T13`, `T16`, `T18`)
     - `release_date`: Ngày khởi chiếu (định dạng `YYYY-MM-DD`)
     - `poster_url`: Link ảnh poster độ phân giải cao từ CDN của CGV
     - `status`: Mặc định `UPCOMING`
     - Metadata bổ sung: `director` (đạo diễn), `actors` (diễn viên), `language` (ngôn ngữ/phụ đề), `trailer_url` (link trailer YouTube), `source_url`.

2. **[`cgv_movies_insert.sql`](cgv_movies_insert.sql):**
   - File script SQL chứa 34 câu lệnh `INSERT INTO movies (...)` tương thích 100% với schema `database/cinema_booking_schema.sql` của dự án.
   - Các chuỗi ký tự đặc biệt, dấu nháy đơn (`'`) đã được escape an toàn (`''`).

3. **[`images/`](images/):**
   - Thư mục chứa 34 poster phim chất lượng cao (JPG/PNG) đã tải về từ CDN CGV, định danh theo chuẩn `{id}_{slug_name}.jpg`.

4. **[`images_manifest.json`](images_manifest.json):**
   - Danh mục ánh xạ chi tiết: ID phim, tiêu đề, link gốc CGV, tên file cục bộ, kích thước byte và trạng thái tải.

5. **[`download_posters.py`](download_posters.py):**
   - Script Python tự động tải toàn bộ poster về thư mục `images/`.

6. **[`upload_to_cloudinary.py`](upload_to_cloudinary.py):**
   - Script Python tự động upload các poster từ `images/` lên Cloudinary và tự động tạo file `cgv_movies_insert_cloudinary.sql` với các `poster_url` mới từ Cloudinary.

---

## Hướng dẫn nạp vào cơ sở dữ liệu khi cần

### Cách 1: Nạp trực tiếp qua MySQL CLI
Chạy lệnh sau trên terminal:
```bash
mysql -u root -proot cinema_booking < crawled_data/cgv_movies_insert.sql
```
*(Hoặc dùng đường dẫn đầy đủ trên Windows PowerShell:)*
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -proot cinema_booking -e "source E:\Cinema\crawled_data\cgv_movies_insert.sql;"
```

### Cách 2: Nạp qua MySQL Workbench / DBeaver / Navicat
Mở file `crawled_data/cgv_movies_insert.sql` trong công cụ quản trị CSDL của bạn và chọn **Execute Script**.

### Cách 3: Nạp qua Spring Boot Flyway (Tùy chọn)
Nếu muốn dữ liệu này tự động nạp vào mỗi khi khởi tạo DB mới, bạn có thể sao chép nội dung vào file migration tiếp theo của Flyway:
`backend/src/main/resources/db/migration/V3__import_cgv_upcoming_movies.sql`
*(bỏ dòng `USE cinema_booking;` khi dùng với Flyway)*.

---

# Dữ liệu cụm rạp chiếu phim tại Cần Thơ (Crawl từ CGV)

Dữ liệu được cào trực tiếp từ trang danh mục rạp chiếu CGV Cinemas Việt Nam:
- **Nguồn:** [https://www.cgv.vn/default/cinox/site/](https://www.cgv.vn/default/cinox/site/)
- **Thời gian cào:** 04/11/2026
- **Khu vực:** TP. Cần Thơ (`cgv_city_7`)
- **Số lượng rạp:** 3 cụm rạp

## Danh sách tệp dữ liệu rạp

1. **[`cgv_cantho_cinemas.json`](cgv_cantho_cinemas.json):**
   - File JSON chứa dữ liệu chi tiết của 3 cụm rạp tại Cần Thơ:
     - Các trường khớp 100% với bảng `cinemas` (`name`, `address`, `status`).
     - Metadata mở rộng: `site_code`, `hotline`, `fax`, `map_embed_url`, `source_url`, `images`, `rooms_count`, `room_types`, `rooms`.

2. **[`cgv_cantho_cinemas_insert.sql`](cgv_cantho_cinemas_insert.sql):**
   - File SQL Insert vào bảng `cinemas` (và bảng `rooms` tương ứng) tương thích 100% với schema `database/cinema_booking_schema.sql`.

3. **[`crawl_cantho_cinemas.js`](crawl_cantho_cinemas.js):**
   - Script Node.js tự động bypass F5 BIG-IP challenge và cào dữ liệu rạp Cần Thơ từ CGV.

