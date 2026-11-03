package com.example.cinema.catalog.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record MoviePageResponse(List<MovieResponse> content, int page, int size,
                                long totalElements, int totalPages) {
    public static MoviePageResponse from(Page<MovieResponse> page) {
        return new MoviePageResponse(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages());
    }
}
