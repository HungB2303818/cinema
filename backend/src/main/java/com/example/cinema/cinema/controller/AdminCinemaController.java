package com.example.cinema.cinema.controller;

import com.example.cinema.cinema.dto.*;
import com.example.cinema.cinema.service.CinemaService;
import com.example.cinema.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Cinema", description = "Tra cứu rạp, quản lý phòng và ghế vật lý")
public class AdminCinemaController {
    private final CinemaService service;

    @GetMapping("/cinemas")
    public PageResponse<CinemaResponse> cinemas(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "id,asc") String sort) {
        return service.cinemas(page, size, sort);
    }

    @GetMapping("/cinemas/{id}/rooms")
    public PageResponse<RoomResponse> rooms(@PathVariable Long id, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "id,asc") String sort) {
        return service.rooms(id, page, size, sort);
    }

    @PostMapping("/rooms")
    public ResponseEntity<RoomResponse> createRoom(@Valid @RequestBody RoomRequest request) {
        RoomResponse result = service.createRoom(request);
        return ResponseEntity.created(URI.create("/api/admin/rooms/" + result.id())).body(result);
    }

    @PutMapping("/rooms/{id}")
    public RoomResponse updateRoom(@PathVariable Long id, @Valid @RequestBody RoomRequest request) {
        return service.updateRoom(id, request);
    }

    @GetMapping("/rooms/{id}/seats")
    public List<SeatResponse> seats(@PathVariable Long id) { return service.seats(id); }

    @PostMapping("/rooms/{id}/seats")
    public ResponseEntity<List<SeatResponse>> createSeats(@PathVariable Long id, @Valid @RequestBody SeatBatchRequest request) {
        return ResponseEntity.status(201).body(service.createSeats(id, request));
    }

    @PutMapping("/rooms/{roomId}/seats/{seatId}")
    public SeatResponse updateSeat(@PathVariable Long roomId, @PathVariable Long seatId,
            @Valid @RequestBody SeatRequest request) {
        return service.updateSeat(roomId, seatId, request);
    }
}
