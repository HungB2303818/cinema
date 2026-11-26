package com.example.cinema.report.dto;

public record RevenueSeriesPoint(String period, String totalRevenue, long successfulPayments, long ticketsSold) {
}
