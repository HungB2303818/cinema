package com.example.cinema.payment.service;

import com.example.cinema.booking.entity.*;
import com.example.cinema.booking.repository.*;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.payment.dto.*;
import com.example.cinema.payment.entity.*;
import com.example.cinema.payment.repository.PaymentRepository;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.ShowtimeSeatRepository;
import com.example.cinema.ticket.service.TicketCodes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.util.*;

/** Internal worker; callers must supply the authenticated owner's ID through PaymentService. */
@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
public class PaymentTransactions {
    private final BookingRepository bookings;
    private final BookingSeatRepository selections;
    private final ShowtimeSeatRepository inventory;
    private final PaymentRepository payments;
    private final TicketCodes codes;
    private final DatabaseTime time;

    public PaymentResponse pay(long userId, Long id, MockPaymentRequest request) {
        var booking = bookings.findByIdForUpdate(id).orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!booking.getUser().getId().equals(userId)) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
        var previous = payments.findByIdempotencyKey(request.idempotencyKey());
        if (previous.isPresent()) return PaymentResults.replay(previous.get(), id, request, selections);
        if (booking.getStatus() == BookingStatus.EXPIRED) throw new AppException(ErrorCode.BOOKING_EXPIRED);
        if (booking.getStatus() != BookingStatus.PENDING) throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);

        // Do not load inventory entities until their individual locking read has completed.
        List<ShowtimeSeat> locked = new ArrayList<>();
        for (Long inventoryId : new TreeSet<>(selections.findInventoryIds(id))) {
            locked.add(inventory.findByIdForUpdate(inventoryId).orElseThrow(() -> new AppException(ErrorCode.SEAT_NOT_BOOKABLE)));
        }
        var now = time.now(); // Includes time spent waiting for booking and seat locks.
        if (!booking.getExpiresAt().isAfter(now)) throw new AppException(ErrorCode.BOOKING_EXPIRED);
        if (booking.getShowtime().getStatus() != ShowtimeStatus.SCHEDULED) throw new AppException(ErrorCode.SHOWTIME_UNAVAILABLE);
        var items = selections.findDetails(id);
        if (items.isEmpty() || items.size() > 8 || items.size() != locked.size()) throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);
        BigDecimal total = BigDecimal.ZERO;
        for (var row : locked) {
            if (!row.getShowtime().getId().equals(booking.getShowtime().getId())
                    || !row.getSeat().getRoom().getId().equals(booking.getShowtime().getRoom().getId())) {
                throw new AppException(ErrorCode.SEAT_NOT_IN_ROOM);
            }
            if (row.getStatus() != ShowtimeSeatStatus.HELD || !id.equals(row.getCurrentBookingId())
                    || row.getHoldExpiresAt() == null || !row.getHoldExpiresAt().isAfter(now)) {
                throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);
            }
        }
        for (var item : items) {
            if (item.getTicketCode() != null) throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);
            total = total.add(item.getUnitPrice());
        }
        if (total.compareTo(booking.getTotalAmount()) != 0) throw new AppException(ErrorCode.BOOKING_AMOUNT_INVALID);
        boolean success = request.simulatedResult() == MockPaymentRequest.Result.SUCCESS;
        var payment = payments.saveAndFlush(Payment.builder().booking(booking).method(PaymentMethod.MOCK)
                .status(success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED).amount(total)
                .idempotencyKey(request.idempotencyKey()).transactionCode(UUID.randomUUID().toString())
                .createdAt(now).paidAt(success ? now : null).failureReason(success ? null : "MOCK_FAILED").build());
        if (success) {
            for (var row : locked) {
                row.setStatus(ShowtimeSeatStatus.BOOKED);
                row.setHoldExpiresAt(null);
            }
            for (var item : items) item.setTicketCode(codes.generate());
            booking.setStatus(BookingStatus.CONFIRMED);
            booking.setConfirmedAt(now);
            booking.setUpdatedAt(now);
            selections.flush(); // UNIQUE ticket code and all other write failures roll back the entire payment.
        }
        return PaymentResults.response(payment, selections);
    }
}
