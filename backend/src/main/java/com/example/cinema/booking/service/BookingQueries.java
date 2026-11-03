package com.example.cinema.booking.service;

import com.example.cinema.booking.dto.*;
import com.example.cinema.booking.entity.*;
import com.example.cinema.booking.repository.*;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.common.util.Requests;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW, isolation = Isolation.REPEATABLE_READ)
public class BookingQueries {
    private final BookingRepository bookings;
    private final BookingSeatRepository selections;
    private final DatabaseTime time;

    public Optional<BookingCreationResult> replay(long userId, BookingCreateRequest request) {
        return bookings.findByUserIdAndClientRequestId(userId, request.clientRequestId())
                .map(booking -> BookingReplay.result(booking, request, selections.findPhysicalSeatIds(booking.getId())));
    }

    public PageResponse<BookingSummaryResponse> history(long userId, int page, int size, String sort) {
        var pageable = Requests.page(page, size, sort, Set.of("id", "createdAt", "startsAt", "status"));
        // API startsAt is a controlled alias, never arbitrary client-supplied property navigation.
        if (pageable.getSort().getOrderFor("startsAt") != null) {
            var direction = pageable.getSort().getOrderFor("startsAt").getDirection();
            pageable = PageRequest.of(page, size, org.springframework.data.domain.Sort.by(direction, "showtime.startsAt")
                    .and(org.springframework.data.domain.Sort.by("id")));
        }
        Instant now = time.now();
        return PageResponse.from(bookings.findByUserId(userId, pageable).map(booking -> BookingSummaryResponse.from(booking, now)));
    }

    public BookingDetailResponse detail(long userId, boolean admin, Long id) {
        Booking booking = bookings.findById(id).orElseThrow(this::notFound);
        if (!admin && !booking.getUser().getId().equals(userId)) throw notFound();
        var summary = BookingSummaryResponse.from(booking, time.now());
        var items = selections.findDetails(id).stream().map(item -> {
            var row = item.getShowtimeSeat();
            if (!row.getShowtime().getId().equals(booking.getShowtime().getId())
                    || !row.getSeat().getRoom().getId().equals(booking.getShowtime().getRoom().getId())) {
                throw new IllegalStateException("Ghế lịch sử không thuộc suất của booking.");
            }
            var seat = row.getSeat();
            return new BookingDetailResponse.SeatItem(seat.getId(), seat.getSeatRow() + seat.getSeatNumber(),
                    seat.getSeatType(), item.getUnitPrice());
        }).toList();
        return new BookingDetailResponse(id, booking.getBookingCode(), booking.getShowtime().getId(), summary.movieTitle(),
                booking.getShowtime().getRoom().getName(), summary.startsAt(), booking.getStatus(), summary.effectiveStatus(),
                booking.getTotalAmount(), booking.getCreatedAt(), booking.getExpiresAt(), items);
    }

    public List<Long> expiredIds() {
        return bookings.findExpiredIds(time.now(), PageRequest.of(0, 100));
    }

    private AppException notFound() {
        return new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy đơn đặt vé.");
    }
}
