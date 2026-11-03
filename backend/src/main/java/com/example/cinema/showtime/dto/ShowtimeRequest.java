package com.example.cinema.showtime.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;

public record ShowtimeRequest(@NotNull(message = "Mã phim là bắt buộc.")
                              @Positive(message = "Mã phim phải là số dương.") Long movieId,
                              @NotNull(message = "Mã phòng là bắt buộc.")
                              @Positive(message = "Mã phòng phải là số dương.") Long roomId,
                              @NotNull(message = "Giờ bắt đầu là bắt buộc.") Instant startsAt,
                              @NotNull(message = "Giờ kết thúc là bắt buộc.") Instant endsAt,
                              @Min(value = 0, message = "Thời gian dọn phòng không được âm.")
                              @Max(value = 65535, message = "Thời gian dọn phòng tối đa 65535 phút.") Integer cleanupMinutes,
                              @NotNull(message = "Giá vé cơ bản là bắt buộc.")
                              @DecimalMin(value = "0.00", message = "Giá vé không được âm.")
                              @Digits(integer = 10, fraction = 2, message = "Giá vé tối đa 10 chữ số nguyên, 2 chữ số thập phân.") BigDecimal basePrice,
                              @DecimalMin(value = "0.00", message = "Phụ phí không được âm.")
                              @Digits(integer = 10, fraction = 2, message = "Phụ phí tối đa 10 chữ số nguyên, 2 chữ số thập phân.") BigDecimal vipSurcharge) {
    public ShowtimeRequest {
        if (cleanupMinutes == null) cleanupMinutes = 15;
        if (vipSurcharge == null) vipSurcharge = BigDecimal.ZERO;
    }
}
