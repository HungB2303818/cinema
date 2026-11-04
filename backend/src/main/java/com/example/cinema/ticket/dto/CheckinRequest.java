package com.example.cinema.ticket.dto;

import jakarta.validation.constraints.*;

public record CheckinRequest(@NotBlank(message = "Mã vé không được trống.")
        @Size(max = 48, message = "Mã vé tối đa 48 ký tự.") String ticketCode) { }
