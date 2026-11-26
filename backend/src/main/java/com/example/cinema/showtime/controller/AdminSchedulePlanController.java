package com.example.cinema.showtime.controller;

import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.SchedulePlanStatus;
import com.example.cinema.showtime.service.SchedulePlanService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/schedule-plans")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Schedule Plans", description = "Cấu hình và sinh suất chiếu tự động theo khung giờ")
public class AdminSchedulePlanController {

    private final SchedulePlanService service;

    @GetMapping
    public PageResponse<SchedulePlanSummaryResponse> list(
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) Long roomId,
            @RequestParam(required = false) SchedulePlanStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "id,desc") String sort) {
        return service.list(cinemaId, roomId, status, page, size, sort);
    }

    @GetMapping("/{id}")
    public SchedulePlanResponse detail(@PathVariable Long id) {
        return service.detail(id);
    }

    @PostMapping
    public ResponseEntity<SchedulePlanResponse> create(@Valid @RequestBody SchedulePlanRequest request) {
        SchedulePlanResponse response = service.create(request, currentActor());
        return ResponseEntity.created(URI.create("/api/admin/schedule-plans/" + response.id()))
                .body(response);
    }

    @PutMapping("/{id}")
    public SchedulePlanResponse update(@PathVariable Long id,
                                       @Valid @RequestBody SchedulePlanRequest request) {
        return service.update(id, request, currentActor());
    }

    @PostMapping("/{id}/generate")
    public GenerationSummaryResponse generate(@PathVariable Long id,
                                              @Valid @RequestBody GenerateScheduleRequest request) {
        return service.generate(id, request.from(), request.to(), currentActor());
    }

    @GetMapping("/{id}/logs")
    public PageResponse<GenerationLogResponse> logs(
            @PathVariable Long id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return service.logs(id, from, to, page, size);
    }

    private String currentActor() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication == null ? "system" : authentication.getName();
    }
}
