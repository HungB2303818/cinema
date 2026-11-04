package com.example.cinema.cinema.controller;

import com.example.cinema.cinema.dto.CinemaDetailResponse;
import com.example.cinema.cinema.dto.CinemaResponse;
import com.example.cinema.cinema.dto.RoomResponse;
import com.example.cinema.cinema.entity.Cinema;
import com.example.cinema.cinema.repository.CinemaRepository;
import com.example.cinema.cinema.repository.RoomRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cinemas")
@RequiredArgsConstructor
@Tag(name = "Public Cinema", description = "Xem danh sách và chi tiết các cụm rạp")
public class CinemaController {

    private final CinemaRepository cinemaRepository;
    private final RoomRepository roomRepository;

    @GetMapping
    @Operation(summary = "Lấy danh sách tất cả các cụm rạp")
    public List<CinemaResponse> getAllCinemas() {
        return cinemaRepository.findAll().stream()
                .map(CinemaResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết rạp kèm danh sách phòng chiếu")
    public CinemaDetailResponse getCinemaDetail(@PathVariable Long id) {
        Cinema cinema = cinemaRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy cụm rạp với ID " + id));
        List<RoomResponse> rooms = roomRepository.findByCinemaId(id).stream()
                .map(RoomResponse::from)
                .toList();
        return CinemaDetailResponse.of(cinema, rooms);
    }
}
