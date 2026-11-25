package com.example.cinema.booking.dto;

import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.showtime.entity.ShowtimeStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record BookingSummaryResponse(Long bookingId, String bookingCode, BookingStatus status,
                                     BookingStatus effectiveStatus, String movieTitle, Instant startsAt,
                                     BigDecimal totalAmount, Instant createdAt, Instant expiresAt,
                                     String cinemaName, String roomName, MovieStatus movieStatus,
                                     ShowtimeStatus showtimeStatus, Instant endsAt) {
    public static BookingSummaryResponse from(Booking booking, Instant now) {
        BookingStatus effective = booking.getStatus() == BookingStatus.PENDING && !booking.getExpiresAt().isAfter(now)
                ? BookingStatus.EXPIRED : booking.getStatus();
        var showtime = booking.getShowtime();
        return new BookingSummaryResponse(booking.getId(), booking.getBookingCode(), booking.getStatus(), effective,
                showtime.getMovie().getTitle(), showtime.getStartsAt(),
                booking.getTotalAmount(), booking.getCreatedAt(), booking.getExpiresAt(),
                showtime.getRoom().getCinema().getName(), showtime.getRoom().getName(),
                showtime.getMovie().getStatus(), showtime.getStatus(), showtime.getEndsAt());
    }
}
