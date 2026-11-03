package com.example.cinema.catalog.controller;

import com.example.cinema.catalog.dto.MoviePageResponse;
import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.service.MovieService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
@Tag(name = "Movies", description = "Tra cứu phim công khai")
public class MovieController {
    private final MovieService movieService;

    @GetMapping
    @Operation(summary = "Tìm kiếm, lọc và phân trang phim (không gồm phim ẩn)")
    public MoviePageResponse list(@RequestParam(required = false) String keyword,
                                  @RequestParam(required = false) MovieStatus status,
                                  @RequestParam(required = false) String genre,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size,
                                  @RequestParam(defaultValue = "releaseDate,desc") String sort) {
        return movieService.list(keyword, status, genre, page, size, sort);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Xem chi tiết phim công khai")
    public MovieResponse detail(@PathVariable Long id) {
        return movieService.getPublic(id);
    }
}
