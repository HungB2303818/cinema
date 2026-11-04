package com.example.cinema.ticket.dto;

import com.example.cinema.booking.entity.BookingSeat;

public record TicketResponse(Long seatId, String label, String ticketCode) {
    public static TicketResponse from(BookingSeat item) {
        var seat = item.getShowtimeSeat().getSeat();
        return new TicketResponse(seat.getId(), seat.getSeatRow() + seat.getSeatNumber(), item.getTicketCode());
    }
}
