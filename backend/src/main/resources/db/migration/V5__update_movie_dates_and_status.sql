-- V5: Cập nhật ngày các phim đang chiếu thành ngày hôm nay
--     và tự động chuyển trạng thái các phim sắp chiếu đã đến ngày chiếu sang đang chiếu.
-- Múi giờ chuẩn hệ thống rạp: Asia/Ho_Chi_Minh (UTC+7).

-- 1. Cập nhật ngày phát hành của tất cả các phim đang chiếu (SHOWING) thành ngày hôm nay (giờ Việt Nam UTC+7)
UPDATE movies
SET release_date = DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR))
WHERE status = 'SHOWING';

-- 2. Chuyển trạng thái các phim sắp chiếu (UPCOMING) thành đang chiếu (SHOWING) nếu đã đến hoặc qua ngày phát hành (<= hôm nay)
UPDATE movies
SET status = 'SHOWING'
WHERE status = 'UPCOMING'
  AND release_date IS NOT NULL
  AND release_date <= DATE(DATE_ADD(UTC_TIMESTAMP(), INTERVAL 7 HOUR));
