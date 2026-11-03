package com.example.cinema.booking.dto;

import com.example.cinema.common.validation.StrictLongDeserializer;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import jakarta.validation.constraints.*;
import java.util.HashSet;
import java.util.List;

public record BookingCreateRequest(
        @NotNull(message = "Mã suất chiếu là bắt buộc.") @Positive(message = "Mã suất chiếu phải dương.")
        @JsonDeserialize(using = StrictLongDeserializer.class) Long showtimeId,
        @NotEmpty(message = "Phải chọn ít nhất một ghế.") @Size(max = 8, message = "Mỗi booking tối đa 8 ghế.")
        @JsonDeserialize(contentUsing = StrictLongDeserializer.class)
        List<@NotNull(message = "Mã ghế không được null.") @Positive(message = "Mã ghế phải dương.") Long> seatIds,
        @NotBlank(message = "clientRequestId là bắt buộc.") @Size(max = 64, message = "clientRequestId tối đa 64 ký tự.")
        String clientRequestId) {
    public BookingCreateRequest {
        // Defensive copy permits null elements so Bean Validation can report them as HTTP 400.
        if (seatIds != null) seatIds = java.util.Collections.unmodifiableList(new java.util.ArrayList<>(seatIds));
    }

    @AssertTrue(message = "Danh sách ghế không được trùng lặp.")
    @JsonIgnore
    public boolean isSeatIdsUnique() {
        return seatIds == null || new HashSet<>(seatIds).size() == seatIds.size();
    }
}
