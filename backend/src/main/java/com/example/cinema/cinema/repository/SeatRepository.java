package com.example.cinema.cinema.repository;

import com.example.cinema.cinema.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    List<Seat> findByRoomIdOrderBySeatRowAscSeatNumberAsc(Long roomId);

    Optional<Seat> findByRoomIdAndSeatRowAndSeatNumber(Long roomId, String seatRow, Integer seatNumber);

    List<Seat> findByRoomIdAndIdIn(Long roomId, List<Long> ids);
}
