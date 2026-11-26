package com.example.cinema.showtime.dto;

import com.example.cinema.showtime.entity.GenerationOutcome;

import java.time.LocalDate;
import java.util.List;

public record BatchRoomDateResult(
        LocalDate date,
        GenerationOutcome outcome,
        int plannedCount,
        int createdCount,
        int skippedCount,
        String message,
        List<BatchShowtimePreviewItem> showtimes
) {
}
