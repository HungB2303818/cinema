package com.example.cinema.booking.service;

import com.example.cinema.auth.repository.UserRepository;
import com.example.cinema.booking.dto.*;
import com.example.cinema.booking.entity.*;
import com.example.cinema.booking.repository.*;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.SeatRepository;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

/** Internal transaction worker. Actor IDs are supplied only by the authenticated BookingService facade. */
@Service
@RequiredArgsConstructor
@Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
public class BookingTransactions {
    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
    private final BookingRepository bookings;
    private final BookingSeatRepository selections;
    private final ShowtimeRepository showtimes;
    private final ShowtimeSeatRepository inventory;
    private final SeatRepository seats;
    private final UserRepository users;
    private final DatabaseTime time;

    public BookingCreationResult create(long userId, BookingCreateRequest request) {
        Optional<Booking> previous = bookings.findByUserIdAndClientRequestId(userId, request.clientRequestId());
        if (previous.isPresent()) {
            return BookingReplay.result(previous.get(), request, selections.findPhysicalSeatIds(previous.get().getId()));
        }
        // Shared guard excludes schedule edits; independent customers can still hold different seats concurrently.
        Showtime showtime = showtimes.findByIdForBooking(request.showtimeId()).orElseThrow(this::notFound);
        requireBookableShowtime(showtime);
        List<Seat> physical = seats.findByRoomIdAndIdIn(showtime.getRoom().getId(), request.seatIds());
        if (physical.size() != request.seatIds().size()) throw new AppException(ErrorCode.SEAT_NOT_IN_ROOM);
        if (physical.stream().anyMatch(seat -> seat.getStatus() != PhysicalSeatStatus.ACTIVE)) {
            throw new AppException(ErrorCode.SEAT_NOT_BOOKABLE);
        }
        Instant createdAt = time.now();
        BookingRules.requireBeforeCutoff(showtime.getStartsAt(), createdAt);
        Booking booking = bookings.saveAndFlush(Booking.builder()
                .bookingCode(UUID.randomUUID().toString().replace("-", ""))
                .user(users.getReferenceById(userId)).showtime(showtime).clientRequestId(request.clientRequestId())
                .createdAt(createdAt).updatedAt(createdAt).expiresAt(createdAt.plusSeconds(BookingRules.HOLD_SECONDS)).build());

        // Resolve scalar IDs, NOT managed inventory entities that could remain stale while waiting for locks.
        List<Long> ids = inventory.resolveInventoryIds(showtime.getId(), request.seatIds());
        if (ids.size() != request.seatIds().size()) throw new AppException(ErrorCode.SEAT_NOT_BOOKABLE);
        List<ShowtimeSeat> locked = lockInventory(ids);
        Instant now = time.now(); // Recheck after all waits: never hold a seat using a stale cutoff/TTL clock sample.
        BookingRules.requireBeforeCutoff(showtime.getStartsAt(), now);
        if (!booking.getExpiresAt().isAfter(now)) throw new AppException(ErrorCode.BOOKING_EXPIRED);

        BigDecimal total = BigDecimal.ZERO;
        List<BookingSeat> items = new ArrayList<>();
        for (ShowtimeSeat row : locked) {
            requireMatchingInventory(booking, row);
            if (row.getSeat().getStatus() != PhysicalSeatStatus.ACTIVE) throw new AppException(ErrorCode.SEAT_NOT_BOOKABLE);
            if (row.getStatus() == ShowtimeSeatStatus.BOOKED
                    || row.getStatus() == ShowtimeSeatStatus.HELD && row.getHoldExpiresAt().isAfter(now)) {
                throw new AppException(ErrorCode.SEAT_UNAVAILABLE);
            }
            BigDecimal price = showtime.getBasePrice();
            if (row.getSeat().getSeatType() == SeatType.VIP) price = price.add(showtime.getVipSurcharge());
            total = total.add(price);
            row.setStatus(ShowtimeSeatStatus.HELD);
            row.setCurrentBookingId(booking.getId());
            row.setHoldExpiresAt(booking.getExpiresAt());
            items.add(BookingSeat.builder().booking(booking).showtimeSeat(row).unitPrice(price).build());
        }
        if (total.compareTo(MAX_AMOUNT) > 0) throw new AppException(ErrorCode.BOOKING_AMOUNT_INVALID);
        booking.setTotalAmount(total);
        booking.setUpdatedAt(now);
        selections.saveAllAndFlush(items);
        return new BookingCreationResult(BookingResponse.from(booking, request.seatIds().stream().sorted().toList()), true);
    }

