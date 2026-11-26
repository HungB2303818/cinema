package com.example.cinema.showtime.service;

import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.Cinema;
import com.example.cinema.cinema.entity.CinemaStatus;
import com.example.cinema.cinema.entity.PhysicalSeatStatus;
import com.example.cinema.cinema.entity.Room;
import com.example.cinema.cinema.entity.RoomStatus;
import com.example.cinema.cinema.repository.CinemaRepository;
import com.example.cinema.cinema.repository.RoomRepository;
import com.example.cinema.cinema.repository.SeatRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationInput;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationInterval;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationMovie;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.PlannedShowtime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
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
public class BatchShowtimeAutoGenerationService {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal MAX_PRICE = new BigDecimal("9999999999.99");
    private static final int DEFAULT_SLOT_STEP_MINUTES = 15;
    private static final int DEFAULT_CLEANUP_MINUTES = 15;
    private static final int DEFAULT_STAGGER_MINUTES = 0;
    private static final int MAX_RANGE_DAYS = 31;
    private static final int MAX_SHOWTIMES_PER_DAY = 40;
    private static final int BOOKING_CUTOFF_MINUTES = 10;
    private static final int CLEANUP_LOOKBACK_MINUTES = 240;

    private final CinemaRepository cinemaRepository;
    private final RoomRepository roomRepository;
    private final SeatRepository seatRepository;
    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeService showtimeService;
    private final ShowtimeAllocationPlanner planner;
    private final DatabaseTime databaseTime;

    @Transactional(readOnly = true)
    public BatchAutoGenerateShowtimesResponse preview(BatchAutoGenerateShowtimesRequest request) {
        return execute(request, true, null);
    }

