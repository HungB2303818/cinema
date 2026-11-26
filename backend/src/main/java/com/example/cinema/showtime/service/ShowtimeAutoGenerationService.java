package com.example.cinema.showtime.service;

import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.cinema.entity.CinemaStatus;
import com.example.cinema.cinema.entity.PhysicalSeatStatus;
import com.example.cinema.cinema.entity.Room;
import com.example.cinema.cinema.entity.RoomStatus;
import com.example.cinema.cinema.repository.SeatRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.GenerationDateResult;
import com.example.cinema.showtime.dto.ShowtimeRequest;
import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.entity.SchedulePlan;
import com.example.cinema.showtime.entity.SchedulePlanMovie;
import com.example.cinema.showtime.entity.SchedulePlanStatus;
import com.example.cinema.showtime.repository.SchedulePlanRepository;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationInput;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationInterval;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationMovie;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.PlannedShowtime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ShowtimeAutoGenerationService {

    static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    static final int MAX_SHOWTIMES_PER_DAY = 40;
    static final int BOOKING_CUTOFF_MINUTES = 10;
    static final int CLEANUP_LOOKBACK_MINUTES = 240;
    static final String ACTOR = "system:auto-generation";

    private final SchedulePlanRepository planRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeService showtimeService;
    private final ScheduleGenerationLogService logService;
    private final ShowtimeAllocationPlanner planner;
    private final DatabaseTime databaseTime;

    /**
     * Not transactional on purpose: each createInternal call owns its transaction. Wrapping the
     * whole day would mark the outer transaction rollback-only after a caught overlap error and
     * discard every later showtime.
     */
    public GenerationDateResult generateDate(Long planId, LocalDate date, String runId) {
        String effectiveRunId = runId == null || runId.isBlank()
                ? UUID.randomUUID().toString() : runId;
        SchedulePlan plan = planRepository.findSnapshotById(planId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Không tìm thấy kế hoạch lịch tự động."));

        if (plan.getStatus() != SchedulePlanStatus.ACTIVE) {
            return finish(planId, date, effectiveRunId, GenerationOutcome.SKIPPED,
                    0, 0, "Kế hoạch đang tạm dừng.");
        }
        if (date.isBefore(plan.getEffectiveFrom()) || date.isAfter(plan.getEffectiveTo())) {
            return finish(planId, date, effectiveRunId, GenerationOutcome.SKIPPED,
                    0, 0, "Ngày nằm ngoài hiệu lực kế hoạch.");
        }
        if (!SchedulePlanDays.includes(plan.getDaysOfWeek(), date.getDayOfWeek())) {
            return finish(planId, date, effectiveRunId, GenerationOutcome.SKIPPED,
                    0, 0, "Ngày không thuộc lịch áp dụng.");
        }

        Room room = plan.getRoom();
        if (room.getStatus() != RoomStatus.ACTIVE || room.getCinema().getStatus() != CinemaStatus.ACTIVE) {
            return finish(planId, date, effectiveRunId, GenerationOutcome.SKIPPED,
                    0, 0, "Rạp hoặc phòng đang tạm dừng.");
        }
        if (!seatRepository.existsByRoomIdAndStatus(room.getId(), PhysicalSeatStatus.ACTIVE)) {
            return finish(planId, date, effectiveRunId, GenerationOutcome.SKIPPED,
                    0, 0, "Phòng không có ghế đang hoạt động.");
        }

        Instant windowStart = date.atTime(plan.getOpenTime()).atZone(VIETNAM).toInstant();
        Instant windowEnd = date.atTime(plan.getCloseTime()).atZone(VIETNAM).toInstant();
        Instant notBefore = databaseTime.now().plus(BOOKING_CUTOFF_MINUTES, ChronoUnit.MINUTES);

        Instant lowerBound = windowStart.minus(CLEANUP_LOOKBACK_MINUTES, ChronoUnit.MINUTES);
        List<AllocationInterval> occupied = showtimeRepository
                .findScheduledOverlapping(room.getId(), lowerBound, windowEnd).stream()
                .map(showtime -> new AllocationInterval(showtime.getStartsAt(),
                        showtime.getEndsAt().plus(showtime.getCleanupMinutes(), ChronoUnit.MINUTES)))
                .toList();

        Instant dayStart = date.atStartOfDay(VIETNAM).toInstant();
        Instant dayEnd = date.plusDays(1).atStartOfDay(VIETNAM).toInstant();
        int existingCount = showtimeRepository
                .countScheduledStartsForRoomBetween(room.getId(), dayStart, dayEnd);
        int remaining = Math.max(0, MAX_SHOWTIMES_PER_DAY - existingCount);
        if (remaining == 0) {
            return finish(planId, date, effectiveRunId, GenerationOutcome.SKIPPED,
                    0, 0, "Đã đạt giới hạn " + MAX_SHOWTIMES_PER_DAY + " suất/ngày tại phòng.");
        }

        List<AllocationMovie> movies = plan.getMovies().stream()
                .filter(item -> isEligible(item, date))
                .sorted(Comparator.comparingInt(SchedulePlanMovie::getPriority))
                .map(item -> new AllocationMovie(item.getMovie().getId(),
                        item.getMovie().getDurationMinutes()))
                .toList();
        if (movies.isEmpty()) {
            return finish(planId, date, effectiveRunId, GenerationOutcome.SKIPPED,
                    0, 0, "Không có phim hợp lệ cho ngày này.");
        }

        List<PlannedShowtime> planned = planner.plan(new AllocationInput(
                windowStart, windowEnd, plan.getSlotStepMinutes(), plan.getCleanupMinutes(),
                notBefore, remaining, movies, occupied));
        if (planned.isEmpty()) {
            return finish(planId, date, effectiveRunId, GenerationOutcome.SKIPPED,
                    0, 0, "Không còn khung giờ trống phù hợp.");
        }

        int created = 0;
        int overlapSkipped = 0;
        int invalidSkipped = 0;
        boolean roomStopped = false;
        for (PlannedShowtime item : planned) {
            ShowtimeRequest request = new ShowtimeRequest(item.movieId(), room.getId(),
                    item.startsAt(), item.endsAt(), plan.getCleanupMinutes(),
                    plan.getBasePrice(), plan.getVipSurcharge());
            try {
                showtimeService.createInternal(request, ACTOR, planId);
                created++;
            } catch (AppException ex) {
                switch (ex.getErrorCode()) {
                    case SHOWTIME_OVERLAP -> overlapSkipped++;
                    case MOVIE_UNAVAILABLE, SCHEDULE_INVALID -> invalidSkipped++;
                    case ROOM_UNAVAILABLE -> roomStopped = true;
                    default -> throw new GenerationFailedException(created,
                            overlapSkipped + invalidSkipped, ex);
                }
                if (roomStopped) {
                    break;
                }
            } catch (RuntimeException ex) {
                throw new GenerationFailedException(created,
                        overlapSkipped + invalidSkipped, ex);
            }
        }

        int skipped = overlapSkipped + invalidSkipped;
        GenerationOutcome outcome;
        if (created == 0) {
            outcome = GenerationOutcome.SKIPPED;
        } else if (skipped > 0 || roomStopped) {
            outcome = GenerationOutcome.PARTIAL;
        } else {
            outcome = GenerationOutcome.SUCCESS;
        }
        String message = message(created, skipped, roomStopped);

        log.info("showtime.autogeneration planId={} date={} outcome={} created={} skipped={} runId={}",
                planId, date, outcome, created, skipped, effectiveRunId);
        return finish(planId, date, effectiveRunId, outcome, created, skipped, message);
    }

    private boolean isEligible(SchedulePlanMovie item, LocalDate date) {
        if (item.getMovie().getStatus() == MovieStatus.SHOWING) {
            return true;
        }
        return item.getMovie().getStatus() == MovieStatus.UPCOMING
                && item.getMovie().getReleaseDate() != null
                && !item.getMovie().getReleaseDate().isAfter(date);
    }

    private String message(int created, int skipped, boolean roomStopped) {
        if (created == 0 && roomStopped) {
            return "Không sinh suất: phòng ngừng hoạt động trong lúc sinh.";
        }
        if (created == 0) {
            return "Không sinh suất: các khung đều bị chiếm hoặc không hợp lệ.";
        }
        if (roomStopped) {
            return "Đã tạo " + created + " suất; dừng sớm vì phòng ngừng hoạt động.";
        }
        if (skipped > 0) {
            return "Đã tạo " + created + " suất; bỏ qua " + skipped
                    + " khung do trùng lịch hoặc không hợp lệ.";
        }
        return "Đã tạo " + created + " suất chiếu.";
    }

    private GenerationDateResult finish(Long planId, LocalDate date, String runId,
                                        GenerationOutcome outcome, int created, int skipped,
                                        String message) {
        logService.record(planId, date, outcome, created, skipped, message, runId);
        return new GenerationDateResult(date, outcome, created, skipped, message);
    }

    /**
     * Unexpected failure after some showtimes of the same date were already committed in their
     * own transactions. Carries the partial counters so callers can persist an accurate FAILED log.
     */
    public static class GenerationFailedException extends RuntimeException {

        private final int createdCount;
        private final int skippedCount;

        public GenerationFailedException(int createdCount, int skippedCount, Throwable cause) {
            super(cause == null ? null : cause.getMessage(), cause);
            this.createdCount = createdCount;
            this.skippedCount = skippedCount;
        }

        public int getCreatedCount() {
            return createdCount;
        }

        public int getSkippedCount() {
            return skippedCount;
        }
    }
}
