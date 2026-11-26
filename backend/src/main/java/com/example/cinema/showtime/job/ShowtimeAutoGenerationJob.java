package com.example.cinema.showtime.job;

import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.ActivePlanRef;
import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.repository.ScheduleGenerationLogRepository;
import com.example.cinema.showtime.repository.SchedulePlanRepository;
import com.example.cinema.showtime.service.ScheduleGenerationLogService;
import com.example.cinema.showtime.service.SchedulePlanDays;
import com.example.cinema.showtime.service.ShowtimeAutoGenerationService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.showtime.autogeneration.enabled",
        havingValue = "true", matchIfMissing = true)
public class ShowtimeAutoGenerationJob {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

    private final SchedulePlanRepository planRepository;
    private final ScheduleGenerationLogRepository logRepository;
    private final ShowtimeAutoGenerationService generationService;
    private final ScheduleGenerationLogService logService;
    private final DatabaseTime databaseTime;
    private final int horizonDays;
    private final boolean startupCatchup;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public ShowtimeAutoGenerationJob(
            SchedulePlanRepository planRepository,
            ScheduleGenerationLogRepository logRepository,
            ShowtimeAutoGenerationService generationService,
            ScheduleGenerationLogService logService,
            DatabaseTime databaseTime,
            @Value("${app.showtime.autogeneration.horizon-days:7}") int horizonDays,
            @Value("${app.showtime.autogeneration.startup-catchup:true}") boolean startupCatchup) {
        this.planRepository = planRepository;
        this.logRepository = logRepository;
        this.generationService = generationService;
        this.logService = logService;
        this.databaseTime = databaseTime;
        this.horizonDays = Math.max(1, horizonDays);
        this.startupCatchup = startupCatchup;
    }

    @Scheduled(cron = "${app.showtime.autogeneration.cron:0 30 0 * * *}",
            zone = "${app.showtime.autogeneration.zone:Asia/Ho_Chi_Minh}")
    public void generateDaily() {
        runOnce("cron");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void catchUpOnStartup() {
        if (!startupCatchup) {
            return;
        }
        try {
            runOnce("startup");
        } catch (Exception ex) {
            log.error("showtime.autogeneration.startupFailed trigger=startup", ex);
        }
    }

    void runOnce(String trigger) {
        if (!running.compareAndSet(false, true)) {
            log.warn("showtime.autogeneration.skip trigger={} reason=already-running", trigger);
            return;
        }
        try {
            LocalDate today = databaseTime.now().atZone(VIETNAM).toLocalDate();
            List<ActivePlanRef> plans = planRepository.findAllActiveRefs();
            int processed = 0;
            int failed = 0;

            for (int offset = 0; offset < horizonDays; offset++) {
                LocalDate date = today.plusDays(offset);
                for (ActivePlanRef plan : plans) {
                    if (date.isBefore(plan.effectiveFrom()) || date.isAfter(plan.effectiveTo())) {
                        continue;
                    }
                    if (!SchedulePlanDays.includes(plan.daysOfWeek(), date.getDayOfWeek())) {
                        continue;
                    }
                    if (logRepository.existsSuccessfulGeneration(plan.id(), date)) {
                        continue;
                    }

                    String runId = UUID.randomUUID().toString();
                    try {
                        generationService.generateDate(plan.id(), date, runId);
                        processed++;
                    } catch (RuntimeException ex) {
                        failed++;
                        int createdForDate = 0;
                        int skippedForDate = 0;
                        if (ex instanceof ShowtimeAutoGenerationService.GenerationFailedException failure) {
                            createdForDate = failure.getCreatedCount();
                            skippedForDate = failure.getSkippedCount();
                        }
                        log.error("showtime.autogeneration.failed planId={} date={} runId={}",
                                plan.id(), date, runId, ex);
                        try {
                            logService.record(plan.id(), date, GenerationOutcome.FAILED,
                                    createdForDate, skippedForDate, "Lỗi hệ thống khi sinh lịch.", runId);
                        } catch (RuntimeException logEx) {
                            log.error("showtime.autogeneration.logFailed planId={} date={}",
                                    plan.id(), date, logEx);
                        }
                    }
                }
            }

            log.info("showtime.autogeneration.run trigger={} horizon={} plans={} processed={} failed={}",
                    trigger, horizonDays, plans.size(), processed, failed);
        } finally {
            running.set(false);
        }
    }
}
