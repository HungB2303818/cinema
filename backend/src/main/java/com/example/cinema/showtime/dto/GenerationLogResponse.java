package com.example.cinema.showtime.dto;

import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.entity.ScheduleGenerationLog;

import java.time.Instant;
import java.time.LocalDate;

public record GenerationLogResponse(Long id, Long planId, LocalDate targetDate,
                                    GenerationOutcome outcome, int createdCount, int skippedCount,
                                    String message, Instant createdAt) {
    public static GenerationLogResponse from(ScheduleGenerationLog log) {
        return new GenerationLogResponse(log.getId(), log.getPlan().getId(), log.getTargetDate(),
                log.getOutcome(), log.getCreatedCount(), log.getSkippedCount(), log.getMessage(),
                log.getCreatedAt());
    }
}
