package com.example.cinema.cinema.dto;

import com.example.cinema.cinema.entity.Cinema;
import com.example.cinema.cinema.entity.CinemaStatus;
import java.util.List;

public record CinemaDetailResponse(
        Long id,
        String name,
        String address,
        CinemaStatus status,
        List<RoomResponse> rooms
) {
    public static CinemaDetailResponse of(Cinema cinema, List<RoomResponse> rooms) {
        return new CinemaDetailResponse(cinema.getId(), cinema.getName(), cinema.getAddress(), cinema.getStatus(), rooms);
    }
}
