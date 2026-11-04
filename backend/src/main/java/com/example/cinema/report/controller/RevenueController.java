package com.example.cinema.report.controller;

import com.example.cinema.report.dto.RevenueResponse;
import com.example.cinema.report.service.RevenueService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/admin/reports/revenue")
@RequiredArgsConstructor
public class RevenueController {
    private final RevenueService service;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public RevenueResponse report(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.report(from, to);
    }
}
