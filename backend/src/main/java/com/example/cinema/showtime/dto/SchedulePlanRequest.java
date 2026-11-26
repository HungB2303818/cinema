package com.example.cinema.showtime.dto;

import com.example.cinema.showtime.entity.SchedulePlanStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record SchedulePlanRequest(
        @NotBlank(message = "Tên kế hoạch là bắt buộc.")
        @Size(max = 150, message = "Tên kế hoạch tối đa 150 ký tự.")
        String name,

        @NotNull(message = "Phòng chiếu là bắt buộc.")
        @Positive(message = "Mã phòng phải là số dương.")
        Long roomId,

        @NotNull(message = "Ngày bắt đầu hiệu lực là bắt buộc.")
        LocalDate effectiveFrom,

        @NotNull(message = "Ngày kết thúc hiệu lực là bắt buộc.")
        LocalDate effectiveTo,

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

        @NotNull(message = "Giá vé cơ bản là bắt buộc.")
        @DecimalMin(value = "0.00", message = "Giá vé cơ bản không được âm.")
        @Digits(integer = 10, fraction = 2, message = "Giá vé cơ bản tối đa 10 chữ số nguyên và 2 chữ số thập phân.")
        BigDecimal basePrice,

        @DecimalMin(value = "0.00", message = "Phụ phí VIP không được âm.")
        @Digits(integer = 10, fraction = 2, message = "Phụ phí VIP tối đa 10 chữ số nguyên và 2 chữ số thập phân.")
        BigDecimal vipSurcharge,

        @NotEmpty(message = "Phải chọn ít nhất một phim.")
        @Size(max = 50, message = "Mỗi kế hoạch tối đa 50 phim.")
        List<@NotNull @Positive(message = "Mã phim phải là số dương.") Long> movieIds,

        SchedulePlanStatus status) {
}
