package com.example.cinema.report.dto;

import java.time.LocalDate;

public record RevenueReportFilter(LocalDate from, LocalDate to, Long cinemaId, Long movieId) {
}
