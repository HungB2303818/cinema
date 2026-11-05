package com.example.cinema.showtime.controller;

import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.service.ShowtimeService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Showtimes", description = "Lịch chiếu và sơ đồ ghế công khai")
public class PublicShowtimeController {
    private final ShowtimeService service;

    @GetMapping("/movies/{id}/showtimes")
    public PageResponse<ShowtimeResponse> schedule(@PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "startsAt,asc") String sort) {
        return service.schedule(id, date, cinemaId, page, size, sort);
    }

    @GetMapping("/cinemas/{id}/showtimes")
    public PageResponse<CinemaMovieShowtimeGroupResponse> cinemaSchedule(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String sort) {
        if (sort != null) {
            throw new com.example.cinema.common.error.AppException(
                    com.example.cinema.common.error.ErrorCode.VALIDATION_ERROR,
                    "Không hỗ trợ tham số sort cho lịch theo rạp.");
        }
        return service.cinemaSchedule(id, date, page, size);
    }

    @GetMapping("/showtimes/{id}/seats")
    public SeatMapResponse seats(@PathVariable Long id) { return service.seatMap(id); }
}
