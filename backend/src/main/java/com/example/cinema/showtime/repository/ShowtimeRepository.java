package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

    List<Showtime> findByMovieIdAndStartsAtBetweenAndStatusOrderByStartsAtAsc(
            Long movieId, Instant start, Instant end, ShowtimeStatus status);

    @Query("SELECT s FROM Showtime s WHERE s.room.id = :roomId AND s.status <> 'CANCELLED' " +
           "AND (:newStartsAt < s.endsAt AND :newEndsAt > s.startsAt)")
    List<Showtime> findOverlappingShowtimes(
            @Param("roomId") Long roomId,
            @Param("newStartsAt") Instant newStartsAt,
            @Param("newEndsAt") Instant newEndsAt);
}
