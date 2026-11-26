package com.example.cinema.showtime.dto;

import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record GenerateScheduleRequest(
        @NotNull(message = "Ngày bắt đầu là bắt buộc.") LocalDate from,
        @NotNull(message = "Ngày kết thúc là bắt buộc.") LocalDate to) {
}
