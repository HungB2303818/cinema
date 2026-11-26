package com.example.cinema.showtime.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record BatchAutoGenerateShowtimesRequest(
        @NotNull(message = "Cụm rạp là bắt buộc.")
        @Positive(message = "Mã cụm rạp phải là số dương.")
        Long cinemaId,

        @NotEmpty(message = "Phải chọn ít nhất một phòng chiếu.")
        @Size(max = 50, message = "Tối đa 50 phòng mỗi lần tạo.")
        List<@NotNull @Positive(message = "Mã phòng phải là số dương.") Long> roomIds,

        @NotEmpty(message = "Phải chọn ít nhất một phim.")
        @Size(max = 50, message = "Tối đa 50 phim mỗi lần tạo.")
        List<@NotNull @Positive(message = "Mã phim phải là số dương.") Long> movieIds,

        @NotNull(message = "Ngày bắt đầu là bắt buộc.")
        LocalDate from,

        @NotNull(message = "Ngày kết thúc là bắt buộc.")
        LocalDate to,

        @NotEmpty(message = "Phải chọn ít nhất một thứ trong tuần.")
        @Size(max = 7, message = "Chỉ có tối đa 7 thứ trong tuần.")
        List<@Min(1) @Max(7) Integer> daysOfWeek,

        @NotNull(message = "Giờ mở cửa là bắt buộc.")
        @JsonFormat(pattern = "HH:mm")
        LocalTime openTime,

        @NotNull(message = "Giờ đóng cửa là bắt buộc.")
        @JsonFormat(pattern = "HH:mm")
        LocalTime closeTime,

        @Min(value = 5, message = "Bước slot tối thiểu 5 phút.")
        @Max(value = 120, message = "Bước slot tối đa 120 phút.")
        Integer slotStepMinutes,

        @Min(value = 0, message = "Thời gian dọn phòng không được âm.")
        @Max(value = 240, message = "Thời gian dọn phòng tối đa 240 phút.")
        Integer cleanupMinutes,

        @Min(value = 0, message = "Độ lệch giờ giữa các phòng không được âm.")
        @Max(value = 120, message = "Độ lệch giờ giữa các phòng tối đa 120 phút.")
        Integer staggerMinutes,

        @NotNull(message = "Giá vé cơ bản là bắt buộc.")
        @DecimalMin(value = "0.00", message = "Giá vé cơ bản không được âm.")
        @Digits(integer = 10, fraction = 2, message = "Giá vé cơ bản tối đa 10 chữ số nguyên và 2 chữ số thập phân.")
        BigDecimal basePrice,

        @DecimalMin(value = "0.00", message = "Phụ phí VIP không được âm.")
        @Digits(integer = 10, fraction = 2, message = "Phụ phí VIP tối đa 10 chữ số nguyên và 2 chữ số thập phân.")
        BigDecimal vipSurcharge
) {
}
