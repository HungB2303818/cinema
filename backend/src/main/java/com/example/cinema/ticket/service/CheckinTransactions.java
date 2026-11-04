package com.example.cinema.ticket.service;

import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.booking.repository.*;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.entity.ShowtimeStatus;
import com.example.cinema.ticket.dto.*;
import com.example.cinema.ticket.entity.TicketCheckin;
import com.example.cinema.ticket.repository.TicketCheckinRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
public class CheckinTransactions {
    public record CheckedIn(Long checkinId, CheckinResponse response) { }
    private final BookingRepository bookings;
    private final BookingSeatRepository selections;
    private final TicketCheckinRepository checkins;
    private final UserRepository users;
    private final DatabaseTime time;

    public CheckedIn checkin(long staffId, CheckinRequest request) {
        // Scalar lookup avoids caching booking state before the locking read.
        Long bookingId = selections.findBookingIdByTicketCode(request.ticketCode())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        var booking = bookings.findByIdForUpdate(bookingId).orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        var ticket = selections.findByTicketCode(request.ticketCode()).orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!ticket.getBooking().getId().equals(bookingId) || booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);
        }
        var showtime = booking.getShowtime();
        var row = ticket.getShowtimeSeat();
        if (!row.getShowtime().getId().equals(showtime.getId())
                || !row.getSeat().getRoom().getId().equals(showtime.getRoom().getId())) {
            throw new AppException(ErrorCode.SEAT_NOT_IN_ROOM);
        }
        if (checkins.existsByBookingSeatId(ticket.getId())) throw new AppException(ErrorCode.TICKET_ALREADY_USED);
        var now = time.now();
        if (showtime.getStatus() == ShowtimeStatus.CANCELLED || now.isBefore(showtime.getStartsAt().minusSeconds(1800))
                || now.isAfter(showtime.getEndsAt())) {
            throw new AppException(ErrorCode.CHECKIN_TIME_INVALID);
        }
        var checkin = checkins.saveAndFlush(TicketCheckin.builder().bookingSeat(ticket).staff(users.getReferenceById(staffId)).checkedInAt(now).build());
        return new CheckedIn(checkin.getId(), new CheckinResponse("CHECKED_IN", showtime.getMovie().getTitle(), showtime.getRoom().getName(),
                row.getSeat().getSeatRow() + row.getSeat().getSeatNumber(), now));
    }
}
