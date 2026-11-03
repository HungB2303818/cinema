package com.example.cinema.catalog.dto;

import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;

import java.time.LocalDate;

public record MovieResponse(Long id, String title, String description, Integer durationMinutes,
                            String genre, String ageRating, LocalDate releaseDate,
                            String posterUrl, MovieStatus status) {
    public static MovieResponse from(Movie movie) {
        return new MovieResponse(movie.getId(), movie.getTitle(), movie.getDescription(),
                movie.getDurationMinutes(), movie.getGenre(), movie.getAgeRating(),
                movie.getReleaseDate(), movie.getPosterUrl(), movie.getStatus());
    }
}
