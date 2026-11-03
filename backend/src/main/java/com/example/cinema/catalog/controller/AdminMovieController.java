package com.example.cinema.catalog.controller;

import com.example.cinema.catalog.dto.MovieRequest;
import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.service.MovieService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/admin/movies")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Movies", description = "Quản lý phim dành cho Admin")
public class AdminMovieController {
    private final MovieService movieService;

    @PostMapping
    @Operation(summary = "Thêm phim")
    public ResponseEntity<MovieResponse> create(@Valid @RequestBody MovieRequest request) {
        MovieResponse response = movieService.create(request);
        return ResponseEntity.created(URI.create("/api/admin/movies/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Cập nhật toàn bộ thông tin phim; dùng HIDDEN để ẩn thay vì xóa")
    public MovieResponse update(@PathVariable Long id, @Valid @RequestBody MovieRequest request) {
        return movieService.update(id, request);
    }
}
