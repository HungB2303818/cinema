package com.example.cinema.showtime.dto;

import java.time.LocalDate;
import java.util.List;

public record GenerationSummaryResponse(Long planId, LocalDate from, LocalDate to,
                                        int createdCount, int skippedCount, int failedCount,
                                        List<GenerationDateResult> dates) {
}
