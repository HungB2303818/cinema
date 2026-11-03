package com.example.cinema.booking.dto;

import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record BookingSummaryResponse(Long bookingId, String bookingCode, BookingStatus status,
                                     BookingStatus effectiveStatus, String movieTitle, Instant startsAt,
                                     BigDecimal totalAmount, Instant createdAt, Instant expiresAt) {
    public static BookingSummaryResponse from(Booking booking, Instant now) {
        BookingStatus effective = booking.getStatus() == BookingStatus.PENDING && !booking.getExpiresAt().isAfter(now)
                ? BookingStatus.EXPIRED : booking.getStatus();
        return new BookingSummaryResponse(booking.getId(), booking.getBookingCode(), booking.getStatus(), effective,
                booking.getShowtime().getMovie().getTitle(), booking.getShowtime().getStartsAt(),
                booking.getTotalAmount(), booking.getCreatedAt(), booking.getExpiresAt());
    }
}
