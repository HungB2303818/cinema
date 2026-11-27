package com.example.cinema.report.controller;

import com.example.cinema.auth.security.*;
import com.example.cinema.common.config.SecurityConfig;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.report.dto.*;
import com.example.cinema.report.service.RevenueAnalyticsService;
import com.example.cinema.report.service.RevenueCsvExportService;
import com.example.cinema.report.service.RevenueService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RevenueController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, DelegatedAuthenticationEntryPoint.class,
        DelegatedAccessDeniedHandler.class})
class RevenueReportControllerTest {
    @Autowired MockMvc mvc;
    @MockBean RevenueService legacy;
    @MockBean RevenueAnalyticsService analytics;
    @MockBean RevenueCsvExportService csvExport;
    @MockBean JwtUtils jwtUtils;
    @MockBean UserDetailsService userDetailsService;

    static final String DASHBOARD = "/api/admin/reports/revenue/dashboard?from=2026-11-01&to=2026-11-30";
    static final String BREAKDOWN = "/api/admin/reports/revenue/breakdown?from=2026-11-01&to=2026-11-30&groupBy=MOVIE";
    static final String EXPORT = "/api/admin/reports/revenue/export?from=2026-11-01&to=2026-11-30&groupBy=DAY";

    @Test
    void guestsReceive401OnEveryReportEndpoint() throws Exception {
        mvc.perform(get("/api/admin/reports/revenue?from=2026-11-01&to=2026-11-30")).andExpect(status().isUnauthorized());
        mvc.perform(get(DASHBOARD)).andExpect(status().isUnauthorized());
        mvc.perform(get(BREAKDOWN)).andExpect(status().isUnauthorized());
        mvc.perform(get(EXPORT)).andExpect(status().isUnauthorized());
        verifyNoInteractions(legacy, analytics, csvExport);
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerAndStaffCannotReadOrExport() throws Exception {
        mvc.perform(get("/api/admin/reports/revenue?from=2026-11-01&to=2026-11-30")).andExpect(status().isForbidden());
        mvc.perform(get(DASHBOARD)).andExpect(status().isForbidden());
        mvc.perform(get(BREAKDOWN)).andExpect(status().isForbidden());
        mvc.perform(get(EXPORT)).andExpect(status().isForbidden());
        verifyNoInteractions(legacy, analytics, csvExport);
    }

    @Test
    @WithMockUser(roles = "STAFF")
    void staffCannotReadOrExport() throws Exception {
        mvc.perform(get(DASHBOARD)).andExpect(status().isForbidden());
        mvc.perform(get(EXPORT)).andExpect(status().isForbidden());
        verifyNoInteractions(analytics, csvExport);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminGetsDashboardWithDecimalStrings() throws Exception {
        var filter = new RevenueReportFilter(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), 1L, 10L);
        var summary = new RevenueSummary("240000.00", 1, 3, "240000.00");
        var series = List.of(new RevenueSeriesPoint("2026-11-01", "240000.00", 1, 3));
        when(analytics.dashboard(any(), any(), eq(1L), eq(10L), eq(RevenueTimeGroup.DAY)))
                .thenReturn(new RevenueDashboardResponse(filter, RevenueTimeGroup.DAY, summary, series, "VND",
                        RevenueAnalyticsService.TIMEZONE, Instant.parse("2026-11-26T10:00:00Z")));

        mvc.perform(get(DASHBOARD + "&cinemaId=1&movieId=10&timeGroup=DAY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.filter.cinemaId").value(1))
                .andExpect(jsonPath("$.summary.totalRevenue").value("240000.00"))
                .andExpect(jsonPath("$.summary.successfulPayments").value(1))
                .andExpect(jsonPath("$.summary.ticketsSold").value(3))
                .andExpect(jsonPath("$.summary.averageRevenuePerPayment").value("240000.00"))
                .andExpect(jsonPath("$.timeSeries[0].period").value("2026-11-01"))
                .andExpect(jsonPath("$.timeSeries[0].totalRevenue").value("240000.00"))
                .andExpect(jsonPath("$.currency").value("VND"))
                .andExpect(jsonPath("$.timezone").value("Asia/Ho_Chi_Minh"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminGetsPagedBreakdown() throws Exception {
        var filter = new RevenueReportFilter(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 30), null, null);
        var rows = new PageResponse<>(List.of(new RevenueBreakdownRow(3L, "Phim A", "500.00", 2, 4)),
                0, 20, 1, 1);
        when(analytics.breakdown(any(), any(), isNull(), isNull(), eq(RevenueGroupBy.MOVIE), eq(0), eq(20),
                eq("totalRevenue,desc")))
                .thenReturn(new RevenueBreakdownResponse(filter, RevenueGroupBy.MOVIE, rows, "VND",
                        RevenueAnalyticsService.TIMEZONE, Instant.now()));

        mvc.perform(get(BREAKDOWN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.groupBy").value("MOVIE"))
                .andExpect(jsonPath("$.rows.content[0].groupId").value(3))
                .andExpect(jsonPath("$.rows.content[0].totalRevenue").value("500.00"))
                .andExpect(jsonPath("$.rows.totalElements").value(1));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void invalidParametersAreRejectedBeforeTheService() throws Exception {
        mvc.perform(get("/api/admin/reports/revenue/dashboard?to=2026-11-30")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/reports/revenue/dashboard?from=bad&to=2026-11-30"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/reports/revenue/dashboard?from=2026-11-01&to=2026-11-30&timeGroup=WEEK"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mvc.perform(get("/api/admin/reports/revenue/breakdown?from=2026-11-01&to=2026-11-30&groupBy=ROOM"))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/reports/revenue/export?from=2026-11-01&to=2026-11-30"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(analytics, csvExport);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void exportReturnsUtf8CsvAttachmentWithBom() throws Exception {
        byte[] body = {(byte) 0xEF, (byte) 0xBB, (byte) 0xBF, 'a', ',', 'b'};
        when(csvExport.export(any(), any(), isNull(), isNull(), eq(RevenueExportGroupBy.DAY))).thenReturn(body);

        byte[] response = mvc.perform(get(EXPORT))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("text/csv")))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(header().string("Content-Disposition",
                        org.hamcrest.Matchers.containsString("revenue_2026-11-01_2026-11-30_by-day.csv")))
                .andReturn().getResponse().getContentAsByteArray();

        assertThat(response).containsExactly(body);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void exportOverLimitIs422WithDedicatedCode() throws Exception {
        when(csvExport.export(any(), any(), any(), any(), eq(RevenueExportGroupBy.CINEMA)))
                .thenThrow(new AppException(ErrorCode.REPORT_EXPORT_TOO_LARGE));

        mvc.perform(get("/api/admin/reports/revenue/export?from=2026-11-01&to=2026-11-30&groupBy=CINEMA"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("REPORT_EXPORT_TOO_LARGE"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void legacyEndpointStillUsesLegacyService() throws Exception {
        when(legacy.report(any(), any())).thenReturn(new RevenueResponse(java.math.BigDecimal.TEN, 1, "VND", List.of()));

        mvc.perform(get("/api/admin/reports/revenue?from=2026-11-01&to=2026-11-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRevenue").value(10))
                .andExpect(jsonPath("$.currency").value("VND"));
    }
}
