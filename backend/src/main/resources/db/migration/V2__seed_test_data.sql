-- V2: Initial Seed Data for Cinema, Rooms, Seats, Movies, Accounts
-- Password for all accounts is 'Password@123' (BCrypt encoded)

-- 1. Accounts (Admin, Staff, Customers)
INSERT INTO users (id, full_name, email, password_hash, role, status, created_at)
VALUES
  (1, 'Hệ Thống Admin', 'admin@cinema.com', '$2a$10$CyVS59NP4Yyhwu4.Ew/.r.4Z.4Ri/lNR4IRiPgC.NZGvqjtg3sycG', 'ADMIN', 'ACTIVE', '2026-11-03 00:00:00.000'),
  (2, 'Nhân Viên Soát Vé', 'staff@cinema.com', '$2a$10$CyVS59NP4Yyhwu4.Ew/.r.4Z.4Ri/lNR4IRiPgC.NZGvqjtg3sycG', 'STAFF', 'ACTIVE', '2026-11-03 00:00:00.000'),
  (3, 'Khách Hàng Nguyễn Văn A', 'customer1@cinema.com', '$2a$10$CyVS59NP4Yyhwu4.Ew/.r.4Z.4Ri/lNR4IRiPgC.NZGvqjtg3sycG', 'CUSTOMER', 'ACTIVE', '2026-11-03 00:00:00.000'),
  (4, 'Khách Hàng Trần Thị B', 'customer2@cinema.com', '$2a$10$CyVS59NP4Yyhwu4.Ew/.r.4Z.4Ri/lNR4IRiPgC.NZGvqjtg3sycG', 'CUSTOMER', 'ACTIVE', '2026-11-03 00:00:00.000');