    /**
     * Not transactional on purpose: each showtime is created in its own REQUIRED transaction
     * inside ShowtimeService.createInternal so a skipped overlap does not roll back earlier slots.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public BatchAutoGenerateShowtimesResponse generate(BatchAutoGenerateShowtimesRequest request, String actor) {
        String effectiveActor = (actor == null || actor.isBlank()) ? "system" : actor;
        return execute(request, false, effectiveActor);
    }

    private BatchAutoGenerateShowtimesResponse execute(
            BatchAutoGenerateShowtimesRequest request,
            boolean preview,
            String actor) {
        NormalizedRequest normalized = normalize(request);
        Cinema cinema = cinemaRepository.findById(normalized.cinemaId())
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy cụm rạp."));
        List<Room> rooms = loadRooms(cinema, normalized.roomIds());
        List<Movie> movies = loadMovies(normalized.movieIds());
        Map<Long, Movie> movieById = new HashMap<>();
        for (Movie movie : movies) {
            movieById.put(movie.getId(), movie);
        }

        List<LocalDate> matchingDates = collectMatchingDates(normalized.from(), normalized.to(), normalized.daysOfWeekMask());
        List<BatchRoomGenerationResult> roomResults = new ArrayList<>();
        int totalPlanned = 0;
        int totalCreated = 0;
        int totalSkipped = 0;
        int totalFailed = 0;

        for (int roomIndex = 0; roomIndex < rooms.size(); roomIndex++) {
            Room room = rooms.get(roomIndex);
            BatchRoomGenerationResult roomResult = processRoom(
                    cinema, room, roomIndex, movies, movieById, matchingDates, normalized, preview, actor);
            roomResults.add(roomResult);
            totalPlanned += roomResult.plannedCount();
            totalCreated += roomResult.createdCount();
            totalSkipped += roomResult.skippedCount();
            totalFailed += roomResult.failedCount();
        }

        if (!preview) {
            log.info("showtime.batchAutoGenerate actor={} cinemaId={} rooms={} planned={} created={} skipped={} failed={}",
                    actor, cinema.getId(), rooms.size(), totalPlanned, totalCreated, totalSkipped, totalFailed);
        }

        return new BatchAutoGenerateShowtimesResponse(
                cinema.getId(),
                cinema.getName(),
                normalized.from(),
                normalized.to(),
                preview,
                totalPlanned,
                totalCreated,
                totalSkipped,
                totalFailed,
                roomResults
        );
    }

    private BatchRoomGenerationResult processRoom(
            Cinema cinema,
            Room room,
            int roomIndex,
            List<Movie> movies,
            Map<Long, Movie> movieById,
            List<LocalDate> matchingDates,
            NormalizedRequest normalized,
            boolean preview,
            String actor) {
        List<BatchRoomDateResult> dateResults = new ArrayList<>();
        int roomPlanned = 0;
        int roomCreated = 0;
        int roomSkipped = 0;
        int roomFailed = 0;

        boolean cinemaActive = cinema.getStatus() == CinemaStatus.ACTIVE;
        boolean roomActive = room.getStatus() == RoomStatus.ACTIVE;
        boolean hasActiveSeats = cinemaActive && roomActive
                && seatRepository.existsByRoomIdAndStatus(room.getId(), PhysicalSeatStatus.ACTIVE);

        for (LocalDate date : matchingDates) {
            if (!cinemaActive || !roomActive) {
                dateResults.add(new BatchRoomDateResult(
                        date, GenerationOutcome.SKIPPED, 0, 0, 0,
                        "Rạp hoặc phòng đang tạm dừng.", List.of()));
                continue;
            }
            if (!hasActiveSeats) {
                dateResults.add(new BatchRoomDateResult(
                        date, GenerationOutcome.SKIPPED, 0, 0, 0,
                        "Phòng không có ghế đang hoạt động.", List.of()));
                continue;
            }

            List<Movie> eligible = movies.stream()
                    .filter(movie -> isEligible(movie, date))
                    .toList();
            if (eligible.isEmpty()) {
                dateResults.add(new BatchRoomDateResult(
                        date, GenerationOutcome.SKIPPED, 0, 0, 0,
                        "Không có phim hợp lệ cho ngày này.", List.of()));
                continue;
            }

            // Rotate movie priority per room so multiple rooms in the same cinema don't start the same movie simultaneously.
            List<AllocationMovie> rotatedMovies = rotateMovies(eligible, roomIndex);

            Instant baseWindowStart = date.atTime(normalized.openTime()).atZone(VIETNAM).toInstant();
            Instant windowEnd = date.atTime(normalized.closeTime()).atZone(VIETNAM).toInstant();
            Instant staggeredStart = baseWindowStart.plus(
                    (long) roomIndex * normalized.staggerMinutes(), ChronoUnit.MINUTES);
            Instant windowStart = staggeredStart.isBefore(windowEnd) ? staggeredStart : baseWindowStart;
            Instant notBefore = databaseTime.now().plus(BOOKING_CUTOFF_MINUTES, ChronoUnit.MINUTES);

            Instant lowerBound = baseWindowStart.minus(CLEANUP_LOOKBACK_MINUTES, ChronoUnit.MINUTES);
            List<AllocationInterval> occupied = showtimeRepository
                    .findScheduledOverlapping(room.getId(), lowerBound, windowEnd).stream()
                    .map(showtime -> new AllocationInterval(
                            showtime.getStartsAt(),
                            showtime.getEndsAt().plus(showtime.getCleanupMinutes(), ChronoUnit.MINUTES)))
                    .toList();

            Instant dayStart = date.atStartOfDay(VIETNAM).toInstant();
            Instant dayEnd = date.plusDays(1).atStartOfDay(VIETNAM).toInstant();
            int existingCount = showtimeRepository
                    .countScheduledStartsForRoomBetween(room.getId(), dayStart, dayEnd);
            int remaining = Math.max(0, MAX_SHOWTIMES_PER_DAY - existingCount);
            if (remaining == 0) {
                dateResults.add(new BatchRoomDateResult(
                        date, GenerationOutcome.SKIPPED, 0, 0, 0,
                        "Đã đạt giới hạn " + MAX_SHOWTIMES_PER_DAY + " suất/ngày tại phòng.", List.of()));
                continue;
            }

            List<PlannedShowtime> planned = planner.plan(new AllocationInput(
                    windowStart, windowEnd, normalized.slotStepMinutes(), normalized.cleanupMinutes(),
                    notBefore, remaining, rotatedMovies, occupied));

            if (planned.isEmpty()) {
                dateResults.add(new BatchRoomDateResult(
                        date, GenerationOutcome.SKIPPED, 0, 0, 0,
                        "Không còn khung giờ trống phù hợp.", List.of()));
                continue;
            }

            roomPlanned += planned.size();

            if (preview) {
                List<BatchShowtimePreviewItem> previewItems = planned.stream()
                        .map(item -> toPreviewItem(item, movieById))
                        .toList();
                dateResults.add(new BatchRoomDateResult(
                        date, GenerationOutcome.SUCCESS, planned.size(), 0, 0,
                        "Dự kiến tạo " + planned.size() + " suất chiếu.", previewItems));
                continue;
            }

            int created = 0;
            int skipped = 0;
            boolean roomStopped = false;
            boolean failed = false;
            List<BatchShowtimePreviewItem> createdItems = new ArrayList<>();

            for (PlannedShowtime item : planned) {
                ShowtimeRequest showtimeRequest = new ShowtimeRequest(
                        item.movieId(), room.getId(), item.startsAt(), item.endsAt(),
                        normalized.cleanupMinutes(), normalized.basePrice(), normalized.vipSurcharge());
                try {
                    showtimeService.createInternalBulk(showtimeRequest, actor, null);
                    created++;
                    createdItems.add(toPreviewItem(item, movieById));
                } catch (AppException ex) {
                    switch (ex.getErrorCode()) {
                        case SHOWTIME_OVERLAP, MOVIE_UNAVAILABLE, SCHEDULE_INVALID -> skipped++;
                        case ROOM_UNAVAILABLE -> roomStopped = true;
                        default -> {
                            failed = true;
                            log.error("showtime.batchAutoGenerate.failed roomId={} date={} error={}",
                                    room.getId(), date, ex.getMessage(), ex);
                        }
                    }
                    if (roomStopped || failed) {
                        break;
                    }
                } catch (RuntimeException ex) {
                    failed = true;
                    log.error("showtime.batchAutoGenerate.failed roomId={} date={}", room.getId(), date, ex);
                    break;
                }
            }

            roomCreated += created;
            roomSkipped += skipped;
            if (failed) {
                roomFailed++;
            }

            GenerationOutcome outcome;
            String message;
            if (failed) {
                outcome = GenerationOutcome.FAILED;
                message = "Lỗi hệ thống khi sinh lịch" + (created > 0 ? " (đã tạo " + created + " suất)." : ".");
            } else if (created == 0) {
                outcome = GenerationOutcome.SKIPPED;
                message = roomStopped
                        ? "Không sinh suất: phòng ngừng hoạt động trong lúc sinh."
                        : "Không sinh suất: các khung đều bị chiếm hoặc không hợp lệ.";
            } else if (skipped > 0 || roomStopped) {
                outcome = GenerationOutcome.PARTIAL;
                message = roomStopped
                        ? "Đã tạo " + created + " suất; dừng sớm vì phòng ngừng hoạt động."
                        : "Đã tạo " + created + " suất; bỏ qua " + skipped + " khung do trùng lịch hoặc không hợp lệ.";
            } else {
                outcome = GenerationOutcome.SUCCESS;
                message = "Đã tạo " + created + " suất chiếu.";
            }

            dateResults.add(new BatchRoomDateResult(
                    date, outcome, planned.size(), created, skipped, message, createdItems));
        }

        return new BatchRoomGenerationResult(
                room.getId(),
                room.getName(),
                roomPlanned,
                roomCreated,
                roomSkipped,
                roomFailed,
                dateResults
        );
    }

    private BatchShowtimePreviewItem toPreviewItem(PlannedShowtime item, Map<Long, Movie> movieById) {
        Movie movie = movieById.get(item.movieId());
        return new BatchShowtimePreviewItem(
                item.movieId(),
                movie != null ? movie.getTitle() : "Phim #" + item.movieId(),
                movie != null ? movie.getDurationMinutes() : 0,
                item.startsAt(),
                item.endsAt()
        );
    }

    private List<AllocationMovie> rotateMovies(List<Movie> eligible, int roomIndex) {
        int size = eligible.size();
        int offset = roomIndex % size;
        List<AllocationMovie> rotated = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            Movie movie = eligible.get((offset + i) % size);
            rotated.add(new AllocationMovie(movie.getId(), movie.getDurationMinutes()));
        }
        return rotated;
    }

    private boolean isEligible(Movie movie, LocalDate date) {
        if (movie.getStatus() == MovieStatus.SHOWING) {
            return true;
        }
        return movie.getStatus() == MovieStatus.UPCOMING
                && movie.getReleaseDate() != null
                && !movie.getReleaseDate().isAfter(date);
    }

    private List<LocalDate> collectMatchingDates(LocalDate from, LocalDate to, int daysOfWeekMask) {
        List<LocalDate> dates = new ArrayList<>();
        for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
            if (SchedulePlanDays.includes(daysOfWeekMask, date.getDayOfWeek())) {
                dates.add(date);
            }
        }
        return dates;
    }

    private List<Room> loadRooms(Cinema cinema, List<Long> roomIds) {
        Map<Long, Room> byId = new HashMap<>();
        for (Room room : roomRepository.findAllById(roomIds)) {
            byId.put(room.getId(), room);
        }
        List<Room> ordered = new ArrayList<>(roomIds.size());
        for (Long roomId : roomIds) {
            Room room = byId.get(roomId);
            if (room == null) {
                throw new AppException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Không tìm thấy phòng chiếu có mã " + roomId + ".");
            }
            if (!room.getCinema().getId().equals(cinema.getId())) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Phòng \"" + room.getName() + "\" không thuộc cụm rạp đã chọn.");
            }
            ordered.add(room);
        }
        return ordered;
    }

    private List<Movie> loadMovies(List<Long> movieIds) {
        Map<Long, Movie> byId = new HashMap<>();
        for (Movie movie : movieRepository.findAllById(movieIds)) {
            byId.put(movie.getId(), movie);
        }
        List<Movie> ordered = new ArrayList<>(movieIds.size());
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

    private NormalizedRequest normalize(BatchAutoGenerateShowtimesRequest request) {
        if (request == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Dữ liệu yêu cầu là bắt buộc.");
        }
        if (request.cinemaId() == null || request.cinemaId() <= 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Cụm rạp là bắt buộc.");
        }
        if (request.roomIds() == null || request.roomIds().isEmpty()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Phải chọn ít nhất một phòng chiếu.");
        }
        Set<Long> seenRooms = new HashSet<>();
        for (Long roomId : request.roomIds()) {
            if (roomId == null || roomId <= 0) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Mã phòng phải là số dương.");
            }
            if (!seenRooms.add(roomId)) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Danh sách phòng có phòng bị trùng.");
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

        if (request.from() == null || request.to() == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày bắt đầu và kết thúc là bắt buộc.");
        }
        if (request.to().isBefore(request.from())) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
        }
        if (ChronoUnit.DAYS.between(request.from(), request.to()) >= MAX_RANGE_DAYS) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Chỉ sinh tối đa " + MAX_RANGE_DAYS + " ngày mỗi lần.");
        }
        LocalDate today = databaseTime.now().atZone(VIETNAM).toLocalDate();
        if (request.from().isBefore(today)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày bắt đầu không được trước hôm nay.");
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

        int slotStep = request.slotStepMinutes() == null ? DEFAULT_SLOT_STEP_MINUTES : request.slotStepMinutes();
        if (slotStep < 5 || slotStep > 120) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Bước slot phải từ 5 đến 120 phút.");
        }
        int cleanup = request.cleanupMinutes() == null ? DEFAULT_CLEANUP_MINUTES : request.cleanupMinutes();
        if (cleanup < 0 || cleanup > 240) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Thời gian dọn phòng phải từ 0 đến 240 phút.");
        }
        int stagger = request.staggerMinutes() == null ? DEFAULT_STAGGER_MINUTES : request.staggerMinutes();
        if (stagger < 0 || stagger > 120) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Độ lệch giờ giữa các phòng phải từ 0 đến 120 phút.");
        }

        if (request.basePrice() == null || request.basePrice().signum() < 0) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Giá vé cơ bản không được âm.");
        }
        BigDecimal vipSurcharge = request.vipSurcharge() == null ? BigDecimal.ZERO : request.vipSurcharge();
        if (vipSurcharge.signum() < 0) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID, "Phụ phí VIP không được âm.");
        }
        if (request.basePrice().add(vipSurcharge).compareTo(MAX_PRICE) > 0) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID,
                    "Tổng giá vé và phụ phí vượt giới hạn DECIMAL(12,2).");
        }

        return new NormalizedRequest(
                request.cinemaId(),
                List.copyOf(request.roomIds()),
                List.copyOf(request.movieIds()),
                request.from(),
                request.to(),
                SchedulePlanDays.encode(request.daysOfWeek()),
                request.openTime(),
                request.closeTime(),
                slotStep,
                cleanup,
                stagger,
                request.basePrice(),
                vipSurcharge
        );
    }

    private record NormalizedRequest(
            Long cinemaId,
            List<Long> roomIds,
            List<Long> movieIds,
            LocalDate from,
            LocalDate to,
            int daysOfWeekMask,
            LocalTime openTime,
            LocalTime closeTime,
            int slotStepMinutes,
            int cleanupMinutes,
            int staggerMinutes,
            BigDecimal basePrice,
            BigDecimal vipSurcharge
    ) {
    }
}
