package com.example.cinema.showtime.controller;

import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.ShowtimeStatus;
import com.example.cinema.showtime.service.ShowtimeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/showtimes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Showtimes", description = "Quản lý lịch chiếu và inventory ghế")
public class AdminShowtimeController {
    private final ShowtimeService service;

    @GetMapping
    public PageResponse<ShowtimeResponse> list(
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) Long movieId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) ShowtimeStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id,desc") String sort) {
        return service.adminSchedule(cinemaId, roomId, movieId, date, status, page, size, sort);
    }

    @GetMapping("/{id}")
    public ShowtimeResponse getById(@PathVariable Long id) {
        return service.adminDetail(id);
    }

    @PostMapping
    public ResponseEntity<ShowtimeCreatedResponse> create(@Valid @RequestBody ShowtimeRequest request) {
        ShowtimeCreatedResponse response = service.create(request);
        return ResponseEntity.created(URI.create("/api/admin/showtimes/" + response.showtime().id())).body(response);
    }

    @PutMapping("/{id}")
    public ShowtimeResponse update(@PathVariable Long id, @Valid @RequestBody ShowtimeRequest request) {
        return service.update(id, request);
    }
}
