package com.example.cinema.cinema.dto;

import com.example.cinema.cinema.entity.Cinema;
import com.example.cinema.cinema.entity.CinemaStatus;

public record CinemaResponse(Long id, String name, String address, CinemaStatus status) {
    public static CinemaResponse from(Cinema cinema) {
        return new CinemaResponse(cinema.getId(), cinema.getName(), cinema.getAddress(), cinema.getStatus());
    }
}
