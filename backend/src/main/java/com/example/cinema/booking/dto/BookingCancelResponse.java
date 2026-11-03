package com.example.cinema.booking.dto;

import com.example.cinema.booking.entity.BookingStatus;

public record BookingCancelResponse(Long bookingId, BookingStatus status, int releasedSeatCount) { }
