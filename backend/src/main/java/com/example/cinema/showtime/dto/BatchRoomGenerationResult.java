package com.example.cinema.showtime.dto;

import java.util.List;

public record BatchRoomGenerationResult(
        Long roomId,
        String roomName,
        int plannedCount,
        int createdCount,
        int skippedCount,
        int failedCount,
        List<BatchRoomDateResult> dates
) {
}
