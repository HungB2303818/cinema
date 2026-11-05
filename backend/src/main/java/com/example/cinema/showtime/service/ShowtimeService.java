package com.example.cinema.showtime.service;

import com.example.cinema.booking.repository.BookingRepository;
import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.CinemaRepository;
import com.example.cinema.cinema.repository.RoomRepository;
import com.example.cinema.cinema.repository.SeatRepository;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.error.*;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.common.util.Requests;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.*;
import com.example.cinema.showtime.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShowtimeService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final BigDecimal MAX_PRICE = new BigDecimal("9999999999.99");
    private static final Instant MIN_TIME = Instant.parse("1000-01-01T00:00:00Z");
    private static final Instant MAX_TIME = Instant.parse("9999-12-31T23:59:59.999Z");
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository inventoryRepository;
    private final RoomRepository roomRepository;
    private final SeatRepository seatRepository;
    private final MovieRepository movieRepository;
    private final BookingRepository bookingRepository;
    private final CinemaRepository cinemaRepository;
    private final DatabaseTime databaseTime;

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @PreAuthorize("hasRole('ADMIN')")
    public ShowtimeCreatedResponse create(ShowtimeRequest request) {
        Room room = lockRoom(request.roomId());
        requireActive(room);
        Movie movie = movieForSchedule(request.movieId());
        validateSchedule(request, movie);
        List<Seat> seats = activeSeats(room.getId());
        checkOverlap(request, null);
        Showtime showtime = Showtime.builder().room(room).movie(movie).build();
        apply(showtime, request);
        showtimeRepository.saveAndFlush(showtime);
        initializeInventory(showtime, seats);
        audit("showtime.create", showtime.getId());
        return new ShowtimeCreatedResponse(ShowtimeResponse.from(showtime), seats.size());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    @PreAuthorize("hasRole('ADMIN')")
    public ShowtimeResponse update(Long id, ShowtimeRequest request) {
        Requests.positiveId(id);
        Requests.positiveId(request.roomId());
        // Observe only the old room ID, not a managed entity that could become stale while waiting for locks.
        Long oldRoomId = showtimeRepository.findRoomIdById(id).orElseThrow(this::notFound);
        Map<Long, Room> rooms = new HashMap<>();
        for (Long roomId : new TreeSet<>(List.of(oldRoomId, request.roomId()))) {
            rooms.put(roomId, lockRoom(roomId));
        }
        Showtime showtime = showtimeRepository.findByIdForUpdate(id).orElseThrow(this::notFound);
        if (!showtime.getRoom().getId().equals(oldRoomId)) {
            throw conflict("Suất vừa được chuyển phòng bởi yêu cầu khác; vui lòng tải lại.");
        }
        if (!bookingRepository.findHistoryForUpdate(id).isEmpty()
                || inventoryRepository.existsByShowtimeIdAndStatusNot(id, ShowtimeSeatStatus.AVAILABLE)) {
            throw conflict("Không sửa suất đã có booking hoặc ghế đang được sử dụng.");
        }
        if (showtime.getStatus() != ShowtimeStatus.SCHEDULED) {
            throw conflict("Chỉ sửa suất ở trạng thái SCHEDULED.");
        }
        Room target = rooms.get(request.roomId());
        requireActive(target);
        Movie movie = movieForSchedule(request.movieId());
        validateSchedule(request, movie);
        checkOverlap(request, id);
        if (!oldRoomId.equals(request.roomId())) {
            List<Seat> seats = activeSeats(target.getId());
            // No bookings, no occupied inventory: safe to replace inventory for a different room.
            inventoryRepository.deleteByShowtimeId(id);
            inventoryRepository.flush();
            showtime.setRoom(target);
            initializeInventory(showtime, seats);
        }
        showtime.setMovie(movie);
        apply(showtime, request);
        showtimeRepository.flush();
        audit("showtime.update", id);
        return ShowtimeResponse.from(showtime);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public PageResponse<ShowtimeResponse> adminSchedule(Long cinemaId, Long roomId, Long movieId,
                                                       LocalDate date, ShowtimeStatus status,
                                                       int page, int size, String sort) {
        if (cinemaId != null) Requests.positiveId(cinemaId);
        if (roomId != null) Requests.positiveId(roomId);
        if (movieId != null) Requests.positiveId(movieId);
        Instant start = null;
        Instant end = null;
        if (date != null) {
            if (date.getYear() < 1000 || date.getYear() > 9998) {
                throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày phải có năm từ 1000 đến 9998.");
            }
            start = date.atStartOfDay(VIETNAM).toInstant();
            end = date.plusDays(1).atStartOfDay(VIETNAM).toInstant();
        }
        Page<Showtime> showtimePage = showtimeRepository.findAdminSchedule(
                cinemaId, roomId, movieId, start, end, status,
                Requests.page(page, size, sort, Set.of("id", "startsAt", "basePrice", "status")));
        return PageResponse.from(showtimePage.map(ShowtimeResponse::from));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public ShowtimeResponse adminDetail(Long id) {
        Requests.positiveId(id);
        Showtime showtime = showtimeRepository.findAdminDetailById(id).orElseThrow(this::notFound);
        return ShowtimeResponse.from(showtime);
    }

    public PageResponse<ShowtimeResponse> schedule(Long movieId, LocalDate date, Long cinemaId,
                                                  int page, int size, String sort) {
        publicMovie(movieId);
        if (date == null || date.getYear() < 1000 || date.getYear() > 9998) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày phải có năm từ 1000 đến 9998.");
        }
        if (cinemaId != null) Requests.positiveId(cinemaId);
        Instant start = date.atStartOfDay(VIETNAM).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(VIETNAM).toInstant();
        return PageResponse.from(showtimeRepository.findPublicSchedule(movieId, start, end, cinemaId,
                Requests.page(page, size, sort, Set.of("id", "startsAt", "basePrice"))).map(ShowtimeResponse::from));
    }

    public PageResponse<CinemaMovieShowtimeGroupResponse> cinemaSchedule(Long cinemaId, LocalDate date,
                                                                         int page, int size) {
        Requests.positiveId(cinemaId);
        Cinema cinema = cinemaRepository.findById(cinemaId).orElseThrow(this::cinemaNotFound);
        if (cinema.getStatus() != CinemaStatus.ACTIVE) {
            throw cinemaNotFound();
        }
        if (date == null || date.getYear() < 1000 || date.getYear() > 9998) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Ngày phải có năm từ 1000 đến 9998.");
        }
        if (page < 0 || size < 1 || size > 100) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "page phải >= 0; size phải từ 1 đến 100.");
        }
        Instant start = date.atStartOfDay(VIETNAM).toInstant();
        Instant end = date.plusDays(1).atStartOfDay(VIETNAM).toInstant();

        Page<Movie> moviePage = showtimeRepository.findDistinctMoviesForCinemaSchedule(cinemaId, start, end,
                PageRequest.of(page, size));
        if (moviePage.isEmpty()) {
            return new PageResponse<>(List.of(), page, size, moviePage.getTotalElements(), moviePage.getTotalPages());
        }

        List<Long> movieIds = moviePage.getContent().stream().map(Movie::getId).toList();
        List<Showtime> showtimes = showtimeRepository.findShowtimesForCinemaMovies(cinemaId, movieIds, start, end);

        Map<Long, List<ShowtimeResponse>> showtimesByMovie = showtimes.stream()
                .map(ShowtimeResponse::from)
                .collect(Collectors.groupingBy(ShowtimeResponse::movieId, LinkedHashMap::new, Collectors.toList()));

        List<CinemaMovieShowtimeGroupResponse> groups = moviePage.getContent().stream()
                .map(m -> new CinemaMovieShowtimeGroupResponse(
                        MovieSummaryResponse.from(m),
                        showtimesByMovie.getOrDefault(m.getId(), List.of())
                ))
                .toList();

        return new PageResponse<>(groups, page, size, moviePage.getTotalElements(), moviePage.getTotalPages());
    }

    private AppException cinemaNotFound() {
        return new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy cụm rạp hoặc rạp đang tạm dừng.");
    }

    public SeatMapResponse seatMap(Long id) {
        Requests.positiveId(id);
        Showtime showtime = showtimeRepository.findById(id).orElseThrow(this::notFound);
        if (showtime.getStatus() != ShowtimeStatus.SCHEDULED || showtime.getMovie().getStatus() == MovieStatus.HIDDEN
                || showtime.getRoom().getStatus() != RoomStatus.ACTIVE
                || showtime.getRoom().getCinema().getStatus() != CinemaStatus.ACTIVE) {
            throw notFound();
        }
        Instant now = databaseTime.now();
        List<SeatMapResponse.SeatItem> seats = inventoryRepository.findSeatMap(id).stream().map(inventory -> {
            Seat seat = inventory.getSeat();
            if (!seat.getRoom().getId().equals(showtime.getRoom().getId()) || seat.getStatus() != PhysicalSeatStatus.ACTIVE) {
                throw new IllegalStateException("Inventory không khớp cấu hình phòng/ghế.");
            }
            ShowtimeSeatStatus status = inventory.getStatus();
            if (status == ShowtimeSeatStatus.HELD && !inventory.getHoldExpiresAt().isAfter(now)) {
                status = ShowtimeSeatStatus.AVAILABLE;
            }
            BigDecimal price = showtime.getBasePrice();
            if (seat.getSeatType() == SeatType.VIP) price = price.add(showtime.getVipSurcharge());
            return new SeatMapResponse.SeatItem(seat.getId(), seat.getSeatRow() + seat.getSeatNumber(),
                    seat.getSeatType(), status, price);
        }).toList();
        return new SeatMapResponse(id, showtime.getStartsAt(), showtime.getStartsAt().minus(10, ChronoUnit.MINUTES), seats);
    }

    private Room lockRoom(Long id) {
        Requests.positiveId(id);
        return roomRepository.findByIdForUpdate(id).orElseThrow(this::notFound);
    }

    private void requireActive(Room room) {
        if (room.getStatus() != RoomStatus.ACTIVE || room.getCinema().getStatus() != CinemaStatus.ACTIVE) {
            throw new AppException(ErrorCode.ROOM_UNAVAILABLE);
        }
    }

    private Movie movieForSchedule(Long id) {
        Requests.positiveId(id);
        Movie movie = movieRepository.findById(id).orElseThrow(this::notFound);
        if (movie.getStatus() == MovieStatus.HIDDEN) throw new AppException(ErrorCode.MOVIE_UNAVAILABLE);
        return movie;
    }

    private void publicMovie(Long id) {
        Requests.positiveId(id);
        Movie movie = movieRepository.findById(id).orElseThrow(this::notFound);
        if (movie.getStatus() == MovieStatus.HIDDEN) throw notFound();
    }

    private List<Seat> activeSeats(Long roomId) {
        List<Seat> seats = seatRepository.findByRoomIdAndStatusOrderByIdAsc(roomId, PhysicalSeatStatus.ACTIVE);
        if (seats.isEmpty()) throw new AppException(ErrorCode.ROOM_UNAVAILABLE);
        return seats;
    }

    private void validateSchedule(ShowtimeRequest request, Movie movie) {
        Instant starts = request.startsAt();
        Instant ends = request.endsAt();
        if (starts.isBefore(MIN_TIME) || starts.isAfter(MAX_TIME) || ends.isAfter(MAX_TIME)
                || !ends.isAfter(starts) || ends.isBefore(starts.plus(movie.getDurationMinutes(), ChronoUnit.MINUTES))
                || ends.plus(request.cleanupMinutes(), ChronoUnit.MINUTES).isAfter(MAX_TIME)
                || request.basePrice().add(request.vipSurcharge()).compareTo(MAX_PRICE) > 0) {
            throw new AppException(ErrorCode.SCHEDULE_INVALID,
                    "Suất phải đủ thời lượng phim, đúng khoảng DATETIME và giá VIP không vượt DECIMAL(12,2).");
        }
        if (starts.getNano() % 1_000_000 != 0 || ends.getNano() % 1_000_000 != 0) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Thời gian chỉ hỗ trợ tối đa 3 chữ số phần giây.");
        }
    }

    private void checkOverlap(ShowtimeRequest request, Long excludedId) {
        Instant occupiedUntil = request.endsAt().plus(request.cleanupMinutes(), ChronoUnit.MINUTES);
        if (!showtimeRepository.findOverlapsForUpdate(request.roomId(), request.startsAt(), occupiedUntil, excludedId).isEmpty()) {
            throw new AppException(ErrorCode.SHOWTIME_OVERLAP);
        }
    }

    private void initializeInventory(Showtime showtime, List<Seat> seats) {
        inventoryRepository.saveAllAndFlush(seats.stream().map(seat ->
                ShowtimeSeat.builder().showtime(showtime).seat(seat).build()).toList());
    }

    private void apply(Showtime showtime, ShowtimeRequest request) {
        showtime.setStartsAt(request.startsAt());
        showtime.setEndsAt(request.endsAt());
        showtime.setCleanupMinutes(request.cleanupMinutes());
        showtime.setBasePrice(request.basePrice());
        showtime.setVipSurcharge(request.vipSurcharge());
    }

    private AppException notFound() {
        return new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy phim, phòng hoặc suất chiếu.");
    }

    private AppException conflict(String message) { return new AppException(ErrorCode.RESOURCE_STATE_CONFLICT, message); }

    private void audit(String action, Long id) {
        log.info("{} actor={} showtimeId={} outcome=SUCCESS", action,
                SecurityContextHolder.getContext().getAuthentication().getName(), id);
    }
}
