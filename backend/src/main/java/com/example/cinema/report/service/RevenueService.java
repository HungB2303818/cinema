package com.example.cinema.report.service;

import com.example.cinema.common.error.*;
import com.example.cinema.report.dto.RevenueResponse;
import com.example.cinema.report.repository.RevenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.math.BigDecimal;
import java.time.*;

@Service
@RequiredArgsConstructor
public class RevenueService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final RevenueRepository revenue;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW)
    public RevenueResponse report(LocalDate from, LocalDate to) {
        if (from == null || to == null || from.getYear() < 1000 || to.getYear() > 9998 || from.isAfter(to)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Khoảng ngày không hợp lệ (năm 1000–9998, from <= to).");
        }
        var days = revenue.dailyTotals(from.atStartOfDay(VIETNAM).toInstant(), to.plusDays(1).atStartOfDay(VIETNAM).toInstant())
                .stream().map(row -> new RevenueResponse.DailyRevenue(LocalDate.parse(row.getDay()), row.getRevenue(), row.getPaymentCount())).toList();
        return new RevenueResponse(days.stream().map(RevenueResponse.DailyRevenue::totalRevenue).reduce(new BigDecimal("0.00"), BigDecimal::add),
                days.stream().mapToLong(RevenueResponse.DailyRevenue::successfulPayments).sum(), "VND", days);
    }
}
