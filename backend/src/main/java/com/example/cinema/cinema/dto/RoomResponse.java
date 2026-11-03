package com.example.cinema.cinema.dto;

import com.example.cinema.cinema.entity.Room;
import com.example.cinema.cinema.entity.RoomStatus;

public record RoomResponse(Long id, Long cinemaId, String name, RoomStatus status) {
    public static RoomResponse from(Room room) {
        return new RoomResponse(room.getId(), room.getCinema().getId(), room.getName(), room.getStatus());
    }
}
