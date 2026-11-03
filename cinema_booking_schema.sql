-- CINEMA BOOKING SYSTEM - MySQL 8.0.16+
-- Phiên bản thiết kế: 1.0 | Ngày: 2026-11-03
-- Quy ước: DATETIME(3) lưu UTC; khi hiển thị chuyển sang múi giờ Asia/Ho_Chi_Minh.
-- SQL chỉ tạo cấu trúc; các ràng buộc liên bảng phức tạp phải được bảo vệ ở service/transaction.

CREATE DATABASE IF NOT EXISTS cinema_booking
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinema_booking;

CREATE TABLE users (
    id BIGINT NOT NULL AUTO_INCREMENT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('CUSTOMER','STAFF','ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE movies (
    id BIGINT NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    duration_minutes SMALLINT UNSIGNED NOT NULL,
    genre VARCHAR(100) NULL,
    age_rating VARCHAR(20) NULL,
    release_date DATE NULL,
    poster_url VARCHAR(500) NULL,
    status ENUM('UPCOMING','SHOWING','ENDED','HIDDEN') NOT NULL DEFAULT 'UPCOMING',
    PRIMARY KEY (id),
    CONSTRAINT ck_movies_duration CHECK (duration_minutes > 0),
    INDEX idx_movies_status_release (status, release_date)
) ENGINE=InnoDB;

CREATE TABLE cinemas (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NOT NULL,
    status ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE rooms (
    id BIGINT NOT NULL AUTO_INCREMENT,
    cinema_id BIGINT NOT NULL,
    name VARCHAR(50) NOT NULL,
    status ENUM('ACTIVE','MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (id),
    UNIQUE KEY uk_room_name_in_cinema (cinema_id, name),
    CONSTRAINT fk_rooms_cinema FOREIGN KEY (cinema_id)
        REFERENCES cinemas (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE seats (
    id BIGINT NOT NULL AUTO_INCREMENT,
    room_id BIGINT NOT NULL,
    seat_row VARCHAR(5) NOT NULL,
    seat_number SMALLINT UNSIGNED NOT NULL,
    seat_type ENUM('STANDARD','VIP') NOT NULL DEFAULT 'STANDARD',
    status ENUM('ACTIVE','MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (id),
    UNIQUE KEY uk_seat_position (room_id, seat_row, seat_number),
    CONSTRAINT ck_seats_number CHECK (seat_number > 0),
    CONSTRAINT fk_seats_room FOREIGN KEY (room_id)
        REFERENCES rooms (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE showtimes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    movie_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    starts_at DATETIME(3) NOT NULL,
    ends_at DATETIME(3) NOT NULL,
    cleanup_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 15,
    base_price DECIMAL(12,2) NOT NULL,
    vip_surcharge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('SCHEDULED','CANCELLED','COMPLETED') NOT NULL DEFAULT 'SCHEDULED',
    PRIMARY KEY (id),
    CONSTRAINT ck_showtimes_time CHECK (ends_at > starts_at),
    CONSTRAINT ck_showtimes_prices CHECK (base_price >= 0 AND vip_surcharge >= 0),
    INDEX idx_showtimes_room_time (room_id, starts_at, ends_at),
    INDEX idx_showtimes_movie_time (movie_id, starts_at),
    CONSTRAINT fk_showtimes_movie FOREIGN KEY (movie_id)
        REFERENCES movies (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_showtimes_room FOREIGN KEY (room_id)
        REFERENCES rooms (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE bookings (
    id BIGINT NOT NULL AUTO_INCREMENT,
    booking_code VARCHAR(32) NOT NULL,
    user_id BIGINT NOT NULL,
    showtime_id BIGINT NOT NULL,
    client_request_id VARCHAR(64) NULL,
    status ENUM('PENDING','CONFIRMED','EXPIRED','CANCELLED','FAILED')
        NOT NULL DEFAULT 'PENDING',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),
    confirmed_at DATETIME(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_booking_code (booking_code),
    UNIQUE KEY uk_booking_request (user_id, client_request_id),
    CONSTRAINT ck_bookings_amount CHECK (total_amount >= 0),
    INDEX idx_bookings_expire (status, expires_at),
    INDEX idx_bookings_user_created (user_id, created_at),
    INDEX idx_bookings_showtime_status (showtime_id, status),
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_bookings_showtime FOREIGN KEY (showtime_id)
        REFERENCES showtimes (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE showtime_seats (
    id BIGINT NOT NULL AUTO_INCREMENT,
    showtime_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    status ENUM('AVAILABLE','HELD','BOOKED') NOT NULL DEFAULT 'AVAILABLE',
    current_booking_id BIGINT NULL,
    hold_expires_at DATETIME(3) NULL,
    version BIGINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uk_showtime_seat (showtime_id, seat_id),
    INDEX idx_showtime_seats_booker (current_booking_id),
    INDEX idx_showtime_seats_expire (status, hold_expires_at),
    CONSTRAINT ck_showtime_seat_state CHECK (
        (status = 'AVAILABLE' AND current_booking_id IS NULL AND hold_expires_at IS NULL)
        OR
        (status = 'HELD' AND current_booking_id IS NOT NULL AND hold_expires_at IS NOT NULL)
        OR
        (status = 'BOOKED' AND current_booking_id IS NOT NULL AND hold_expires_at IS NULL)
    ),
    CONSTRAINT fk_showtime_seats_showtime FOREIGN KEY (showtime_id)
        REFERENCES showtimes (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_showtime_seats_seat FOREIGN KEY (seat_id)
        REFERENCES seats (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_showtime_seats_booking FOREIGN KEY (current_booking_id)
        REFERENCES bookings (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE booking_seats (
    id BIGINT NOT NULL AUTO_INCREMENT,
    booking_id BIGINT NOT NULL,
    showtime_seat_id BIGINT NOT NULL,
    ticket_code VARCHAR(48) NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_booking_seat_item (booking_id, showtime_seat_id),
    UNIQUE KEY uk_ticket_code (ticket_code),
    INDEX idx_booking_seats_showtime_seat (showtime_seat_id),
    CONSTRAINT ck_booking_seats_price CHECK (unit_price >= 0),
    CONSTRAINT fk_booking_seats_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_booking_seats_showtime_seat FOREIGN KEY (showtime_seat_id)
        REFERENCES showtime_seats (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE payments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    booking_id BIGINT NOT NULL,
    method ENUM('MOCK','CASH') NOT NULL DEFAULT 'MOCK',
    status ENUM('INITIATED','SUCCESS','FAILED') NOT NULL DEFAULT 'INITIATED',
    amount DECIMAL(12,2) NOT NULL,
    idempotency_key VARCHAR(64) NOT NULL,
    transaction_code VARCHAR(100) NULL,
    failure_reason VARCHAR(255) NULL,
    paid_at DATETIME(3) NULL,
    created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    -- MySQL không có partial unique index: generated column giới hạn 1 SUCCESS / booking.
    successful_booking_id BIGINT GENERATED ALWAYS AS (
        CASE WHEN status = 'SUCCESS' THEN booking_id ELSE NULL END
    ) STORED,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payment_idempotency (idempotency_key),
    UNIQUE KEY uk_payment_transaction (transaction_code),
    UNIQUE KEY uk_payment_one_success (successful_booking_id),
    INDEX idx_payments_booking_created (booking_id, created_at),
    CONSTRAINT ck_payments_amount CHECK (amount >= 0),
    CONSTRAINT ck_payments_success_time CHECK (status <> 'SUCCESS' OR paid_at IS NOT NULL),
    CONSTRAINT fk_payments_booking FOREIGN KEY (booking_id)
        REFERENCES bookings (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE ticket_checkins (
    id BIGINT NOT NULL AUTO_INCREMENT,
    booking_seat_id BIGINT NOT NULL,
    staff_id BIGINT NOT NULL,
    checked_in_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY uk_ticket_checkin_once (booking_seat_id),
    INDEX idx_ticket_checkins_staff_time (staff_id, checked_in_at),
    CONSTRAINT fk_ticket_checkins_ticket FOREIGN KEY (booking_seat_id)
        REFERENCES booking_seats (id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_ticket_checkins_staff FOREIGN KEY (staff_id)
        REFERENCES users (id) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

-- THÔNG TIN TRIỂN KHAI:
-- 1) Bảo đảm showtime_seats.seat_id thuộc room_id của showtime ở application service.
-- 2) Bảo đảm booking_seats.showtime_seat_id thuộc showtime_id của booking ở service.
-- 3) Khóa rooms row (SELECT ... FOR UPDATE) và kiểm tra interval overlap khi tạo suất chiếu.
-- 4) Khóa bookings rồi showtime_seats theo ID tăng dần khi giữ/confirm/hủy/hết hạn.
-- 5) Dọn booking hết hạn theo lịch; chỉ giải phóng showtime_seats.current_booking_id = booking đó.
-- 6) Để tránh mất ghế khi retry, booking yêu cầu client_request_id và payment có idempotency_key.
-- 7) Không xóa vật lý phim, phòng, ghế, suất chiếu đã có giao dịch; chỉ đổi trạng thái.
