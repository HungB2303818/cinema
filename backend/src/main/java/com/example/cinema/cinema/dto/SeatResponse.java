package com.example.cinema.cinema.dto;

import com.example.cinema.cinema.entity.*;

public record SeatResponse(Long id, Long roomId, String seatRow, Integer seatNumber,
                           String label, SeatType seatType, PhysicalSeatStatus status) {
    public static SeatResponse from(Seat seat) {
        return new SeatResponse(seat.getId(), seat.getRoom().getId(), seat.getSeatRow(), seat.getSeatNumber(),
                seat.getSeatRow() + seat.getSeatNumber(), seat.getSeatType(), seat.getStatus());
    }
}
