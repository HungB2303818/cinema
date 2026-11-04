package com.example.cinema.ticket.service;

import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.booking.repository.*;
import com.example.cinema.common.error.*;
import com.example.cinema.ticket.dto.TicketResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW, isolation = Isolation.REPEATABLE_READ)
public class TicketQueries {
    private final BookingRepository bookings;
    private final BookingSeatRepository selections;

    public List<TicketResponse> tickets(long actorId, boolean admin, Long id) {
        var booking = bookings.findById(id).orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!admin && !booking.getUser().getId().equals(actorId)) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
        if (booking.getStatus() != BookingStatus.CONFIRMED) throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);
        var items = selections.findDetails(id);
        if (items.isEmpty()) throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);
        return items.stream().map(item -> {
            var row = item.getShowtimeSeat();
            if (item.getTicketCode() == null || !row.getShowtime().getId().equals(booking.getShowtime().getId())
                    || !row.getSeat().getRoom().getId().equals(booking.getShowtime().getRoom().getId())) {
                throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);
            }
            return TicketResponse.from(item);
        }).toList();
    }
}
