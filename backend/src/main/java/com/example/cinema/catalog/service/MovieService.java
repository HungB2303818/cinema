package com.example.cinema.catalog.service;

import com.example.cinema.catalog.dto.MoviePageResponse;
import com.example.cinema.catalog.dto.MovieRequest;
import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MovieService {
    private static final Set<String> SORT_FIELDS = Set.of("id", "title", "releaseDate", "durationMinutes", "status");
    private final MovieRepository movieRepository;

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
        return MoviePageResponse.from(movieRepository.findAll(filter,
                PageRequest.of(page, size, parseSort(sort))).map(MovieResponse::from));
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
        Movie movie = find(id);
        if (movie.getStatus() == MovieStatus.HIDDEN) {
            throw notFound();
        }
        return MovieResponse.from(movie);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public MovieResponse getAdmin(Long id) {
        Movie movie = find(id);
        return MovieResponse.from(movie);
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
        apply(movie, request);
        log.info("movie.update actor={} movieId={} outcome=SUCCESS",
                SecurityContextHolder.getContext().getAuthentication().getName(), id);
        return MovieResponse.from(movie);
    }

    private Movie find(Long id) {
        if (id == null || id <= 0) {
            throw invalid("Mã phim phải là số nguyên dương.");
        }
        return movieRepository.findById(id).orElseThrow(this::notFound);
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
    }

    private Sort parseSort(String value) {
        String[] parts = value == null ? new String[0] : value.split(",", -1);
        if (parts.length != 2 || !SORT_FIELDS.contains(parts[0])
                || !(parts[1].equalsIgnoreCase("asc") || parts[1].equalsIgnoreCase("desc"))) {
            throw invalid("sort phải có dạng trường,asc hoặc trường,desc; trường: id, title, releaseDate, durationMinutes, status.");
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