-- 2. Movies
INSERT INTO movies (id, title, description, duration_minutes, genre, age_rating, release_date, poster_url, status)
VALUES
  (1, 'Chiến Binh Bầu Trời', 'Phim hành động kịch tính về các phi công dũng cảm bảo vệ tổ quốc.', 120, 'Hành động', 'T18', '2026-11-01', 'https://images.unsplash.com/photo-1536440136628-849c177e76a1', 'SHOWING'),
  (2, 'Gia Đình Vui Nhộn', 'Câu chuyện hài hước, ấm áp về tình cảm gia đình hiện đại.', 95, 'Hài kịch', 'P', '2026-11-02', 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c', 'SHOWING'),
  (3, 'Tiếng Vọng Đêm Khuya', 'Bộ phim kinh dị tâm lý hồi hộp đến giây phút cuối cùng.', 110, 'Kinh dị', 'T16', '2026-11-15', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba', 'UPCOMING');

-- 3. Cinema
INSERT INTO cinemas (id, name, address, status)
VALUES
  (1, 'CGV Demo Cinema', 'Tầng 5, TTTM Demo, Hà Nội', 'ACTIVE');

-- 4. Rooms
INSERT INTO rooms (id, cinema_id, name, status)
VALUES
  (1, 1, 'Phòng 01', 'ACTIVE'),
  (2, 1, 'Phòng 02', 'ACTIVE');

-- 5. Seats for Room 1 (5 rows A-E x 8 seats = 40 seats)
-- Rows A, B, C: STANDARD
INSERT INTO seats (room_id, seat_row, seat_number, seat_type, status) VALUES
  (1, 'A', 1, 'STANDARD', 'ACTIVE'), (1, 'A', 2, 'STANDARD', 'ACTIVE'), (1, 'A', 3, 'STANDARD', 'ACTIVE'), (1, 'A', 4, 'STANDARD', 'ACTIVE'),
  (1, 'A', 5, 'STANDARD', 'ACTIVE'), (1, 'A', 6, 'STANDARD', 'ACTIVE'), (1, 'A', 7, 'STANDARD', 'ACTIVE'), (1, 'A', 8, 'STANDARD', 'ACTIVE'),
  (1, 'B', 1, 'STANDARD', 'ACTIVE'), (1, 'B', 2, 'STANDARD', 'ACTIVE'), (1, 'B', 3, 'STANDARD', 'ACTIVE'), (1, 'B', 4, 'STANDARD', 'ACTIVE'),
  (1, 'B', 5, 'STANDARD', 'ACTIVE'), (1, 'B', 6, 'STANDARD', 'ACTIVE'), (1, 'B', 7, 'STANDARD', 'ACTIVE'), (1, 'B', 8, 'STANDARD', 'ACTIVE'),
  (1, 'C', 1, 'STANDARD', 'ACTIVE'), (1, 'C', 2, 'STANDARD', 'ACTIVE'), (1, 'C', 3, 'STANDARD', 'ACTIVE'), (1, 'C', 4, 'STANDARD', 'ACTIVE'),
  (1, 'C', 5, 'STANDARD', 'ACTIVE'), (1, 'C', 6, 'STANDARD', 'ACTIVE'), (1, 'C', 7, 'STANDARD', 'ACTIVE'), (1, 'C', 8, 'STANDARD', 'ACTIVE'),
-- Rows D, E: VIP
  (1, 'D', 1, 'VIP', 'ACTIVE'), (1, 'D', 2, 'VIP', 'ACTIVE'), (1, 'D', 3, 'VIP', 'ACTIVE'), (1, 'D', 4, 'VIP', 'ACTIVE'),
  (1, 'D', 5, 'VIP', 'ACTIVE'), (1, 'D', 6, 'VIP', 'ACTIVE'), (1, 'D', 7, 'VIP', 'ACTIVE'), (1, 'D', 8, 'VIP', 'ACTIVE'),
  (1, 'E', 1, 'VIP', 'ACTIVE'), (1, 'E', 2, 'VIP', 'ACTIVE'), (1, 'E', 3, 'VIP', 'ACTIVE'), (1, 'E', 4, 'VIP', 'ACTIVE'),
  (1, 'E', 5, 'VIP', 'ACTIVE'), (1, 'E', 6, 'VIP', 'ACTIVE'), (1, 'E', 7, 'VIP', 'ACTIVE'), (1, 'E', 8, 'VIP', 'ACTIVE');

-- Seats for Room 2 (5 rows A-E x 8 seats = 40 seats)
INSERT INTO seats (room_id, seat_row, seat_number, seat_type, status) VALUES
  (2, 'A', 1, 'STANDARD', 'ACTIVE'), (2, 'A', 2, 'STANDARD', 'ACTIVE'), (2, 'A', 3, 'STANDARD', 'ACTIVE'), (2, 'A', 4, 'STANDARD', 'ACTIVE'),
  (2, 'A', 5, 'STANDARD', 'ACTIVE'), (2, 'A', 6, 'STANDARD', 'ACTIVE'), (2, 'A', 7, 'STANDARD', 'ACTIVE'), (2, 'A', 8, 'STANDARD', 'ACTIVE'),
  (2, 'B', 1, 'STANDARD', 'ACTIVE'), (2, 'B', 2, 'STANDARD', 'ACTIVE'), (2, 'B', 3, 'STANDARD', 'ACTIVE'), (2, 'B', 4, 'STANDARD', 'ACTIVE'),
  (2, 'B', 5, 'STANDARD', 'ACTIVE'), (2, 'B', 6, 'STANDARD', 'ACTIVE'), (2, 'B', 7, 'STANDARD', 'ACTIVE'), (2, 'B', 8, 'STANDARD', 'ACTIVE'),
  (2, 'C', 1, 'STANDARD', 'ACTIVE'), (2, 'C', 2, 'STANDARD', 'ACTIVE'), (2, 'C', 3, 'STANDARD', 'ACTIVE'), (2, 'C', 4, 'STANDARD', 'ACTIVE'),
  (2, 'C', 5, 'STANDARD', 'ACTIVE'), (2, 'C', 6, 'STANDARD', 'ACTIVE'), (2, 'C', 7, 'STANDARD', 'ACTIVE'), (2, 'C', 8, 'STANDARD', 'ACTIVE'),
  (2, 'D', 1, 'VIP', 'ACTIVE'), (2, 'D', 2, 'VIP', 'ACTIVE'), (2, 'D', 3, 'VIP', 'ACTIVE'), (2, 'D', 4, 'VIP', 'ACTIVE'),
  (2, 'D', 5, 'VIP', 'ACTIVE'), (2, 'D', 6, 'VIP', 'ACTIVE'), (2, 'D', 7, 'VIP', 'ACTIVE'), (2, 'D', 8, 'VIP', 'ACTIVE'),
  (2, 'E', 1, 'VIP', 'ACTIVE'), (2, 'E', 2, 'VIP', 'ACTIVE'), (2, 'E', 3, 'VIP', 'ACTIVE'), (2, 'E', 4, 'VIP', 'ACTIVE'),
  (2, 'E', 5, 'VIP', 'ACTIVE'), (2, 'E', 6, 'VIP', 'ACTIVE'), (2, 'E', 7, 'VIP', 'ACTIVE'), (2, 'E', 8, 'VIP', 'ACTIVE');
