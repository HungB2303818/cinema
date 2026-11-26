package com.example.cinema.report.service;

import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.repository.CinemaRepository;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.common.util.Requests;
import com.example.cinema.report.dto.*;
import com.example.cinema.report.repository.RevenueAnalyticsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class RevenueAnalyticsService {
    public static final String TIMEZONE = "Asia/Ho_Chi_Minh";
    public static final int MAX_RANGE_DAYS = 366;
    public static final int MAX_EXPORT_ROWS = 10_000;

    private static final ZoneId VIETNAM = ZoneId.of(TIMEZONE);
    private static final Set<String> BREAKDOWN_SORTS =
            Set.of("totalRevenue", "successfulPayments", "ticketsSold", "groupName");

    private final RevenueAnalyticsRepository analytics;
    private final CinemaRepository cinemas;
    private final MovieRepository movies;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public RevenueDashboardResponse dashboard(LocalDate from, LocalDate to, Long cinemaId, Long movieId,
            RevenueTimeGroup timeGroup) {
        RevenueReportFilter filter = normalize(from, to, cinemaId, movieId);
        RevenueTimeGroup group = timeGroup == null ? RevenueTimeGroup.DAY : timeGroup;
        Range range = range(filter);
        RevenueAnalyticsRepository.SummaryRow summaryRow =
                analytics.summary(range.from(), range.to(), idOrZero(filter.cinemaId()), idOrZero(filter.movieId()));
        List<RevenueSeriesPoint> series = series(filter, group, range);
        return new RevenueDashboardResponse(filter, group, summary(summaryRow), series, "VND", TIMEZONE,
                Instant.now());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public RevenueBreakdownResponse breakdown(LocalDate from, LocalDate to, Long cinemaId, Long movieId,
            RevenueGroupBy groupBy, int page, int size, String sort) {
        if (groupBy == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "groupBy phải là MOVIE hoặc CINEMA.");
        }
        Requests.page(page, size, sort, BREAKDOWN_SORTS);
        RevenueReportFilter filter = normalize(from, to, cinemaId, movieId);
        Range range = range(filter);
        String[] sortParts = sort.split(",", -1);
        String sortColumn = sortParts[0];
        String direction = sortParts[1].toUpperCase(Locale.ROOT);
        List<RevenueBreakdownRow> rows = analytics.breakdown(range.from(), range.to(),
                        idOrZero(filter.cinemaId()), idOrZero(filter.movieId()), groupBy,
                        sortColumn, direction, page * size, size)
                .stream().map(this::row).toList();
        long total = analytics.breakdownCount(range.from(), range.to(),
                idOrZero(filter.cinemaId()), idOrZero(filter.movieId()), groupBy);
        int totalPages = total == 0 ? 0 : (int) ((total + size - 1) / size);
        return new RevenueBreakdownResponse(filter, groupBy,
                new PageResponse<>(rows, page, size, total, totalPages), "VND", TIMEZONE, Instant.now());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public RevenueExportData export(LocalDate from, LocalDate to, Long cinemaId, Long movieId,
            RevenueExportGroupBy groupBy) {
        if (groupBy == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "groupBy phải là DAY, MONTH, MOVIE hoặc CINEMA.");
        }
        RevenueReportFilter filter = normalize(from, to, cinemaId, movieId);
        Range range = range(filter);
        if (groupBy == RevenueExportGroupBy.DAY || groupBy == RevenueExportGroupBy.MONTH) {
            RevenueTimeGroup group = groupBy == RevenueExportGroupBy.DAY ? RevenueTimeGroup.DAY : RevenueTimeGroup.MONTH;
            return new RevenueExportData(filter, groupBy, series(filter, group, range), List.of());
        }
        RevenueGroupBy group = groupBy == RevenueExportGroupBy.MOVIE ? RevenueGroupBy.MOVIE : RevenueGroupBy.CINEMA;
        List<RevenueAnalyticsRepository.BreakdownRow> rows = analytics.breakdownAll(range.from(), range.to(),
                idOrZero(filter.cinemaId()), idOrZero(filter.movieId()), group, MAX_EXPORT_ROWS + 1);
        if (rows.size() > MAX_EXPORT_ROWS) {
            throw new AppException(ErrorCode.REPORT_EXPORT_TOO_LARGE);
        }
        return new RevenueExportData(filter, groupBy, List.of(), rows.stream().map(this::row).toList());
    }

    private List<RevenueSeriesPoint> series(RevenueReportFilter filter, RevenueTimeGroup group, Range range) {
        String pattern = group == RevenueTimeGroup.DAY ? "%Y-%m-%d" : "%Y-%m";
        Map<String, RevenueAnalyticsRepository.SeriesRow> byPeriod = new HashMap<>();
        for (RevenueAnalyticsRepository.SeriesRow row : analytics.series(range.from(), range.to(),
                idOrZero(filter.cinemaId()), idOrZero(filter.movieId()), pattern)) {
            byPeriod.put(row.period(), row);
        }
        List<RevenueSeriesPoint> points = new ArrayList<>();
        if (group == RevenueTimeGroup.DAY) {
            for (LocalDate day = filter.from(); !day.isAfter(filter.to()); day = day.plusDays(1)) {
                points.add(point(day.toString(), byPeriod.get(day.toString())));
            }
        } else {
            YearMonth end = YearMonth.from(filter.to());
            for (YearMonth month = YearMonth.from(filter.from()); !month.isAfter(end); month = month.plusMonths(1)) {
                points.add(point(month.toString(), byPeriod.get(month.toString())));
            }
        }
        return points;
    }

    private static RevenueSeriesPoint point(String period, RevenueAnalyticsRepository.SeriesRow row) {
        return row == null
                ? new RevenueSeriesPoint(period, "0.00", 0, 0)
                : new RevenueSeriesPoint(period, money(row.revenue()), row.paymentCount(), row.tickets());
    }

    private RevenueSummary summary(RevenueAnalyticsRepository.SummaryRow row) {
        BigDecimal revenue = row.revenue() == null ? BigDecimal.ZERO : row.revenue();
        String average = row.paymentCount() == 0
                ? "0.00"
                : revenue.divide(BigDecimal.valueOf(row.paymentCount()), 2, RoundingMode.HALF_UP).toPlainString();
        return new RevenueSummary(money(revenue), row.paymentCount(), row.tickets(), average);
    }

    private RevenueBreakdownRow row(RevenueAnalyticsRepository.BreakdownRow row) {
        return new RevenueBreakdownRow(row.groupId(), row.groupName(), money(row.revenue()),
                row.paymentCount(), row.tickets());
    }

    private RevenueReportFilter normalize(LocalDate from, LocalDate to, Long cinemaId, Long movieId) {
        if (from == null || to == null || from.getYear() < 1000 || to.getYear() > 9998 || from.isAfter(to)) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Khoảng ngày không hợp lệ (năm 1000–9998, from <= to).");
        }
        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_RANGE_DAYS) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Khoảng ngày tối đa " + MAX_RANGE_DAYS + " ngày, tính cả hai đầu.");
        }
        if (cinemaId != null) {
            Requests.positiveId(cinemaId);
            if (!cinemas.existsById(cinemaId)) {
                throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy rạp đã chọn.");
            }
        }
        if (movieId != null) {
            Requests.positiveId(movieId);
            if (!movies.existsById(movieId)) {
                throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy phim đã chọn.");
            }
        }
        return new RevenueReportFilter(from, to, cinemaId, movieId);
    }

    private static Range range(RevenueReportFilter filter) {
        return new Range(filter.from().atStartOfDay(VIETNAM).toInstant(),
                filter.to().plusDays(1).atStartOfDay(VIETNAM).toInstant());
    }

    private static long idOrZero(Long id) {
        return id == null ? 0L : id;
    }

    private static String money(BigDecimal value) {
        return (value == null ? BigDecimal.ZERO : value).setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private record Range(Instant from, Instant to) {
    }
}
