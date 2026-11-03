package com.example.cinema.booking.service;

import com.example.cinema.common.error.*;
import java.time.Instant;

final class BookingRules {
    static final long HOLD_SECONDS = 300;
    private BookingRules() { }

    static void requireBeforeCutoff(Instant startsAt, Instant now) {
        if (!now.isBefore(startsAt.minusSeconds(600))) {
            throw new AppException(ErrorCode.BOOKING_CUTOFF_PASSED);
        }
    }
}
