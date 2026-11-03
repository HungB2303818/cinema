package com.example.cinema.booking.service;

import com.example.cinema.booking.dto.*;
import com.example.cinema.booking.entity.Booking;
import com.example.cinema.common.error.*;
import java.util.List;
import java.util.TreeSet;

final class BookingReplay {
    private BookingReplay() { }

    static BookingCreationResult result(Booking booking, BookingCreateRequest request, List<Long> storedSeatIds) {
        if (!booking.getShowtime().getId().equals(request.showtimeId())
                || !new TreeSet<>(storedSeatIds).equals(new TreeSet<>(request.seatIds()))) {
            throw new AppException(ErrorCode.IDEMPOTENCY_CONFLICT);
        }
        return new BookingCreationResult(BookingResponse.from(booking, storedSeatIds), false);
    }
}
