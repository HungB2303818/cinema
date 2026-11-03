package com.example.cinema.showtime.controller;

import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.service.ShowtimeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.net.URI;

@RestController
@RequestMapping("/api/admin/showtimes")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Showtimes", description = "Quản lý lịch chiếu và inventory ghế")
public class AdminShowtimeController {
    private final ShowtimeService service;

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