    public BookingCancelResponse cancel(long userId, Long id) {
        Booking booking = bookings.findByIdForUpdate(id).orElseThrow(this::notFound);
        if (!booking.getUser().getId().equals(userId)) throw notFound();
        if (booking.getStatus() == BookingStatus.CANCELLED) return new BookingCancelResponse(id, BookingStatus.CANCELLED, 0);
        if (booking.getStatus() == BookingStatus.EXPIRED) throw new AppException(ErrorCode.BOOKING_EXPIRED);
        if (booking.getStatus() != BookingStatus.PENDING) throw new AppException(ErrorCode.BOOKING_STATE_CONFLICT);
        List<ShowtimeSeat> locked = lockInventory(selections.findInventoryIds(id));
        Instant now = time.now();
        if (!booking.getExpiresAt().isAfter(now)) throw new AppException(ErrorCode.BOOKING_EXPIRED);
        int count = releaseOwned(booking, locked);
        booking.setStatus(BookingStatus.CANCELLED);
        booking.setUpdatedAt(now);
        bookings.flush();
        return new BookingCancelResponse(id, BookingStatus.CANCELLED, count);
    }

    public boolean expire(Long id) {
        Optional<Booking> existing = bookings.findByIdForUpdate(id);
        if (existing.isEmpty() || existing.get().getStatus() != BookingStatus.PENDING) return false;
        Booking booking = existing.get();
        if (booking.getExpiresAt().isAfter(time.now())) return false;
        List<ShowtimeSeat> locked = lockInventory(selections.findInventoryIds(id));
        Instant now = time.now();
        if (booking.getExpiresAt().isAfter(now)) return false;
        releaseOwned(booking, locked);
        booking.setStatus(BookingStatus.EXPIRED);
        booking.setUpdatedAt(now);
        bookings.flush();
        return true;
    }

    private List<ShowtimeSeat> lockInventory(List<Long> ids) {
        List<ShowtimeSeat> rows = new ArrayList<>();
        for (Long id : new TreeSet<>(ids)) {
            rows.add(inventory.findByIdForUpdate(id).orElseThrow(() ->
                    new IllegalStateException("Inventory tham chiếu không tồn tại.")));
        }
        return rows;
    }

    private int releaseOwned(Booking booking, List<ShowtimeSeat> rows) {
        int count = 0;
        for (ShowtimeSeat row : rows) {
            requireMatchingInventory(booking, row);
            if (row.getStatus() == ShowtimeSeatStatus.HELD && booking.getId().equals(row.getCurrentBookingId())) {
                row.setStatus(ShowtimeSeatStatus.AVAILABLE);
                row.setCurrentBookingId(null);
                row.setHoldExpiresAt(null);
                count++;
            }
        }
        return count;
    }

    private void requireMatchingInventory(Booking booking, ShowtimeSeat row) {
        if (!row.getShowtime().getId().equals(booking.getShowtime().getId())
                || !row.getSeat().getRoom().getId().equals(booking.getShowtime().getRoom().getId())) {
            throw new AppException(ErrorCode.SEAT_NOT_IN_ROOM);
        }
    }

    private void requireBookableShowtime(Showtime showtime) {
        if (showtime.getMovie().getStatus() == MovieStatus.HIDDEN) throw notFound();
        if (showtime.getStatus() != ShowtimeStatus.SCHEDULED) throw new AppException(ErrorCode.SHOWTIME_UNAVAILABLE);
        if (showtime.getRoom().getStatus() != RoomStatus.ACTIVE
                || showtime.getRoom().getCinema().getStatus() != CinemaStatus.ACTIVE) {
            throw new AppException(ErrorCode.ROOM_UNAVAILABLE);
        }
    }

    private AppException notFound() {
        return new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy đơn đặt vé hoặc suất chiếu.");
    }
}
