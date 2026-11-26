package com.example.cinema.showtime.dto;

import java.time.Instant;

public record BatchShowtimePreviewItem(
        Long movieId,
        String movieTitle,
        int durationMinutes,
        Instant startsAt,
        Instant endsAt
) {
}
