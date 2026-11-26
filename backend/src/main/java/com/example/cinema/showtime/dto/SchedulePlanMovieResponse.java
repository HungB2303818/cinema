package com.example.cinema.showtime.dto;

import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.showtime.entity.SchedulePlanMovie;

import java.time.LocalDate;

public record SchedulePlanMovieResponse(Long movieId, String title, Integer durationMinutes,
                                        MovieStatus status, LocalDate releaseDate, int priority) {
    public static SchedulePlanMovieResponse from(SchedulePlanMovie item) {
        var movie = item.getMovie();
        return new SchedulePlanMovieResponse(movie.getId(), movie.getTitle(), movie.getDurationMinutes(),
                movie.getStatus(), movie.getReleaseDate(), item.getPriority());
    }
}
