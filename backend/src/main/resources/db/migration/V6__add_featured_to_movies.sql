-- V6: Thêm cờ is_featured để đánh dấu các phim đặc biệt hiển thị ưu tiên lên đầu trang
ALTER TABLE movies
    ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE AFTER poster_url;

CREATE INDEX idx_movies_featured_status ON movies (is_featured, status, release_date);

-- Đánh dấu 3 phim thử nghiệm là phim đặc biệt (Godzilla, Avengers, Dune)
UPDATE movies
SET is_featured = TRUE
WHERE title LIKE '%GODZILLA%'
   OR title LIKE '%AVENGERS%'
   OR title LIKE '%DUNE%';
