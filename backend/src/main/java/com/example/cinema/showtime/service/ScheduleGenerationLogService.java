package com.example.cinema.showtime.service;

import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.entity.ScheduleGenerationLog;
import com.example.cinema.showtime.repository.ScheduleGenerationLogRepository;
import com.example.cinema.showtime.repository.SchedulePlanRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class ScheduleGenerationLogService {

    private static final int MAX_MESSAGE_LENGTH = 1000;

    private final SchedulePlanRepository planRepository;
    private final ScheduleGenerationLogRepository logRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(Long planId, LocalDate date, GenerationOutcome outcome,
                       int createdCount, int skippedCount, String message, String runId) {
        ScheduleGenerationLog entry = ScheduleGenerationLog.builder()
                .plan(planRepository.getReferenceById(planId))
                .targetDate(date)
                .outcome(outcome)
                .createdCount(Math.max(0, createdCount))
                .skippedCount(Math.max(0, skippedCount))
                .message(truncate(message))
                .runId(runId)
                .createdAt(Instant.now())
                .build();
        logRepository.save(entry);
    }

    private static String truncate(String message) {
        if (message == null) {
            return null;
        }
        String value = message.strip();
        if (value.length() <= MAX_MESSAGE_LENGTH) {
            return value;
        }
        return value.substring(0, MAX_MESSAGE_LENGTH - 3) + "...";
    }
}
