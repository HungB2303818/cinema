package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

    boolean existsByRoomId(Long roomId);

    @Query("select s.room.id from Showtime s where s.id = :id")
    Optional<Long> findRoomIdById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Showtime s where s.id = :id")
    Optional<Showtime> findByIdForUpdate(@Param("id") Long id);

    // Booking creation must acquire this shared lock before creating its booking row.
    // It excludes schedule edits without serializing independent bookings on the same showtime.
    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("select s from Showtime s where s.id = :id")
    Optional<Showtime> findByIdForBooking(@Param("id") Long id);

    @Query(value = "SELECT id FROM showtimes WHERE room_id = :roomId AND status = 'SCHEDULED' " +
            "AND (:excludedId IS NULL OR id <> :excludedId) AND starts_at < :occupiedUntil " +
            "AND DATE_ADD(ends_at, INTERVAL cleanup_minutes MINUTE) > :startsAt ORDER BY id FOR UPDATE",
            nativeQuery = true)
    List<Long> findOverlapsForUpdate(@Param("roomId") Long roomId, @Param("startsAt") Instant startsAt,
            @Param("occupiedUntil") Instant occupiedUntil, @Param("excludedId") Long excludedId);

    @EntityGraph(attributePaths = {"room", "room.cinema"})
    @Query("select s from Showtime s where s.movie.id = :movieId and s.status = 'SCHEDULED' " +
            "and s.startsAt >= :start and s.startsAt < :end " +
            "and s.room.status = 'ACTIVE' and s.room.cinema.status = 'ACTIVE' " +
            "and (:cinemaId is null or s.room.cinema.id = :cinemaId)")
    Page<Showtime> findPublicSchedule(@Param("movieId") Long movieId, @Param("start") Instant start,
            @Param("end") Instant end, @Param("cinemaId") Long cinemaId, Pageable pageable);

}
