package com.example.cinema.report.dto;

import java.util.List;

public record RevenueExportData(RevenueReportFilter filter, RevenueExportGroupBy groupBy,
        List<RevenueSeriesPoint> series, List<RevenueBreakdownRow> breakdown) {
}
