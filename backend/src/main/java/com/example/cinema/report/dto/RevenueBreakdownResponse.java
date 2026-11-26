package com.example.cinema.report.dto;

import com.example.cinema.common.dto.PageResponse;

import java.time.Instant;

public record RevenueBreakdownResponse(RevenueReportFilter filter, RevenueGroupBy groupBy,
        PageResponse<RevenueBreakdownRow> rows, String currency, String timezone, Instant generatedAt) {
}
