package com.example.cinema.cinema.dto;

import com.example.cinema.cinema.entity.PhysicalSeatStatus;
import com.example.cinema.cinema.entity.SeatType;
import jakarta.validation.constraints.*;

public record SeatRequest(@NotBlank(message = "Hàng ghế không được để trống.")
                          @Pattern(regexp = "[A-Za-z]{1,5}", message = "Hàng ghế gồm 1–5 chữ cái A–Z.") String seatRow,
                          @NotNull(message = "Số ghế là bắt buộc.")
                          @Min(value = 1, message = "Số ghế phải >= 1.")
                          @Max(value = 65535, message = "Số ghế tối đa 65535.") Integer seatNumber,
                          @NotNull(message = "Loại ghế là bắt buộc.") SeatType seatType,
                          @NotNull(message = "Trạng thái ghế là bắt buộc.") PhysicalSeatStatus status) { }
