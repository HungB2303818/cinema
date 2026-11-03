package com.example.cinema.showtime.dto;

import com.example.cinema.cinema.entity.SeatType;
import com.example.cinema.showtime.entity.ShowtimeSeatStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record SeatMapResponse(Long showtimeId, Instant startsAt, Instant bookingClosesAt, List<SeatItem> seats) {
    public record SeatItem(Long seatId, String label, SeatType seatType, ShowtimeSeatStatus status, BigDecimal price) { }
}
