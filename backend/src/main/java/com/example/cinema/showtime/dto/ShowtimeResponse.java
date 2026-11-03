package com.example.cinema.showtime.dto;

import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record ShowtimeResponse(Long id, Long movieId, Long cinemaId, String cinemaName,
                               Long roomId, String roomName, Instant startsAt, Instant endsAt,
                               Integer cleanupMinutes, BigDecimal basePrice, BigDecimal vipSurcharge,
                               ShowtimeStatus status) {
    public static ShowtimeResponse from(Showtime showtime) {
        var room = showtime.getRoom();
        return new ShowtimeResponse(showtime.getId(), showtime.getMovie().getId(), room.getCinema().getId(),
                room.getCinema().getName(), room.getId(), room.getName(), showtime.getStartsAt(), showtime.getEndsAt(),
                showtime.getCleanupMinutes(), showtime.getBasePrice(), showtime.getVipSurcharge(), showtime.getStatus());
    }
}
