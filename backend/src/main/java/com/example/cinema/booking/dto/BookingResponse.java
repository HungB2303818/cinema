package com.example.cinema.booking.dto;

import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record BookingResponse(Long bookingId, String bookingCode, Long showtimeId, BookingStatus status,
                              List<Long> seatIds, BigDecimal totalAmount, Instant expiresAt) {
    public static BookingResponse from(Booking booking, List<Long> seatIds) {
        return new BookingResponse(booking.getId(), booking.getBookingCode(), booking.getShowtime().getId(),
                booking.getStatus(), seatIds, booking.getTotalAmount(), booking.getExpiresAt());
    }
}
