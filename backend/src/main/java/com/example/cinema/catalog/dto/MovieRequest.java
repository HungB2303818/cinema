package com.example.cinema.catalog.dto;

import com.example.cinema.catalog.entity.MovieStatus;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record MovieRequest(
        @NotBlank(message = "Tên phim không được để trống.")
        @Size(max = 255, message = "Tên phim tối đa 255 ký tự.") String title,
        @Size(max = 16000, message = "Mô tả tối đa 16000 ký tự.") String description,
        @NotNull(message = "Thời lượng là bắt buộc.")
        @Min(value = 1, message = "Thời lượng phải lớn hơn 0.")
        @Max(value = 65535, message = "Thời lượng tối đa 65535 phút.") Integer durationMinutes,
        @Size(max = 100, message = "Thể loại tối đa 100 ký tự.") String genre,
        @Size(max = 20, message = "Nhãn độ tuổi tối đa 20 ký tự.") String ageRating,
        LocalDate releaseDate,
        @Size(max = 500, message = "URL poster tối đa 500 ký tự.")
        @Pattern(regexp = "(?i)^https?://[^\\s]+$", message = "Poster phải là URL HTTP hoặc HTTPS.") String posterUrl,
        @NotNull(message = "Trạng thái phim là bắt buộc.") MovieStatus status
) {
}
