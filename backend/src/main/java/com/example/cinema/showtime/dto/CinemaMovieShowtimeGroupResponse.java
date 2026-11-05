package com.example.cinema.showtime.dto;

import java.util.List;

public record CinemaMovieShowtimeGroupResponse(
        MovieSummaryResponse movie,
        List<ShowtimeResponse> showtimes
) {
}
