package com.example.cinema.report.service;

import com.example.cinema.report.dto.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevenueCsvExportServiceTest {
    @Mock RevenueAnalyticsService analytics;
    @InjectMocks RevenueCsvExportService service;

    private static final RevenueReportFilter FILTER = new RevenueReportFilter(
            LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), 1L, 10L);

    @Test
    void addsBomMetadataAndNeutralizesSpreadsheetFormulas() {
        when(analytics.export(any(), any(), any(), any(), eq(RevenueExportGroupBy.MOVIE)))
                .thenReturn(new RevenueExportData(FILTER, RevenueExportGroupBy.MOVIE, List.of(), List.of(
                        new RevenueBreakdownRow(1L, "Phim, \"Đặc biệt\"", "240000.00", 1, 3),
                        new RevenueBreakdownRow(2L, "=SUM(A1)", "0.00", 0, 0),
                        new RevenueBreakdownRow(3L, "@cmd", "0.00", 0, 0))));

        byte[] bytes = service.export(FILTER.from(), FILTER.to(), FILTER.cinemaId(), FILTER.movieId(),
                RevenueExportGroupBy.MOVIE);

        assertThat(bytes[0]).isEqualTo((byte) 0xEF);
        assertThat(bytes[1]).isEqualTo((byte) 0xBB);
        assertThat(bytes[2]).isEqualTo((byte) 0xBF);
        String text = new String(bytes, StandardCharsets.UTF_8);
        assertThat(text).contains("Báo cáo doanh thu thanh toán mô phỏng");
        assertThat(text).contains("Từ ngày,2026-11-01");
        assertThat(text).contains("Đến ngày,2026-11-30");
        assertThat(text).contains("Nhóm,MOVIE");
        assertThat(text).contains("Múi giờ,Asia/Ho_Chi_Minh");
        assertThat(text).contains("\"Phim, \"\"Đặc biệt\"\"\"");
        assertThat(text).contains("'=SUM(A1)");
        assertThat(text).contains("'@cmd");
        assertThat(text).contains("240000.00,1,3");
        assertThat(text).contains("\r\n");
    }

    @Test
    void rendersEverySeriesPointIncludingZeroPeriods() {
        when(analytics.export(any(), any(), any(), any(), eq(RevenueExportGroupBy.DAY)))
                .thenReturn(new RevenueExportData(FILTER, RevenueExportGroupBy.DAY, List.of(
                        new RevenueSeriesPoint("2026-11-01", "0.00", 0, 0),
                        new RevenueSeriesPoint("2026-11-02", "240000.00", 1, 3)), List.of()));

        String text = new String(service.export(FILTER.from(), FILTER.to(), null, null,
                RevenueExportGroupBy.DAY), StandardCharsets.UTF_8);

        assertThat(text).contains("Kỳ,Doanh thu (VND),Giao dịch thành công,Vé đã bán");
        assertThat(text).contains("2026-11-01,0.00,0,0");
        assertThat(text).contains("2026-11-02,240000.00,1,3");
    }

    @Test
    void emptyReportStillHasHeaderRows() {
        when(analytics.export(any(), any(), any(), any(), eq(RevenueExportGroupBy.CINEMA)))
                .thenReturn(new RevenueExportData(FILTER, RevenueExportGroupBy.CINEMA, List.of(), List.of()));

        String text = new String(service.export(FILTER.from(), FILTER.to(), null, null,
                RevenueExportGroupBy.CINEMA), StandardCharsets.UTF_8);

        assertThat(text).contains("ID,Tên,Doanh thu (VND),Giao dịch thành công,Vé đã bán");
    }
}
