package com.example.cinema.booking.repository;

import com.example.cinema.booking.entity.Booking;
import com.example.cinema.booking.entity.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    @EntityGraph(attributePaths = {"showtime", "showtime.movie", "showtime.room", "showtime.room.cinema"})
    Page<Booking> findByUserId(Long userId, Pageable pageable);

    @Query("select b.id from Booking b where b.status = 'PENDING' and b.expiresAt <= :now order by b.expiresAt, b.id")
    List<Long> findExpiredIds(@Param("now") Instant now, Pageable pageable);

    // Current read after locking showtime; includes expired/cancelled historical bookings.
    @Query(value = "SELECT id FROM bookings WHERE showtime_id = :showtimeId ORDER BY id LIMIT 1 FOR UPDATE",
            nativeQuery = true)
    List<Long> findHistoryForUpdate(@Param("showtimeId") Long showtimeId);

    Optional<Booking> findByBookingCode(String bookingCode);

    Optional<Booking> findByUserIdAndClientRequestId(Long userId, String clientRequestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    Page<Booking> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<Booking> findByStatusAndExpiresAtBefore(BookingStatus status, Instant before);
}
