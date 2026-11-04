package com.example.cinema.report.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record RevenueResponse(BigDecimal totalRevenue, long successfulPayments, String currency,
        List<DailyRevenue> dailyRevenue) {
    public record DailyRevenue(LocalDate date, BigDecimal totalRevenue, long successfulPayments) { }
}
