package com.example.cinema.showtime.dto;

import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;

public record MovieSummaryResponse(
        Long id,
        String title,
        String posterUrl,
        String ageRating,
        Integer durationMinutes,
        MovieStatus status
) {
    public MovieSummaryResponse(Long id, String title, String posterUrl, String ageRating, Integer durationMinutes) {
        this(id, title, posterUrl, ageRating, durationMinutes, null);
    }

    public static MovieSummaryResponse from(Movie movie) {
        return new MovieSummaryResponse(
                movie.getId(),
                movie.getTitle(),
                movie.getPosterUrl(),
                movie.getAgeRating(),
                movie.getDurationMinutes(),
                movie.getStatus()
        );
    }
}
