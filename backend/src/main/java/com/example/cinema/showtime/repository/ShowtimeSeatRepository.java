package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.ShowtimeSeat;
import com.example.cinema.showtime.entity.ShowtimeSeatStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShowtimeSeatRepository extends JpaRepository<ShowtimeSeat, Long> {

    List<ShowtimeSeat> findByShowtimeId(Long showtimeId);

    Optional<ShowtimeSeat> findByShowtimeIdAndSeatId(Long showtimeId, Long seatId);

    List<ShowtimeSeat> findByShowtimeIdAndSeatIdIn(Long showtimeId, List<Long> seatIds);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ss FROM ShowtimeSeat ss WHERE ss.id IN :ids ORDER BY ss.id ASC")
    List<ShowtimeSeat> findAllByIdInOrderByIdAscForUpdate(@Param("ids") List<Long> ids);

    List<ShowtimeSeat> findByCurrentBookingId(Long currentBookingId);

    List<ShowtimeSeat> findByStatusAndHoldExpiresAtBefore(ShowtimeSeatStatus status, Instant before);
}
