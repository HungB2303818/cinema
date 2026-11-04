package com.example.cinema.payment.dto;

import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.payment.entity.PaymentStatus;
import com.example.cinema.ticket.dto.TicketResponse;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record PaymentResponse(Long bookingId, String bookingCode, BookingStatus status,
        PaymentStatus paymentStatus, Instant paidAt, List<TicketResponse> tickets, String message) { }
