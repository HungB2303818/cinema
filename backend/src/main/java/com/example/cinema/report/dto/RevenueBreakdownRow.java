package com.example.cinema.report.dto;

public record RevenueBreakdownRow(Long groupId, String groupName, String totalRevenue,
        long successfulPayments, long ticketsSold) {
}
