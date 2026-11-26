package com.example.cinema.showtime.dto;

import java.time.LocalDate;

public record ActivePlanRef(Long id, LocalDate effectiveFrom, LocalDate effectiveTo, int daysOfWeek) {
}
