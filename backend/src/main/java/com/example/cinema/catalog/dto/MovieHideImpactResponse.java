package com.example.cinema.catalog.dto;

import java.time.Instant;

public record MovieHideImpactResponse(
        Long movieId,
        String title,
        long activeShowtimes,
        long bookedActiveShowtimes,
        long unbookedActiveShowtimes,
        long confirmedBookings,
        long pendingBookings,
        Instant earliestStart,
        Instant latestEnd
) {
}
