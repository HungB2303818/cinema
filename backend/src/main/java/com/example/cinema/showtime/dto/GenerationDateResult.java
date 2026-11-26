package com.example.cinema.showtime.dto;

import com.example.cinema.showtime.entity.GenerationOutcome;

import java.time.LocalDate;

public record GenerationDateResult(LocalDate date, GenerationOutcome outcome,
                                   int createdCount, int skippedCount, String message) {
}
