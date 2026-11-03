package com.example.cinema.cinema.dto;

import com.example.cinema.cinema.entity.RoomStatus;
import jakarta.validation.constraints.*;

public record RoomRequest(@NotNull(message = "Mã rạp là bắt buộc.")
                          @Positive(message = "Mã rạp phải là số dương.") Long cinemaId,
                          @NotBlank(message = "Tên phòng không được để trống.")
                          @Size(max = 50, message = "Tên phòng tối đa 50 ký tự.") String name,
                          @NotNull(message = "Trạng thái phòng là bắt buộc.") RoomStatus status) { }
