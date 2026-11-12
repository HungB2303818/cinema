-- V3: CGV catalog data, adapted from sql_schema/cgv_seed.sql.
-- Keep this migration unchanged after it has been applied by Flyway.
-- Guards preserve existing manually imported rows (matched by cinema name/room name/poster URL).
-- Newly seeded rooms have no seats; configure seats before creating showtimes.

-- Cinemas and their rooms (cinemas must be inserted before rooms)
-- ============================================================
-- 1. INSERT VÀO BẢNG `cinemas`
-- Sử dụng WHERE NOT EXISTS để tránh bị trùng lặp nếu chạy lại script
-- ============================================================

-- 1. CGV Sense City Cần Thơ (Mã site: 013)
INSERT INTO cinemas (name, address, status)
SELECT 'CGV Sense City Cần Thơ', 'Tầng 3, TTTM Sense City, Số 1 Đại Lộ Hòa Bình, Phường Tân An, Quận Ninh Kiều, Cần Thơ', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM cinemas WHERE name = 'CGV Sense City Cần Thơ');

-- 2. CGV Vincom Xuân Khánh (Mã site: 036)
INSERT INTO cinemas (name, address, status)
SELECT 'CGV Vincom Xuân Khánh', 'Tầng 5, TTTM Vincom Plaza Xuân Khánh, Số 209 Đường 30/04, Phường Xuân Khánh, Quận Ninh Kiều, Cần Thơ', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM cinemas WHERE name = 'CGV Vincom Xuân Khánh');

-- 3. CGV Vincom Hùng Vương (Mã site: 029)
INSERT INTO cinemas (name, address, status)
SELECT 'CGV Vincom Hùng Vương', 'Tầng 6, TTTM Vincom Plaza Hùng Vương, Số 2 Hùng Vương, Phường Thới Bình, Quận Ninh Kiều, Cần Thơ', 'ACTIVE'
WHERE NOT EXISTS (SELECT 1 FROM cinemas WHERE name = 'CGV Vincom Hùng Vương');

-- ============================================================
-- 2. INSERT CÁC PHÒNG CHIẾU TƯƠNG ỨNG VÀO BẢNG `rooms`
-- Bảng rooms có UNIQUE KEY (cinema_id, name)
-- ============================================================

