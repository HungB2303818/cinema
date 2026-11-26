package com.example.cinema.catalog.service;

import com.example.cinema.catalog.dto.MovieHideImpactResponse;
import com.example.cinema.catalog.dto.MoviePageResponse;
import com.example.cinema.catalog.dto.MovieRequest;
import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import com.example.cinema.booking.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MovieService {
    private static final Set<String> SORT_FIELDS = Set.of("id", "title", "releaseDate", "durationMinutes", "status", "isFeatured");
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final MovieRepository movieRepository;
    private final ShowtimeRepository showtimeRepository;
    private final BookingRepository bookingRepository;
    private final DatabaseTime databaseTime;

    public MoviePageResponse list(String keyword, MovieStatus status, String genre,
                                  int page, int size, String sort) {
        if (page < 0 || size < 1 || size > 100) {
            throw invalid("page phải >= 0; size phải từ 1 đến 100.");
        }
        if ((keyword != null && keyword.length() > 255) || (genre != null && genre.length() > 100)) {
            throw invalid("Từ khóa tối đa 255 ký tự; thể loại tối đa 100 ký tự.");
        }
        Specification<Movie> filter = (root, query, cb) -> cb.notEqual(root.get("status"), MovieStatus.HIDDEN);
        if (status != null) {
            filter = filter.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + escapeLike(keyword.strip().toLowerCase(Locale.ROOT)) + "%";
            filter = filter.and((root, query, cb) -> cb.like(cb.lower(root.get("title")), pattern, '\\'));
        }
        if (genre != null && !genre.isBlank()) {
            String value = genre.strip().toLowerCase(Locale.ROOT);
            filter = filter.and((root, query, cb) -> cb.equal(cb.lower(root.get("genre")), value));
        }
        Sort requestedSort = parseSort(sort);
        Sort finalSort = Sort.by(Sort.Direction.DESC, "isFeatured").and(requestedSort);
        return MoviePageResponse.from(movieRepository.findAll(filter,
                PageRequest.of(page, size, finalSort)).map(MovieResponse::from));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public MoviePageResponse listAdmin(String keyword, MovieStatus status, String genre,
                                       int page, int size, String sort) {
        if (page < 0 || size < 1 || size > 100) {
            throw invalid("page phải >= 0; size phải từ 1 đến 100.");
        }
        if ((keyword != null && keyword.length() > 255) || (genre != null && genre.length() > 100)) {
            throw invalid("Từ khóa tối đa 255 ký tự; thể loại tối đa 100 ký tự.");
        }
        Specification<Movie> filter = (root, query, cb) -> cb.conjunction();
        if (status != null) {
            filter = filter.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (keyword != null && !keyword.isBlank()) {
            String pattern = "%" + escapeLike(keyword.strip().toLowerCase(Locale.ROOT)) + "%";
            filter = filter.and((root, query, cb) -> cb.like(cb.lower(root.get("title")), pattern, '\\'));
        }
        if (genre != null && !genre.isBlank()) {
            String value = genre.strip().toLowerCase(Locale.ROOT);
            filter = filter.and((root, query, cb) -> cb.equal(cb.lower(root.get("genre")), value));
        }
        return MoviePageResponse.from(movieRepository.findAll(filter,
                PageRequest.of(page, size, parseSort(sort))).map(MovieResponse::from));
    }

    public MovieResponse getPublic(Long id) {
        // HC-02: keep hidden movies readable so customers with existing tickets
        // can still understand public schedule/context; booking stays blocked elsewhere.
        return MovieResponse.from(find(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public MovieResponse getAdmin(Long id) {
        Movie movie = find(id);
        return MovieResponse.from(movie);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public MovieHideImpactResponse getHideImpact(Long id) {
        Movie movie = find(id);
        Instant now = databaseTime.now();
        long activeShowtimes = showtimeRepository.countActiveScheduledByMovie(id, now);
        long confirmedBookings = bookingRepository.countConfirmedActiveByMovie(id, now);
        long pendingBookings = bookingRepository.countPendingActiveByMovie(id, now);
        Instant earliestStart = showtimeRepository.findEarliestActiveStartByMovie(id, now).orElse(null);
        Instant latestEnd = showtimeRepository.findLatestActiveEndByMovie(id, now).orElse(null);
        return new MovieHideImpactResponse(movie.getId(), movie.getTitle(), activeShowtimes,
                confirmedBookings, pendingBookings, earliestStart, latestEnd);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public MovieResponse create(MovieRequest request) {
        Movie movie = new Movie();
        apply(movie, request);
        Movie saved = movieRepository.save(movie);
        log.info("movie.create actor={} movieId={} outcome=SUCCESS",
                SecurityContextHolder.getContext().getAuthentication().getName(), saved.getId());
        return MovieResponse.from(saved);
    }

    @Transactional
    @PreAuthorize("hasRole('ADMIN')")
    public MovieResponse update(Long id, MovieRequest request) {
        Movie movie = find(id);
        validateReleaseDateChange(movie, request.releaseDate());
        apply(movie, request);
        log.info("movie.update actor={} movieId={} outcome=SUCCESS",
                SecurityContextHolder.getContext().getAuthentication().getName(), id);
        return MovieResponse.from(movie);
    }

    @Transactional
    public int transitionUpcomingToShowing(LocalDate targetDate) {
        if (targetDate == null) {
            throw invalid("Ngày chuyển trạng thái không được để trống.");
        }
        int count = movieRepository.transitionUpcomingToShowing(targetDate);
        if (count > 0) {
            log.info("movie.transitionUpcoming actor=SYSTEM targetDate={} updatedCount={}", targetDate, count);
        }
        return count;
    }

    private Movie find(Long id) {
        if (id == null || id <= 0) {
            throw invalid("Mã phim phải là số nguyên dương.");
        }
        return movieRepository.findById(id).orElseThrow(this::notFound);
    }

    private void validateReleaseDateChange(Movie movie, LocalDate newReleaseDate) {
        LocalDate oldReleaseDate = movie.getReleaseDate();
        boolean becomesUnknown = newReleaseDate == null && oldReleaseDate != null;
        boolean becomesLater = newReleaseDate != null && (oldReleaseDate == null || newReleaseDate.isAfter(oldReleaseDate));
        if (!becomesUnknown && !becomesLater) {
            return;
        }
        Instant now = databaseTime.now();
        Instant releaseStartVnUtc = newReleaseDate == null ? null : newReleaseDate.atStartOfDay(VIETNAM).toInstant();
        long conflicts = showtimeRepository.countReleaseDateConflicts(movie.getId(), now, releaseStartVnUtc);
        if (conflicts <= 0) {
            return;
        }
        Instant earliestConflict = showtimeRepository.findEarliestReleaseDateConflict(movie.getId(), now, releaseStartVnUtc).orElse(null);
        String detail = newReleaseDate == null
                ? "Không thể bỏ ngày khởi chiếu khi còn " + conflicts + " suất chiếu SCHEDULED chưa kết thúc."
                : "Không thể đổi ngày khởi chiếu sang " + newReleaseDate + " vì có " + conflicts + " suất chiếu SCHEDULED chưa kết thúc bắt đầu trước ngày này.";
        if (earliestConflict != null) {
            detail += " Suất sớm nhất bị ảnh hưởng: " + earliestConflict + ".";
        }
        throw new AppException(ErrorCode.RESOURCE_STATE_CONFLICT, detail);
    }

    private void apply(Movie movie, MovieRequest request) {
        movie.setTitle(request.title().strip());
        movie.setDescription(request.description());
        movie.setDurationMinutes(request.durationMinutes());
        movie.setGenre(request.genre() == null ? null : request.genre().strip());
        movie.setAgeRating(request.ageRating());
        movie.setReleaseDate(request.releaseDate());
        movie.setPosterUrl(request.posterUrl());
        movie.setStatus(request.status());
        movie.setIsFeatured(request.isFeatured() != null ? request.isFeatured() : false);
    }

    private Sort parseSort(String value) {
        String[] parts = value == null ? new String[0] : value.split(",", -1);
        if (parts.length != 2 || !SORT_FIELDS.contains(parts[0])
                || !(parts[1].equalsIgnoreCase("asc") || parts[1].equalsIgnoreCase("desc"))) {
            throw invalid("sort phải có dạng trường,asc hoặc trường,desc; trường: id, title, releaseDate, durationMinutes, status, isFeatured.");
        }
        Sort sort = Sort.by(Sort.Direction.fromString(parts[1]), parts[0]);
        return parts[0].equals("id") ? sort : sort.and(Sort.by("id"));
    }

    private String escapeLike(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private AppException invalid(String message) {
        return new AppException(ErrorCode.VALIDATION_ERROR, message);
    }

    private AppException notFound() {
        return new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy phim.");
    }
}
