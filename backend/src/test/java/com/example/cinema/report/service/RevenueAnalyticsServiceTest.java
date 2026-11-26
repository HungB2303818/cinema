package com.example.cinema.report.service;

import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.repository.CinemaRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.report.dto.*;
import com.example.cinema.report.repository.RevenueAnalyticsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevenueAnalyticsServiceTest {
    @Mock RevenueAnalyticsRepository analytics;
    @Mock CinemaRepository cinemas;
    @Mock MovieRepository movies;
    @InjectMocks RevenueAnalyticsService service;

    private static final LocalDate FROM = LocalDate.of(2026, 11, 1);
    private static final LocalDate TO = LocalDate.of(2026, 11, 3);

    @Test
    void rejectsMissingOrInvertedOrOversizedRanges() {
        assertCode(() -> service.dashboard(null, TO, null, null, RevenueTimeGroup.DAY), ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.dashboard(TO, FROM, null, null, RevenueTimeGroup.DAY), ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.dashboard(FROM, FROM.plusDays(366), null, null, RevenueTimeGroup.DAY),
                ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.dashboard(LocalDate.of(999, 1, 1), TO, null, null, RevenueTimeGroup.DAY),
                ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void rejectsUnknownCinemaAndMovieAndNonPositiveIds() {
        when(cinemas.existsById(9L)).thenReturn(false);
        when(movies.existsById(9L)).thenReturn(false);
        assertCode(() -> service.dashboard(FROM, TO, 9L, null, RevenueTimeGroup.DAY), ErrorCode.RESOURCE_NOT_FOUND);
        assertCode(() -> service.dashboard(FROM, TO, null, 9L, RevenueTimeGroup.DAY), ErrorCode.RESOURCE_NOT_FOUND);
        assertCode(() -> service.dashboard(FROM, TO, 0L, null, RevenueTimeGroup.DAY), ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.dashboard(FROM, TO, null, -1L, RevenueTimeGroup.DAY), ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void dashboardZeroFillsDaysAndKeepsSummaryAtPaymentGrain() {
        when(analytics.summary(any(), any(), eq(0L), eq(0L)))
                .thenReturn(new RevenueAnalyticsRepository.SummaryRow(new BigDecimal("240000.00"), 1, 3));
        when(analytics.series(any(), any(), eq(0L), eq(0L), eq("%Y-%m-%d")))
                .thenReturn(List.of(new RevenueAnalyticsRepository.SeriesRow("2026-11-02",
                        new BigDecimal("240000.00"), 1, 3)));

        RevenueDashboardResponse response = service.dashboard(FROM, TO, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().totalRevenue()).isEqualTo("240000.00");
        assertThat(response.summary().successfulPayments()).isEqualTo(1);
        assertThat(response.summary().ticketsSold()).isEqualTo(3);
        assertThat(response.summary().averageRevenuePerPayment()).isEqualTo("240000.00");
        assertThat(response.timeSeries()).extracting(RevenueSeriesPoint::period)
                .containsExactly("2026-11-01", "2026-11-02", "2026-11-03");
        assertThat(response.timeSeries()).extracting(RevenueSeriesPoint::totalRevenue)
                .containsExactly("0.00", "240000.00", "0.00");
        assertThat(response.timeSeries().get(1).ticketsSold()).isEqualTo(3);
        assertThat(response.timezone()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(response.generatedAt()).isBeforeOrEqualTo(Instant.now());
    }

    @Test
    void dashboardZeroFillsMonthsAcrossYearBoundary() {
        when(analytics.summary(any(), any(), anyLong(), anyLong()))
                .thenReturn(new RevenueAnalyticsRepository.SummaryRow(BigDecimal.ZERO, 0, 0));
        when(analytics.series(any(), any(), anyLong(), anyLong(), eq("%Y-%m"))).thenReturn(List.of());

        RevenueDashboardResponse response = service.dashboard(LocalDate.of(2026, 11, 15),
                LocalDate.of(2027, 1, 2), null, null, RevenueTimeGroup.MONTH);

        assertThat(response.timeSeries()).extracting(RevenueSeriesPoint::period)
                .containsExactly("2026-11", "2026-12", "2027-01");
        assertThat(response.timeSeries()).allSatisfy(point -> assertThat(point.totalRevenue()).isEqualTo("0.00"));
        assertThat(response.summary().averageRevenuePerPayment()).isEqualTo("0.00");
    }

    @Test
    void roundsAverageHalfUpToTwoDecimals() {
        when(analytics.summary(any(), any(), anyLong(), anyLong()))
                .thenReturn(new RevenueAnalyticsRepository.SummaryRow(new BigDecimal("100.00"), 3, 3));
        when(analytics.series(any(), any(), anyLong(), anyLong(), anyString())).thenReturn(List.of());

        RevenueDashboardResponse response = service.dashboard(FROM, FROM, null, null, RevenueTimeGroup.DAY);

        assertThat(response.summary().averageRevenuePerPayment()).isEqualTo("33.33");
    }

    @Test
    void breakdownRejectsInvalidSortPageAndSize() {
        assertCode(() -> service.breakdown(FROM, TO, null, null, RevenueGroupBy.MOVIE, 0, 20, "amount,desc"),
                ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.breakdown(FROM, TO, null, null, RevenueGroupBy.MOVIE, 0, 20, "totalRevenue"),
                ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.breakdown(FROM, TO, null, null, RevenueGroupBy.MOVIE, -1, 20, "totalRevenue,desc"),
                ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.breakdown(FROM, TO, null, null, RevenueGroupBy.MOVIE, 0, 101, "totalRevenue,desc"),
                ErrorCode.VALIDATION_ERROR);
        assertCode(() -> service.breakdown(FROM, TO, null, null, null, 0, 20, "totalRevenue,desc"),
                ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void breakdownReturnsPagedGroupsWithStableTotals() {
        when(analytics.breakdown(any(), any(), anyLong(), anyLong(), eq(RevenueGroupBy.MOVIE),
                eq("totalRevenue"), eq("DESC"), eq(2), eq(2)))
                .thenReturn(List.of(new RevenueAnalyticsRepository.BreakdownRow(7L, "Phim B",
                        new BigDecimal("500.00"), 2, 4)));
        when(analytics.breakdownCount(any(), any(), anyLong(), anyLong(), eq(RevenueGroupBy.MOVIE)))
                .thenReturn(3L);

        RevenueBreakdownResponse response = service.breakdown(FROM, TO, null, null, RevenueGroupBy.MOVIE,
                1, 2, "totalRevenue,desc");

        assertThat(response.rows().content()).singleElement().satisfies(row -> {
            assertThat(row.groupId()).isEqualTo(7L);
            assertThat(row.totalRevenue()).isEqualTo("500.00");
            assertThat(row.successfulPayments()).isEqualTo(2);
            assertThat(row.ticketsSold()).isEqualTo(4);
        });
        assertThat(response.rows().page()).isEqualTo(1);
        assertThat(response.rows().size()).isEqualTo(2);
        assertThat(response.rows().totalElements()).isEqualTo(3);
        assertThat(response.rows().totalPages()).isEqualTo(2);
    }

    @Test
    void exportRejectsMoreThanTenThousandRowsInsteadOfTruncating() {
        List<RevenueAnalyticsRepository.BreakdownRow> rows = new ArrayList<>();
        for (int i = 0; i < RevenueAnalyticsService.MAX_EXPORT_ROWS + 1; i++) {
            rows.add(new RevenueAnalyticsRepository.BreakdownRow((long) i + 1, "Phim " + i, BigDecimal.ONE, 1, 1));
        }
        when(analytics.breakdownAll(any(), any(), anyLong(), anyLong(), eq(RevenueGroupBy.CINEMA), anyInt()))
                .thenReturn(rows);

        assertCode(() -> service.export(FROM, TO, null, null, RevenueExportGroupBy.CINEMA),
                ErrorCode.REPORT_EXPORT_TOO_LARGE);
    }

    @Test
    void exportTimeGroupsUseZeroFilledSeries() {
        when(analytics.series(any(), any(), anyLong(), anyLong(), eq("%Y-%m-%d")))
                .thenReturn(List.of(new RevenueAnalyticsRepository.SeriesRow("2026-11-02",
                        new BigDecimal("240000.00"), 1, 3)));

        RevenueExportData data = service.export(FROM, TO, null, null, RevenueExportGroupBy.DAY);

        assertThat(data.series()).hasSize(3);
        assertThat(data.breakdown()).isEmpty();
        assertThat(data.series().get(1).totalRevenue()).isEqualTo("240000.00");
    }

    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
