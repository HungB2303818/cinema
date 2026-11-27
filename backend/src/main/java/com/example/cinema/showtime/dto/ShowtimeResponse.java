package com.example.cinema.showtime.dto;

import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.showtime.entity.Showtime;
import com.example.cinema.showtime.entity.ShowtimeStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record ShowtimeResponse(Long id, Long movieId, MovieStatus movieStatus, Long cinemaId, String cinemaName,
                               Long roomId, String roomName, Instant startsAt, Instant endsAt,
                               Integer cleanupMinutes, BigDecimal basePrice, BigDecimal vipSurcharge,
                               ShowtimeStatus status, Long schedulePlanId) {
    public ShowtimeResponse(Long id, Long movieId, Long cinemaId, String cinemaName,
                            Long roomId, String roomName, Instant startsAt, Instant endsAt,
                            Integer cleanupMinutes, BigDecimal basePrice, BigDecimal vipSurcharge,
                            ShowtimeStatus status, Long schedulePlanId) {
        this(id, movieId, null, cinemaId, cinemaName, roomId, roomName, startsAt, endsAt,
                cleanupMinutes, basePrice, vipSurcharge, status, schedulePlanId);
    }

    public static ShowtimeResponse from(Showtime showtime) {
        var room = showtime.getRoom();
        var movie = showtime.getMovie();
        return new ShowtimeResponse(showtime.getId(), movie.getId(), movie.getStatus(), room.getCinema().getId(),
                room.getCinema().getName(), room.getId(), room.getName(), showtime.getStartsAt(), showtime.getEndsAt(),
                showtime.getCleanupMinutes(), showtime.getBasePrice(), showtime.getVipSurcharge(), showtime.getStatus(),
                showtime.getSchedulePlanId());
    }
}
