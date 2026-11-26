package com.example.cinema.showtime.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "schedule_generation_logs", indexes = {
        @Index(name = "idx_schedule_log_plan_date", columnList = "plan_id, target_date, created_at"),
        @Index(name = "idx_schedule_log_run", columnList = "run_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleGenerationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SchedulePlan plan;

    @Column(name = "target_date", nullable = false)
    private LocalDate targetDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 20)
    private GenerationOutcome outcome;

    @Column(name = "created_count", nullable = false)
    private int createdCount;

    @Column(name = "skipped_count", nullable = false)
    private int skippedCount;

    @Column(name = "message", length = 1000)
    private String message;

    @Column(name = "run_id", nullable = false, length = 36)
    private String runId;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
