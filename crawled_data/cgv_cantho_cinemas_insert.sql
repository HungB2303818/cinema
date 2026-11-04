-- DỮ LIỆU CỤM RẠP CGV TỈNH CẦN THƠ
-- Nguồn: https://www.cgv.vn/default/cinox/site/
-- Chuẩn hóa theo Schema bảng `cinemas` và `rooms` của dự án Cinema Booking
-- Ngày cào: 2026-11-04

USE cinema_booking;
SET NAMES utf8mb4;

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
