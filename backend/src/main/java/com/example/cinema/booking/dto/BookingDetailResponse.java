package com.example.cinema.booking.dto;

import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.cinema.entity.SeatType;
import com.example.cinema.showtime.entity.ShowtimeStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record BookingDetailResponse(Long bookingId, String bookingCode, Long showtimeId,
                                    String movieTitle, String roomName, Instant startsAt,
                                    BookingStatus status, BookingStatus effectiveStatus,
                                    BigDecimal totalAmount, Instant createdAt, Instant expiresAt,
                                    List<SeatItem> seats, String cinemaName, MovieStatus movieStatus,
                                    ShowtimeStatus showtimeStatus, Instant endsAt) {
    // Ticket codes belong to the separate tickets endpoint (TASK-14), never inventory ownership IDs.
    public record SeatItem(Long seatId, String label, SeatType seatType, BigDecimal unitPrice) { }
}
