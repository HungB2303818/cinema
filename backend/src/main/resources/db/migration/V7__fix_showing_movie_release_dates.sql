-- V7: Cố định ngày phát hành của toàn bộ phim đang chiếu thành 20/11/2026.
-- Giữ nguyên V5 đã chạy; không thay đổi trạng thái hoặc ngày của phim sắp chiếu.
UPDATE movies
SET release_date = '2026-11-20'
WHERE status = 'SHOWING';
