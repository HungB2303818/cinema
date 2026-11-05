package com.example.cinema.showtime.dto;

import com.example.cinema.catalog.entity.Movie;

public record MovieSummaryResponse(
        Long id,
        String title,
        String posterUrl,
        String ageRating,
        Integer durationMinutes
) {
    public static MovieSummaryResponse from(Movie movie) {
        return new MovieSummaryResponse(
                movie.getId(),
                movie.getTitle(),
                movie.getPosterUrl(),
                movie.getAgeRating(),
                movie.getDurationMinutes()
        );
    }
}
