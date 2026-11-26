package com.example.cinema.showtime.dto;

import java.time.LocalDate;
import java.util.List;

public record BatchAutoGenerateShowtimesResponse(
        Long cinemaId,
        String cinemaName,
        LocalDate from,
        LocalDate to,
        boolean preview,
        int totalPlannedCount,
        int totalCreatedCount,
        int totalSkippedCount,
        int totalFailedCount,
        List<BatchRoomGenerationResult> rooms
) {
}
