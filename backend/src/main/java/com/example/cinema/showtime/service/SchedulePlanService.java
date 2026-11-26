package com.example.cinema.showtime.service;

import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.Room;
import com.example.cinema.cinema.repository.RoomRepository;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.common.util.Requests;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.ScheduleGenerationLogRepository;
import com.example.cinema.showtime.repository.SchedulePlanRepository;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SchedulePlanService {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal MAX_PRICE = new BigDecimal("9999999999.99");
    private static final int DEFAULT_SLOT_STEP_MINUTES = 15;
    private static final int DEFAULT_CLEANUP_MINUTES = 15;
    private static final int MAX_MANUAL_RANGE_DAYS = 31;

    private final SchedulePlanRepository planRepository;
    private final ScheduleGenerationLogRepository logRepository;
    private final ShowtimeRepository showtimeRepository;
    private final RoomRepository roomRepository;
    private final MovieRepository movieRepository;
    private final ShowtimeAutoGenerationService generationService;
    private final ScheduleGenerationLogService logService;
    private final DatabaseTime databaseTime;

    public PageResponse<SchedulePlanSummaryResponse> list(Long cinemaId, Long roomId,
                                                         SchedulePlanStatus status,
                                                         int page, int size, String sort) {
        if (cinemaId != null) Requests.positiveId(cinemaId);
        if (roomId != null) Requests.positiveId(roomId);
        Page<SchedulePlan> plans = planRepository.findAdminPlans(cinemaId, roomId, status,
                Requests.page(page, size, sort, Set.of("id", "name", "effectiveFrom", "effectiveTo", "status")));

        Map<Long, Integer> counts = new HashMap<>();
        List<Long> planIds = plans.getContent().stream().map(SchedulePlan::getId).toList();
        if (!planIds.isEmpty()) {
            for (Object[] row : planRepository.countMoviesByPlanIds(planIds)) {
                counts.put((Long) row[0], ((Number) row[1]).intValue());
            }
        }

        List<SchedulePlanSummaryResponse> content = plans.getContent().stream()
                .map(plan -> SchedulePlanSummaryResponse.from(plan,
                        counts.getOrDefault(plan.getId(), 0)))
                .toList();
        return new PageResponse<>(content, plans.getNumber(), plans.getSize(),
                plans.getTotalElements(), plans.getTotalPages());
    }

    public SchedulePlanResponse detail(Long id) {
        Requests.positiveId(id);
        return SchedulePlanResponse.from(loadDetail(id));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SchedulePlanResponse create(SchedulePlanRequest request, String actor) {
        NormalizedPlan values = normalize(request);
        Room room = lockRoom(request.roomId());
        if (planRepository.existsName(room.getId(), values.name(), null)) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Tên kế hoạch đã tồn tại trong phòng.");
        }
        if (values.status() == SchedulePlanStatus.ACTIVE) {
            checkPlanConflict(room.getId(), request.effectiveFrom(), request.effectiveTo(),
                    request.openTime(), request.closeTime(), null);
        }

        List<Movie> movies = loadMovies(values.movieIds());
        SchedulePlan plan = SchedulePlan.builder()
                .room(room)
                .name(values.name())
                .effectiveFrom(request.effectiveFrom())
                .effectiveTo(request.effectiveTo())
                .daysOfWeek(values.daysOfWeek())
                .openTime(request.openTime())
                .closeTime(request.closeTime())
                .slotStepMinutes(values.slotStepMinutes())
                .cleanupMinutes(values.cleanupMinutes())
                .basePrice(request.basePrice())
                .vipSurcharge(values.vipSurcharge())
                .status(values.status())
                .build();
        plan.getMovies().addAll(buildMovieItems(plan, movies));
        planRepository.saveAndFlush(plan);
        audit("schedulePlan.create", plan.getId(), actor);
        return SchedulePlanResponse.from(plan);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SchedulePlanResponse update(Long id, SchedulePlanRequest request, String actor) {
        Requests.positiveId(id);
        NormalizedPlan values = normalize(request);
        Long oldRoomId = planRepository.findRoomIdById(id)
                .orElseThrow(() -> notFound());

        Map<Long, Room> rooms = new HashMap<>();
        for (Long roomId : new TreeSet<>(List.of(oldRoomId, request.roomId()))) {
            rooms.put(roomId, lockRoom(roomId));
        }

        SchedulePlan plan = planRepository.findByIdForUpdate(id).orElseThrow(() -> notFound());
        if (!plan.getRoom().getId().equals(oldRoomId)) {
            throw conflict("Kế hoạch vừa được chuyển phòng bởi yêu cầu khác; vui lòng tải lại.");
        }
        if (!plan.getRoom().getId().equals(request.roomId())
                && showtimeRepository.existsBySchedulePlanId(id)) {
            throw conflict("Kế hoạch đã có suất chiếu nên không thể đổi phòng chiếu. "
                    + "Hãy tạo kế hoạch mới cho phòng khác.");
        }
        Room room = rooms.get(request.roomId());
        if (planRepository.existsName(room.getId(), values.name(), id)) {
            throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Tên kế hoạch đã tồn tại trong phòng.");
        }
        if (values.status() == SchedulePlanStatus.ACTIVE) {
            checkPlanConflict(room.getId(), request.effectiveFrom(), request.effectiveTo(),
                    request.openTime(), request.closeTime(), id);
        }

        List<Movie> movies = loadMovies(values.movieIds());
        plan.setRoom(room);
        plan.setName(values.name());
        plan.setEffectiveFrom(request.effectiveFrom());
        plan.setEffectiveTo(request.effectiveTo());
        plan.setDaysOfWeek(values.daysOfWeek());
        plan.setOpenTime(request.openTime());
        plan.setCloseTime(request.closeTime());
        plan.setSlotStepMinutes(values.slotStepMinutes());
        plan.setCleanupMinutes(values.cleanupMinutes());
        plan.setBasePrice(request.basePrice());
        plan.setVipSurcharge(values.vipSurcharge());
        plan.setStatus(values.status());

        // Flush deletes before inserting the new priority list so the unique (plan_id, movie_id)
        // key never sees an old and a new row at the same time.
        plan.getMovies().clear();
        planRepository.flush();
        plan.getMovies().addAll(buildMovieItems(plan, movies));
        planRepository.flush();

        audit("schedulePlan.update", plan.getId(), actor);
        return SchedulePlanResponse.from(plan);
    }

    /**
     * Manual generation must not own a transaction: each showtime is created in its own
     * REQUIRED transaction, and a skipped slot would otherwise mark the shared transaction
     * rollback-only and discard every showtime of the whole range. Logs are written with
     * REQUIRES_NEW, so an outer transaction would also leave logs committed for rolled-back rows.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public GenerationSummaryResponse generate(Long id, LocalDate from, LocalDate to, String actor) {
        Requests.positiveId(id);
        SchedulePlan plan = planRepository.findById(id).orElseThrow(() -> notFound());
        if (plan.getStatus() != SchedulePlanStatus.ACTIVE) {
            throw conflict("Chỉ sinh lịch cho kế hoạch đang bật.");
        }
        if (from == null || to == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày bắt đầu và kết thúc là bắt buộc.");
        }
        if (to.isBefore(from)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }
        if (ChronoUnit.DAYS.between(from, to) >= MAX_MANUAL_RANGE_DAYS) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Chỉ sinh tối đa " + MAX_MANUAL_RANGE_DAYS + " ngày mỗi lần.");
        }
        LocalDate today = databaseTime.now().atZone(VIETNAM).toLocalDate();
        if (from.isBefore(today)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày bắt đầu không được trước hôm nay.");
        }
        if (from.isBefore(plan.getEffectiveFrom()) || to.isAfter(plan.getEffectiveTo())) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID,
                    "Khoảng ngày sinh phải nằm trong hiệu lực của kế hoạch.");
        }

        String runId = UUID.randomUUID().toString();
        List<GenerationDateResult> dates = new ArrayList<>();
        int createdCount = 0;
        int skippedCount = 0;
        int failedCount = 0;

        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (!SchedulePlanDays.includes(plan.getDaysOfWeek(), date.getDayOfWeek())) {
                continue;
            }
            try {
                GenerationDateResult result = generationService.generateDate(id, date, runId);
                dates.add(result);
                createdCount += result.createdCount();
                skippedCount += result.skippedCount();
            } catch (RuntimeException ex) {
                failedCount++;
                int createdForDate = 0;
                int skippedForDate = 0;
                if (ex instanceof ShowtimeAutoGenerationService.GenerationFailedException failure) {
                    createdForDate = failure.getCreatedCount();
                    skippedForDate = failure.getSkippedCount();
                    createdCount += createdForDate;
                    skippedCount += skippedForDate;
                }
                log.error("showtime.autogeneration.failed planId={} date={} runId={}", id, date, runId, ex);
                String message = "Lỗi hệ thống khi sinh lịch.";
                try {
                    logService.record(id, date, GenerationOutcome.FAILED, createdForDate, skippedForDate,
                            message, runId);
                } catch (RuntimeException logEx) {
                    log.error("showtime.autogeneration.logFailed planId={} date={}", id, date, logEx);
                }
                dates.add(new GenerationDateResult(date, GenerationOutcome.FAILED, createdForDate,
                        skippedForDate, message));
            }
        }

        audit("schedulePlan.generate", id, actor);
        return new GenerationSummaryResponse(id, from, to, createdCount, skippedCount,
                failedCount, dates);
    }

    public PageResponse<GenerationLogResponse> logs(Long id, LocalDate from, LocalDate to,
                                                    int page, int size) {
        Requests.positiveId(id);
        if (page < 0 || size < 1 || size > 100) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "page phải >= 0; size phải từ 1 đến 100.");
        }
        if (from != null && to != null && to.isBefore(from)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }
        if (!planRepository.existsById(id)) {
            throw notFound();
        }
        Page<ScheduleGenerationLog> logs = logRepository.findPlanLogs(id, from, to,
                PageRequest.of(page, size));
        return PageResponse.from(logs.map(GenerationLogResponse::from));
    }

    private SchedulePlan loadDetail(Long id) {
        return planRepository.findDetailById(id).orElseThrow(() -> notFound());
    }

    private Room lockRoom(Long roomId) {
        Requests.positiveId(roomId);
        return roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Không tìm thấy phòng chiếu."));
    }

    private List<Movie> loadMovies(List<Long> movieIds) {
        Map<Long, Movie> byId = new HashMap<>();
        for (Movie movie : movieRepository.findAllById(movieIds)) {
            byId.put(movie.getId(), movie);
        }
        List<Movie> ordered = new ArrayList<>();
        for (Long movieId : movieIds) {
            Movie movie = byId.get(movieId);
            if (movie == null) {
                throw new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Không tìm thấy phim có mã " + movieId + ".");
            }
            if (movie.getStatus() == MovieStatus.HIDDEN) {
                throw new AppException(ErrorCode.MOVIE_UNAVAILABLE,
                        "Phim \"" + movie.getTitle() + "\" đang ẩn, không thể xếp lịch.");
            }
            ordered.add(movie);
        }
        return ordered;
    }

    private List<SchedulePlanMovie> buildMovieItems(SchedulePlan plan, List<Movie> movies) {
        List<SchedulePlanMovie> items = new ArrayList<>();
        for (int i = 0; i < movies.size(); i++) {
            items.add(SchedulePlanMovie.builder()
                    .plan(plan)
                    .movie(movies.get(i))
                    .priority(i)
                    .build());
        }
        return items;
    }

    private void checkPlanConflict(Long roomId, LocalDate from, LocalDate to,
                                   LocalTime openTime, LocalTime closeTime, Long excludedId) {
        List<SchedulePlan> overlapping = planRepository
                .findActiveOverlappingDates(roomId, from, to, excludedId);
        for (SchedulePlan other : overlapping) {
            if (openTime.isBefore(other.getCloseTime()) && other.getOpenTime().isBefore(closeTime)) {
                throw conflict("Khung giờ trùng với kế hoạch \"" + other.getName() + "\".");
            }
        }
    }

    private NormalizedPlan normalize(SchedulePlanRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Dữ liệu kế hoạch là bắt buộc.");
        }
        String name = request.name() == null ? null : request.name().strip();
        if (name == null || name.isEmpty() || name.length() > 150) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Tên kế hoạch phải từ 1 đến 150 ký tự.");
        }
        if (request.roomId() == null || request.roomId() <= 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phòng chiếu là bắt buộc.");
        }
        if (request.effectiveFrom() == null || request.effectiveTo() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khoảng ngày hiệu lực là bắt buộc.");
        }
        if (request.effectiveTo().isBefore(request.effectiveFrom())) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID,
                    "Ngày kết thúc hiệu lực phải sau hoặc bằng ngày bắt đầu.");
        }
        if (request.effectiveFrom().getYear() < 1000 || request.effectiveTo().getYear() > 9998) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Năm hiệu lực phải từ 1000 đến 9998.");
        }
        if (request.openTime() == null || request.closeTime() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Giờ mở và đóng cửa là bắt buộc.");
        }
        if (!request.openTime().isBefore(request.closeTime())) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Giờ đóng cửa phải sau giờ mở cửa.");
        }
        if (request.openTime().getSecond() != 0 || request.openTime().getNano() != 0
                || request.closeTime().getSecond() != 0 || request.closeTime().getNano() != 0
                || request.closeTime().isAfter(LocalTime.of(23, 59))) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID,
                    "Giờ mở/đóng cửa chỉ hỗ trợ phút, tối đa 23:59.");
        }
        if (request.basePrice() == null || request.basePrice().signum() < 0) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Giá vé cơ bản không được âm.");
        }

        BigDecimal vipSurcharge = request.vipSurcharge() == null
                ? BigDecimal.ZERO : request.vipSurcharge();
        if (vipSurcharge.signum() < 0) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Phụ phí VIP không được âm.");
        }
        if (request.basePrice().add(vipSurcharge).compareTo(MAX_PRICE) > 0) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID,
                    "Tổng giá vé và phụ phí vượt giới hạn DECIMAL(12,2).");
        }

        int slotStep = request.slotStepMinutes() == null
                ? DEFAULT_SLOT_STEP_MINUTES : request.slotStepMinutes();
        if (slotStep < 5 || slotStep > 120) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Bước slot phải từ 5 đến 120 phút.");
        }
        int cleanup = request.cleanupMinutes() == null
                ? DEFAULT_CLEANUP_MINUTES : request.cleanupMinutes();
        if (cleanup < 0 || cleanup > 240) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Thời gian dọn phòng phải từ 0 đến 240 phút.");
        }

        if (request.daysOfWeek() == null || request.daysOfWeek().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phải chọn ít nhất một thứ trong tuần.");
        }
        Set<Integer> seenDays = new HashSet<>();
        for (Integer day : request.daysOfWeek()) {
            if (day == null || day < 1 || day > 7) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Thứ trong tuần phải từ 1 đến 7.");
            }
            if (!seenDays.add(day)) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Thứ trong tuần bị trùng.");
            }
        }

        if (request.movieIds() == null || request.movieIds().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phải chọn ít nhất một phim.");
        }
        Set<Long> seenMovies = new HashSet<>();
        for (Long movieId : request.movieIds()) {
            if (movieId == null || movieId <= 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Mã phim phải là số dương.");
            }
            if (!seenMovies.add(movieId)) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách phim có phim bị trùng.");
            }
        }

        SchedulePlanStatus status = request.status() == null
                ? SchedulePlanStatus.ACTIVE : request.status();
        return new NormalizedPlan(name, SchedulePlanDays.encode(request.daysOfWeek()),
                slotStep, cleanup, vipSurcharge, status, List.copyOf(request.movieIds()));
    }

    private AppException notFound() {
        return new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy kế hoạch lịch tự động.");
    }

    private AppException conflict(String message) {
        return new AppException(ErrorCode.RESOURCE_STATE_CONFLICT, message);
    }

    private void audit(String action, Long id, String actor) {
        log.info("{} actor={} planId={} outcome=SUCCESS", action,
                actor == null || actor.isBlank() ? "system" : actor, id);
    }

    private record NormalizedPlan(String name, int daysOfWeek, int slotStepMinutes,
                                  int cleanupMinutes, BigDecimal vipSurcharge,
                                  SchedulePlanStatus status, List<Long> movieIds) {
    }
}
