package com.example.cinema.report.dto;

public record RevenueSummary(String totalRevenue, long successfulPayments, long ticketsSold,
        String averageRevenuePerPayment) {
}
