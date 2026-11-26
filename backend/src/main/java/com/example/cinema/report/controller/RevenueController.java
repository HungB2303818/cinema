package com.example.cinema.report.controller;

import com.example.cinema.report.dto.*;
import com.example.cinema.report.service.RevenueAnalyticsService;
import com.example.cinema.report.service.RevenueCsvExportService;
import com.example.cinema.report.service.RevenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/reports/revenue")
@RequiredArgsConstructor
public class RevenueController {
    private final RevenueService service;
    private final RevenueAnalyticsService analytics;
    private final RevenueCsvExportService export;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public RevenueResponse report(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.report(from, to);
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public RevenueDashboardResponse dashboard(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) Long movieId,
            @RequestParam(defaultValue = "DAY") RevenueTimeGroup timeGroup) {
        return analytics.dashboard(from, to, cinemaId, movieId, timeGroup);
    }

    @GetMapping("/breakdown")
    @PreAuthorize("hasRole('ADMIN')")
    public RevenueBreakdownResponse breakdown(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) Long movieId,
            @RequestParam RevenueGroupBy groupBy,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "totalRevenue,desc") String sort) {
        return analytics.breakdown(from, to, cinemaId, movieId, groupBy, page, size, sort);
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> export(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long cinemaId,
            @RequestParam(required = false) Long movieId,
            @RequestParam RevenueExportGroupBy groupBy) {
        byte[] body = export.export(from, to, cinemaId, movieId, groupBy);
        String filename = "revenue_" + from + "_" + to + "_by-" + groupBy.name().toLowerCase() + ".csv";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename, StandardCharsets.UTF_8).build().toString())
                .body(body);
    }
}