-- Các phòng chiếu của "CGV Sense City Cần Thơ" (6 phòng)
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 01 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Sense City Cần Thơ' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 02 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Sense City Cần Thơ' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 03 (3D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Sense City Cần Thơ' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 04 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Sense City Cần Thơ' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 05 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Sense City Cần Thơ' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 06 (3D/Sweetbox)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Sense City Cần Thơ' LIMIT 1;

-- Các phòng chiếu của "CGV Vincom Xuân Khánh" (6 phòng)
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 01 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Xuân Khánh' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 02 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Xuân Khánh' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 03 (3D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Xuân Khánh' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 04 (3D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Xuân Khánh' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 05 (Gold Class)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Xuân Khánh' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 06 (2D/Sweetbox)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Xuân Khánh' LIMIT 1;

-- Các phòng chiếu của "CGV Vincom Hùng Vương" (4 phòng)
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 01 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Hùng Vương' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 02 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Hùng Vương' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 03 (3D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Hùng Vương' LIMIT 1;
INSERT IGNORE INTO rooms (cinema_id, name, status)
SELECT id, 'Phòng 04 (2D)', 'ACTIVE' FROM cinemas WHERE name = 'CGV Vincom Hùng Vương' LIMIT 1;

-- Movies (Cloudinary poster URLs)
INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'BÒ SỮA BAY', 'Vào những năm 90, một trang trại bò sữa đang nghiên cứu một công thức sữa độc quyền có thể chữa lành vết thương, trẻ hóa và nhiều công dụng đặc biệt khác. Để thoát nghèo, một nhóm công nhân quyết định đánh cắp công thức sữa ấy, cho đến khi Trâu - tên đầu sỏ có cảm tình đặc biệt với người tạo nên công thức sữa.', 108, 'Hài, Hành Động, Tâm Lý', 'T18', '2026-11-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758604/cinema/posters/01_bo_sua_bay.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758604/cinema/posters/01_bo_sua_bay.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'GODZILLA TRỪ KHÔNG', 'Chiến tranh đã đưa Nhật Bản về con số 0, Godzilla đã kéo con số ấy lao dốc xuống số âm. Đã hai năm kể từ cuộc chiến, đất nước đang đấu tranh để phục hồi và họ cuối cùng đã lấy lại được cuộc sống thường nhật. Ngay khi nhân loại cố bám giữ sự yên bình mong manh vừa giành lại được, thì một mối đe dọa mới xuất hiện, nghiền nát tất cả hy vọng. Không còn cơ hội nào nữa. Tất cả sẽ kết thúc tại đây.', 135, 'Hành Động, Khoa Học Viễn Tưởng', 'T16', '2026-11-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758607/cinema/posters/02_godzilla_tru_khong.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758607/cinema/posters/02_godzilla_tru_khong.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'RAMAYANA: KHỞI NGUỒN MỘT HUYỀN THOẠI', 'Dựa trên sử thi cổ đại lừng danh được hàng tỷ người biết đến, tác phẩm Ramayana: Khởi Nguồn Một Huyền Thoại của Namit Malhotra kể về câu chuyện của Rama, một vị hoàng tử gắn liền với sự hy sinh và Ravana, một vị vua bất tử bị thôi thúc bởi lòng báo thù; cùng lời tiên tri đã gắn kết số phận của họ lại với nhau.', 168, 'Hành Động, Phiêu Lưu, Tâm Lý, Thần thoại', 'T13', '2026-11-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758609/cinema/posters/03_ramayana_khoi_nguon_mot_huyen_thoai.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758609/cinema/posters/03_ramayana_khoi_nguon_mot_huyen_thoai.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'THIÊN ĐƯỜNG TĂM TỐI', 'Thiên Đường Tăm Tối xoay quanh hành trình bi thương của So-young - một người mẹ bất ngờ mất đi đứa con của mình. Giữa nỗi đau tận cùng, So-young tìm thấy niềm an ủi khi kết nối với hình ảnh cậu con trai Sun-woo đã mất tích thông qua kính AR. Chín năm sau, điều tưởng như không thể xảy ra: Sun-woo thật sự trở về, nay đã là một chàng trai trưởng thành. Thế nhưng, cuộc đoàn tụ không mang đến hạnh phúc mà một lần nữa đẩy So-young vào tuyệt vọng khi người con trai trở về giờ đây xa lạ và lạnh lùng, trong khi phiên bản Sun-woo ảo lại ngày càng cần đến cô, buộc cô phải đối diện với lựa chọn đau đớn giữa thực tại và một thế giới được tạo nên từ ký ức.', 100, 'Hồi hộp, Tâm Lý', 'T18', '2026-11-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758612/cinema/posters/04_thien_uong_tam_toi.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758612/cinema/posters/04_thien_uong_tam_toi.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'CHÀNG MÈO MANG MŨ', 'Hãy gặp gỡ Chàng Mèo Mang Mũ theo cách bạn chưa từng biết đến! Tiếp nối tinh thần kỳ diệu và đầy trí tưởng tượng trong các tác phẩm của Dr. Seuss, The Cat in the Hat chính thức bước lên màn ảnh rộng với bộ phim hoạt hình điện ảnh đầu tiên của mình – một cuộc phiêu lưu hoàn toàn mới, hoành tráng và đầy cá tính, nơi những trò tinh nghịch, phép màu và hỗn loạn ngự trị.

Trong phim, nhân vật chính của chúng ta phải đối mặt với nhiệm vụ khó khăn nhất từ trước đến nay cho I.I.I.I. (Viện Phụ trách Trí tưởng tượng và Cảm hứng, LLC): giúp Gabby và Sebastian, hai anh em đang chật vật thích nghi với cuộc sống ở một thị trấn mới, tìm lại niềm vui. Nổi tiếng với việc thường xuyên đẩy mọi thứ đi quá xa, đây có thể là cơ hội cuối cùng để “đặc vụ hỗn loạn” này chứng minh bản thân... hoặc đánh mất chiếc mũ phép thuật của mình!', 107, 'Gia đình, Hài, Hoạt Hình, Phiêu Lưu', 'P', '2026-11-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758614/cinema/posters/05_chang_meo_mang_mu.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758614/cinema/posters/05_chang_meo_mang_mu.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'KHI THẦN CHẾT ĐỔ CHUÔNG', 'Khi Thần Chết Đổ Chuông xoay quanh Danto (Bhisma Mulia) – người đàn ông trở về quê nhà sau nhiều năm xa cách, sau khi hay tin ông mình, pháp sư Baharun, bị sát hại bởi Panebok – linh hồn không đầu gieo rắc nỗi kinh hoàng tại vùng đất Belitung. 
Khi chiếc chuông thiêng vốn dùng để phong ấn những linh hồn bị chiếm giữ, hàng loạt vụ giết người bí ẩn liên tiếp xảy ra. Các nạn nhân bị chặt đầu, còn truyền thuyết kinh hoàng tưởng chừng chỉ dùng để dọa trẻ con dần trở thành cơn ác mộng hiện hữu. Để ngăn chặn thảm kịch tiếp diễn, Danto buộc phải đối mặt với bí mật gia đình và tìm cách phong ấn Panebok, trước khi linh hồn không đầu này giải phóng hàng loạt linh hồn bị giam cầm bên trong chiếc chuông.', 86, 'Kinh Dị', 'T18', '2026-11-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758616/cinema/posters/06_khi_than_chet_o_chuong.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758616/cinema/posters/06_khi_than_chet_o_chuong.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'NGÀY CON CÒN MẸ', 'Có những đứa con dành cả tuổi thơ chỉ để chứng minh mình xứng đáng được yêu thương. Và cũng có những người mẹ dành cả đời để yêu con theo cách mà con chẳng thể nào hiểu nổi.
Mây lớn lên với niềm tin sắt đá rằng trong tim bà Tím, anh Hai Pháo luôn là tất cả. Nỗi đau bị "bỏ quên" khiến cô biến mọi câu chuyện thành tranh cãi, dựng nên bức tường im lặng giữa hai mẹ con. Cho đến khi biến cố bất ngờ ập xuống, Mây mới bàng hoàng nhận ra: điều đau đớn nhất không phải là chưa từng được yêu, mà là cô đã dành trọn thanh xuân để trách một người mẹ... mà chưa từng thật sự hiểu bà.
Khai thác góc nhìn chân thật về "đứa con thừa", NGÀY CON CÒN MẸ là hành trình giằng xé nhưng ấm áp, nhắc nhở chúng ta học cách tha thứ và yêu thương khi mọi thứ vẫn còn kịp.', 100, 'Gia đình, Tâm Lý', 'P', '2026-11-11', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758618/cinema/posters/07_ngay_con_con_me.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758618/cinema/posters/07_ngay_con_con_me.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'EBENEZER PHÉP MÀU ĐÊM GIÁNG SINH', 'Tháng 11 này, Johnny Depp sẽ hóa thân thành Ebenezer Scrooge. Một cái tên quen thuộc và một câu chuyện chưa từng được kể.', 100, 'Thần thoại', 'P', '2026-11-13', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758619/cinema/posters/08_ebenezer_phep_mau_em_giang_sinh.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758619/cinema/posters/08_ebenezer_phep_mau_em_giang_sinh.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'THÒNG LỌNG MA: QUỶ CÁI ĐÒI MẠNG', 'Bộ phim mở đầu bằng một nghi lễ trừ tà bị cấm được phát trực tiếp tại Indonesia, vô tình đánh thức Kuntilanak - linh hồn nữ quỷ báo thù trong truyền thuyết dân gian địa phương. Lời nguyền nhanh chóng lan đến Đài Loan, kéo theo hàng loạt cái chết bí ẩn và những vụ quỷ ám kinh hoàng. Sau khi Mila trở thành nạn nhân đầu tiên, con trai cô quyết định đưa tro cốt của mẹ trở về Indonesia để tìm hiểu sự thật đằng sau cái chết, nhưng lại bị cuốn vào cơn ác mộng bắt nguồn từ những tín ngưỡng cổ xưa và mối thù hận chưa được hóa giải. Khi thế lực siêu nhiên ngày càng trở nên đáng sợ, cả nhóm buộc phải đối mặt với Kuntilanak và tìm cách chấm dứt lời nguyền trước khi nó cướp đi tất cả.', 100, 'Kinh Dị', 'P', '2026-11-13', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758622/cinema/posters/09_thong_long_ma_quy_cai_oi_mang.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758622/cinema/posters/09_thong_long_ma_quy_cai_oi_mang.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'PHIM ĐIỆN ẢNH THÁM TỬ SIÊU MÔNG: NGÔI SAO VÀ MẶT TRĂNG', 'Thám tử Butt nhận nhiệm vụ tìm kiếm một người thân bị mất tích sau khi tham gia cuộc thi thần tượng tổ chức tại Đảo Bụi Sao – nơi đặt trụ sở của Học Viện Đạo Tặc, một tổ chức tội phạm quốc tế đang triển khai dự án bí ẩn DARK AGE.

Trong quá trình điều tra, Butt vô tình trở thành một ngôi sao thần tượng và giành chiến thắng trong cuộc thi. Cùng lúc đó, Đạo tặc U đột nhập vào học viện để lấy lại Nguyệt Quang Thạch bị Đạo tặc G đánh cắp. Để ngăn chặn dự án DARK AGE, Butt và Đạo tặc U buộc phải hợp tác.

Bí mật nào ẩn giấu trong Nguyệt Quang Thạch? Mục đích thật sự của Đạo tặc G là gì? Khi hai đối thủ truyền kiếp cùng chiến đấu, một phép màu sẽ xảy ra...', 100, 'Hoạt Hình', 'P', '2026-11-13', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758624/cinema/posters/10_phim_ien_anh_tham_tu_sieu_mong_ngoi_sao_va_mat_trang.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758624/cinema/posters/10_phim_ien_anh_tham_tu_sieu_mong_ngoi_sao_va_mat_trang.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'ĐẤU TRƯỜNG SINH TỬ: BÌNH MINH NGÀY CHIÊU QUÂN', 'Được chuyển thể từ cuốn tiểu thuyết cùng tên, Đấu Trường Sinh Tử: Bình Minh Ngày Chiêu Quân sẽ đưa khán giả trở lại Panem 24 năm trước những sự kiện trong phần phim Đấu Trường Sinh Tử đầu tiên, bắt đầu vào buổi sáng diễn ra Lễ Chiêu Quân lần thứ 50, hay còn được biết đến với tên gọi Huyết trường Tứ phân lần thứ hai.', 100, 'Hành Động, Khoa Học Viễn Tưởng, Phiêu Lưu, Thần thoại', 'P', '2026-11-20', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758627/cinema/posters/11_au_truong_sinh_tu_binh_minh_ngay_chieu_quan.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758627/cinema/posters/11_au_truong_sinh_tu_binh_minh_ngay_chieu_quan.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'TRẠI GIAM HẠNH PHÚC', 'Phúc (Tuấn Trần), từ một giáo viên hiền lành, tốt bụng vì muốn cứu em gái (Sally Hồng Anh) mà trở thành sát nhân, phải vào tù. Cuộc sống sau song sắt vô cùng khắc nghiệt nhưng Phúc cố gắng nhẫn nhịn, mong sớm được trở về với tự do. Nhờ bản tính lương thiện, anh khiến người cán bộ quản giáo vô cùng nguyên tắc tên Tú (Ma Ran Đô) và các phạm nhân khác dần thay đổi theo hướng tích cực, hòa hợp và đồng cảm với nhau hơn. 

Trong lúc "giáo án đặc biệt nhất" đang được viết trong nhà tù thì em gái của Phúc cũng phải đối diện với một cuộc sống đầy thử thách khi không còn anh trai bên cạnh. Còn tên tù nhân sừng sỏ Long (Lương Thế Thành) cũng luôn rập rình chực chờ trả thù Phúc.', 100, 'Gia đình, Hài, Tâm Lý', 'P', '2026-11-20', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758629/cinema/posters/12_trai_giam_hanh_phuc.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758629/cinema/posters/12_trai_giam_hanh_phuc.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'MẸ MÌN', 'MẸ MÌN – một nhân vật bí ẩn – có khả năng ban phát điều ước cho mọi người, nhưng điều ước nào cũng sẽ đi kèm điều kiện của nó.', 100, 'Bí ẩn, Hồi hộp, Tâm Lý', 'P', '2026-11-27', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758631/cinema/posters/13_me_min.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758631/cinema/posters/13_me_min.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'GẶP GỠ THÔNG GIA: DÂU MỚI TRÌNH LÀNG', 'Henry, con trai của Greg Focker đưa bạn gái mình, một chuyên gia đàm phán con tin của FBI về ra mắt gia đình. Mọi chuyện bắt đầu trở nên rối rắm khi Henry tiết lộ kế hoạch cầu hôn, khiến Greg không khỏi lo lắng và kéo theo hàng loạt tình huống dở khóc dở cười.', 100, 'Hài', 'P', '2026-11-27', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758634/cinema/posters/14_gap_go_thong_gia_dau_moi_trinh_lang.png', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758634/cinema/posters/14_gap_go_thong_gia_dau_moi_trinh_lang.png');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'HEXE: THẾ GIỚI PHÉP THUẬT', 'Trong “Hexe – Thế giới Phép Thuật”, cô thiếu nữ bốc đồng và có phần khác biệt Billie (lồng tiếng bởi Hailee Steinfeld) bất ngờ phát hiện mình sở hữu những năng lực phép thuật bí ẩn. Khi sức mạnh ấy được giải phóng, Billie bị cuốn vào một hành trình kỳ ảo đầy choáng ngợp, rời khỏi vùng ngoại ô quen thuộc để bước chân vào Hexe – một thế giới phù thủy rộng lớn. 
Buộc phải đồng hành cùng người mẹ thận trọng Alice (lồng tiếng bởi Rashida Jones), hai mẹ con dần khám phá những bí mật của gia đình có thể làm thay đổi thế giới phù thủy mãi mãi.', 100, 'Gia đình, Hài, Hoạt Hình, Phiêu Lưu, Thần thoại', 'P', '2026-11-27', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758637/cinema/posters/15_hexe_the_gioi_phep_thuat.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758637/cinema/posters/15_hexe_the_gioi_phep_thuat.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'ĐÊM HUNG TÀN 2', 'Nếu ngoan, bạn sẽ được nhận quà từ Ông Già Noel. Nếu hư, bạn sẽ nhận lấy công lý.
Ra mắt lần đầu tiên vào năm 2022, Đêm Hung Tàn là một bộ phim hành động vô cùng bạo liệt, xoay quanh một Ông Già Noel sở hữu kỹ năng chiến đấu chết người đã hạ gục cả một nhóm lính đánh thuê để giải cứu một cô bé cùng gia đình cô. Giờ đây, Ông Già Noel nổi loạn ấy lại một lần nữa khoác lên bộ đồ đỏ quen thuộc để đối đầu với một tên trùm tội phạm ác độc đang gieo rắc nỗi kinh hoàng cho các tiểu thương tại trung tâm thương mại Silver Bell Mall.
Thế nhưng, vì lỡ quên mất ý nghĩa thực sự của Giáng Sinh, Ông Già Noel nay đã trở thành “trẻ hư”, mất hết phép thuật và bị tước đi mọi quyền năng. Tình huống tréo ngoe này đã đưa ông bước vào cuộc phiêu lưu đầy tình người bên trong trung tâm thương mại, nơi cuộc sống của những tiểu thương đang dần rơi vào tuyệt vọng và cần đến sự giúp đỡ. Trong lúc phép thuật dần cạn kiệt và thời gian cũng chẳng còn nhiều, ông buộc phải tìm một cách khác để chống lại đám côn đồ đang đe dọa nơi đây. Và để cứu lấy Giáng Sinh, Ông Già Noel phải tìm lại niềm tin bên trong mình vào lòng tốt và gọi đến sự chi viện vào phút chót từ người mà chẳng tên phản diện nào muốn đụng độ: Bà Già Noel.', 100, 'Hài, Hành Động', 'P', '2026-12-04', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758639/cinema/posters/16_em_hung_tan_2.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758639/cinema/posters/16_em_hung_tan_2.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'CON MẮT THỨ BA', 'Một kẻ cuồng tín sau cơn đau đầu dữ dội phát hiện ra mình có một con mắt dọc trên trán. Những vụ sát nhân hàng loạt. Những hồn ma bóng quỷ lẩn khuất trong đời sống. Những nỗi sợ rình rập từ ám ảnh quá khứ. Sợi Chỉ Đỏ là gì, và sẽ kết nối tất cả như thế nào?', 100, 'Kinh Dị', 'P', '2026-12-04', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758641/cinema/posters/17_con_mat_thu_ba.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758641/cinema/posters/17_con_mat_thu_ba.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'BẮT CÁ BA TAY', 'Trong BẮT CÁ BA TAY, sau một lần cầu duyên, Yên (Thúy Ngân) bất ngờ chứng kiến cả ba người yêu cũ là Tùng (Steven Nguyễn), Phong (Ngô Kiến Huy) và Minh (Otis) đồng loạt muốn nối lại tình xưa. Đứng trước ba chàng trai với ba tính cách và ba màu sắc tình yêu khác biệt, Yên quyết định cho cả ba cơ hội cùng lúc. Nhưng khi những cuộc hẹn chồng chéo và bí mật dần có nguy cơ bị phanh phui, liệu cô nàng có thể tìm được tình yêu đích thực hay sẽ nhận về một cú "nghiệp quật" nhớ đời?', 100, 'Hài, Tình cảm', 'P', '2026-12-04', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758643/cinema/posters/18_bat_ca_ba_tay.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758643/cinema/posters/18_bat_ca_ba_tay.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'DUNE: HÀNH TINH CÁT - PHẦN BA', 'Dune: Hành Tinh Cát - Phần Ba lấy bối cảnh gần hai thập kỷ sau khi Paul Atreides nắm quyền kiểm soát Đế chế. Giờ đây, khi đã trở thành một Hoàng đế tàn nhẫn, Paul phải đối mặt với những hậu quả từ chính sự cai trị của mình. Những đồng minh cũ trở lại, những mỗi đe dọa mới trỗi dậy, và cả sự phản bội luôn lẩn khuất trong bóng tối. Bị ám ảnh bởi viễn cảnh Đế chế sụp đổ cùng sự trở lại của một người anh từng yêu thương, Paul bị cuốn vào một âm mưu hủy diệt - mà trung tâm của bí mật ấy lại chính là Chani. Cuộc nổi dậy dần nhen nhóm, những kẻ thù ngày một áp sát. Chính lúc này đây, Paul sẽ phải đối diện với cái giá thực sự của quyền lực, đánh đổi bằng định mệnh của những người quan trọng nhất cuộc đời anh.', 100, 'Hành Động, Khoa Học Viễn Tưởng', 'P', '2026-12-18', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758645/cinema/posters/19_dune_hanh_tinh_cat_phan_ba.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758645/cinema/posters/19_dune_hanh_tinh_cat_phan_ba.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'AVENGERS: NGÀY TẬN THẾ', 'Avengers: Doomsday theo chân những người hùng được yêu mến đến từ ba vũ trụ khác nhau, khi họ bị cuốn vào một hành trình va chạm sinh tử và phải đối mặt với một mối đe dọa mang tính sống còn chưa từng có trong lịch sử.', 100, 'Hành Động, Khoa Học Viễn Tưởng, Phiêu Lưu', 'P', '2026-12-18', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758647/cinema/posters/20_avengers_ngay_tan_the.jpg', 'SHOWING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758647/cinema/posters/20_avengers_ngay_tan_the.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'HUYẾT THỐNG', 'Huyết Thống là một bản "tụng kinh hoà tấu" xoay quanh nhân vật Tâm (Quách Ngọc Ngoan) và Liêm (Quang Tuấn) trong hành trình trục vong cho một bé gái. Một người là bác sĩ đầy thành tựu tin vào sức mạnh của y học, người còn lại là thầy pháp tin vào luật nhân quả. Hai người đàn ông với hai niềm tin và phương cách khác nhau nhưng cùng chung một mục đích cứu lấy đứa trẻ vô tội. Nhưng "nợ máu trả máu", chính cái nghiệp báo không đứt đã đánh thức một oán linh cực kì nguy hiểm trở lại dương thế, mở ra một cuộc đối đầu kinh hãi trên màn ảnh.', 100, 'Kinh Dị', 'P', '2026-12-25', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758649/cinema/posters/21_huyet_thong.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758649/cinema/posters/21_huyet_thong.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'NGƯỜI MẸ XẤU', 'Nghệ sĩ Hồng Đào và Steven Nguyễn lần đầu hoá thân mẹ con trong phim Người Mẹ Xấu. Câu chuyện kể về hành trình đầy éo le và khốc liệt của hai mẹ con bị xếp vào thành phần “bất hảo” trong xã hội. Khi người con muốn hoàn lương, một ân oán của người mẹ khiến anh phải bước vào trận chiến dữ dội nhất.', 100, 'Hành Động, Tâm Lý', 'P', '2026-12-31', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758651/cinema/posters/22_nguoi_me_xau.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758651/cinema/posters/22_nguoi_me_xau.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'PHIM ANGRY BIRDS 3', 'Dịp lễ này, Red sẽ phải đối đầu với thử thách nhọc nhằn nhất đời mình: vừa học cách làm cha, vừa giải cứu thế giới!', 100, 'Hoạt Hình', 'P', '2027-01-01', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758652/cinema/posters/23_phim_angry_birds_3.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758652/cinema/posters/23_phim_angry_birds_3.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'TRÊN CON ĐƯỜNG MỚI', 'Trung – một người đàn ông mang theo quá khứ nhiều biến động – bước vào hành trình tìm kiếm một con đường mới giữa thế giới của tiền bạc, quyền lực, tội phạm và những ràng buộc gia đình.', 100, 'Hành Động, Tình cảm', 'P', '2027-01-01', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758655/cinema/posters/24_tren_con_uong_moi.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758655/cinema/posters/24_tren_con_uong_moi.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'CỘNG TRỪ NHÂN CHIA', 'Một nữ sinh chuyển đến một ngôi trường quốc tế danh tiếng. Cô liên tiếp vướng vào nhiều vụ việc đau lòng và chứng kiến nhiều hiện tượng kì bí. Trên đường tìm ra sự thật, cô phát hiện nhiều bí mật đen tối ẩn bên dưới lớp vỏ hào nhoáng của một ngôi trường danh giá. Liệu cô có chấp nhận đánh đổi để tìm lời giải cho bài toán hóc búa này?', 100, 'Hồi hộp, Tâm Lý', 'P', NULL, 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758657/cinema/posters/25_cong_tru_nhan_chia.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758657/cinema/posters/25_cong_tru_nhan_chia.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'CHUYẾN ĐI NHỚ ĐỜI', 'Từ một chuyến đi biển định mệnh, Hoàng và cậu con trai tinh nghịch An bị cuốn vào cơn bão, mắc kẹt trên hoang đảo và buộc phải cùng nhau sinh tồn. Giữa thiên nhiên khắc nghiệt, những tình huống dở khóc dở cười, cả hai bắt đầu một hành trình không chỉ để tìm đường về nhà, mà còn để tìm lại nhau. Một người muốn về nhà, một người muốn ở lại. Liệu hành trình của họ sẽ đi về đâu?', 100, 'Gia đình', 'P', '2026-11-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758659/cinema/posters/26_chuyen_i_nho_oi.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758659/cinema/posters/26_chuyen_i_nho_oi.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'KỶ BĂNG HÀ: ĐIỂM BÙNG NỔ', 'Kỷ Băng Hà: Điểm Bùng Nổ do John Donkin (Kỷ băng hà: Cuộc phiêu lưu của Buck Wild) đạo diễn và Lori Forte (Kỷ Băng Hà & Kỷ Băng Hà: Trời Sập) đảm nhận vai trò nhà sản xuất. 
Bộ phim dự kiến khởi chiếu tại các rạp chiếu phim từ ngày 05.02.2027.', 100, 'Hài, Hoạt Hình, Phiêu Lưu', 'P', NULL, 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758661/cinema/posters/27_ky_bang_ha_iem_bung_no.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758661/cinema/posters/27_ky_bang_ha_iem_bung_no.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'THÁM TỬ KIÊN: LỜI NGUYỀN HOÀNG KIM', 'Khi đang điều tra cái chết bí ẩn tại tửu lầu Thanh Trúc, Thám Tử Kiên vô tình phát hiện một lời nguyền man rợ đang khiến cả kinh thành nhuốm máu. 

Đằng sau lời nguyền đó là một sứ mệnh mà Kiên cũng chưa từng nghĩ đến.', 100, 'Tâm Lý', 'P', '2027-02-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758663/cinema/posters/28_tham_tu_kien_loi_nguyen_hoang_kim.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758663/cinema/posters/28_tham_tu_kien_loi_nguyen_hoang_kim.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'LOẠN THẾ', 'Một thời đại nghĩa hiệp sắp mở ra.', 100, 'Hành Động', 'P', '2027-02-06', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758665/cinema/posters/29_loan_the.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758665/cinema/posters/29_loan_the.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'ĐIỀU CÒN LẠI', 'Khi Tate Gordon, một kiến trúc sư sống khép kín, chuyển đến một thị trấn ven biển nhỏ để hoàn thành dự án mới nhất, anh tình cờ gặp một cô gái trẻ đầy cuốn hút. Sự xuất hiện của cô khiến Tate dần bước ra khỏi vỏ bọc của mình, nhưng cũng đưa anh vào trung tâm của một bí ẩn chết chóc đang bao trùm thị trấn.', 100, 'Hồi hộp, Tâm Lý', 'P', NULL, 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758666/cinema/posters/30_ieu_con_lai.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758666/cinema/posters/30_ieu_con_lai.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'CHIẾN BÀO', 'Năm 2028 đánh dấu cột mốc 610 năm khởi nghĩa Lam Sơn. CHIẾN BÀO sẽ đưa khán giả xuyên không về thế kỷ 15, chứng kiến giai đoạn đầu gian truân của Bình Định Vương Lê Lợi và Hội thề Lũng Nhai. Một bức tranh điện ảnh hứa hẹn sẽ cực kỳ hoành tráng, mãn nhãn và trọn vẹn cảm xúc về sự đoàn kết dân tộc.
Dự án điện ảnh CHIẾN BÀO của đạo diễn Victor Vũ không chỉ kể lại một trang sử. Phim là một hành trình đi sâu vào nội tâm, máu và nước mắt của những người con Đại Việt cách đây hơn 6 thế kỷ. Ở đó, khởi nghĩa Lam Sơn được bắt đầu không phải bằng binh hùng tướng mạnh ngay từ ngày đầu, mà bằng ngọn lửa nhen nhóm từ 19 vị hào kiệt và lan tỏa đến những người dân bình thường nhất. Khi Tổ quốc gọi tên, họ sẵn sàng làm nên những điều phi thường.', 100, 'Lịch Sử', 'P', NULL, 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758669/cinema/posters/31_chien_bao.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758669/cinema/posters/31_chien_bao.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'YÊU SAI YÊU LẠI!', 'YÊU SAI YÊU LẠI! – Câu chuyện tình yêu hài hước và cảm động với sự góp mặt của Đỗ Nhật Hoàng và Mie, hứa hẹn mang đến nhiều cung bậc cảm xúc cho khán giả khi đổ bộ rạp chiếu vào mùa Valentine 2027.', 100, 'Gia đình, Hài, Tình cảm', 'P', '2027-02-19', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758671/cinema/posters/32_yeu_sai_yeu_lai.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758671/cinema/posters/32_yeu_sai_yeu_lai.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'WERWULF MA SÓI', 'Hãy sẵn sàng chứng kiến tác phẩm dữ dội và ám ảnh nhất từ trước đến nay của Robert Eggers. Focus Features mang đến bộ phim kinh dị mới với tên gọi WERWULF MA SÓI - câu chuyện rùng rợn về đức tin, sự đọa đày và con quỷ ẩn sâu trong mỗi con người.', 100, 'Kinh Dị', 'P', '2027-02-26', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758673/cinema/posters/33_werwulf_ma_soi.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758673/cinema/posters/33_werwulf_ma_soi.jpg');

INSERT INTO movies (title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
SELECT 'GATTO: CUỘC PHIÊU LƯU CỦA MÈO NERO', 'Trong Gatto: Cuộc phiêu lưu của mèo Nero, sau nhiều năm tìm cách sinh tồn giữa thành phố Venice - Ý chằng chịt kênh đào và đầy rẫy những quan niệm mê tín, chú mèo Nero bắt đầu tự hỏi liệu mình đã thực sự sống đúng với những kiếp đời của mình hay chưa.

Mang món nợ với Rocco, tên trùm thế giới ngầm của loài mèo tại địa phương, Nero rơi vào tình thế tiến thoái lưỡng nan. Chú buộc phải xây dựng một tình bạn không ai ngờ tới, một mối duyên có thể giúp chú cuối cùng tìm thấy mục đích thực sự của cuộc đời mình — trừ khi thành phố Venice đầy rẫy hiểm nguy kịp đánh bại chú trước khi điều đó xảy ra.', 100, 'Hài, Hoạt Hình, Phiêu Lưu', 'P', '2027-03-05', 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758675/cinema/posters/34_gatto_cuoc_phieu_luu_cua_meo_nero.jpg', 'UPCOMING'
WHERE NOT EXISTS (SELECT 1 FROM movies WHERE poster_url = 'https://res.cloudinary.com/dve5vqois/image/upload/v1793758675/cinema/posters/34_gatto_cuoc_phieu_luu_cua_meo_nero.jpg');
