package com.example.cinema.report.dto;

import java.time.Instant;
import java.util.List;

public record RevenueDashboardResponse(RevenueReportFilter filter, RevenueTimeGroup timeGroup,
        RevenueSummary summary, List<RevenueSeriesPoint> timeSeries, String currency, String timezone,
        Instant generatedAt) {
}
