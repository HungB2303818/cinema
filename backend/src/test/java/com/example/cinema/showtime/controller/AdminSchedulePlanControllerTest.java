package com.example.cinema.showtime.controller;

import com.example.cinema.auth.security.*;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.common.config.SecurityConfig;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.entity.SchedulePlanStatus;
import com.example.cinema.showtime.service.SchedulePlanService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminSchedulePlanController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, DelegatedAuthenticationEntryPoint.class,
        DelegatedAccessDeniedHandler.class})
class AdminSchedulePlanControllerTest {

    @Autowired MockMvc mvc;
    @MockBean SchedulePlanService service;
    @MockBean JwtUtils jwtUtils;
    @MockBean UserDetailsService userDetailsService;

    private static final String PAYLOAD = """
            {"name":"Lịch tháng 12","roomId":2,"effectiveFrom":"2026-12-01",
             "effectiveTo":"2026-12-31","daysOfWeek":[1,2,3,4,5,6,7],
             "openTime":"09:00","closeTime":"23:00","slotStepMinutes":15,
             "cleanupMinutes":15,"basePrice":75000,"vipSurcharge":20000,
             "movieIds":[10,11],"status":"ACTIVE"}
            """;

    private static SchedulePlanMovieResponse movieItem() {
        return new SchedulePlanMovieResponse(10L, "Phim A", 120, MovieStatus.SHOWING,
                LocalDate.of(2026, 11, 1), 0);
    }

    private static SchedulePlanResponse planResponse() {
        return new SchedulePlanResponse(5L, "Lịch tháng 12", 2L, "Phòng 1", 1L, "Rạp Mẫu",
                LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31),
                List.of(1, 2, 3, 4, 5, 6, 7), LocalTime.of(9, 0), LocalTime.of(23, 0),
                15, 15, new BigDecimal("75000.00"), new BigDecimal("20000.00"),
                SchedulePlanStatus.ACTIVE, 1, List.of(movieItem()));
    }

    private static SchedulePlanSummaryResponse summaryResponse() {
        return new SchedulePlanSummaryResponse(5L, "Lịch tháng 12", 2L, "Phòng 1", 1L, "Rạp Mẫu",
                LocalDate.of(2026, 12, 1), LocalDate.of(2026, 12, 31),
                List.of(1, 2, 3, 4, 5, 6, 7), LocalTime.of(9, 0), LocalTime.of(23, 0),
                15, 15, new BigDecimal("75000.00"), new BigDecimal("20000.00"),
                SchedulePlanStatus.ACTIVE, 1);
    }

    @Test
    void guestIsUnauthenticated() throws Exception {
        mvc.perform(get("/api/admin/schedule-plans"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerIsForbidden() throws Exception {
        mvc.perform(get("/api/admin/schedule-plans"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminListsPlans() throws Exception {
        when(service.list(isNull(), isNull(), isNull(), eq(0), eq(20), eq("id,desc")))
                .thenReturn(new PageResponse<>(List.of(summaryResponse()), 0, 20, 1, 1));

        mvc.perform(get("/api/admin/schedule-plans"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value("Lịch tháng 12"))
                .andExpect(jsonPath("$.content[0].openTime").value("09:00"))
                .andExpect(jsonPath("$.content[0].movieCount").value(1));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminCreatesPlan() throws Exception {
        when(service.create(any(SchedulePlanRequest.class), eq("admin")))
                .thenReturn(planResponse());

        mvc.perform(post("/api/admin/schedule-plans")
                        .contentType(MediaType.APPLICATION_JSON).content(PAYLOAD))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/admin/schedule-plans/5"))
                .andExpect(jsonPath("$.id").value(5))
                .andExpect(jsonPath("$.daysOfWeek[6]").value(7))
                .andExpect(jsonPath("$.movies[0].priority").value(0));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminGeneratesSchedule() throws Exception {
        var result = new GenerationDateResult(LocalDate.of(2026, 12, 1),
                GenerationOutcome.PARTIAL, 4, 1, "Đã tạo 4 suất.");
        when(service.generate(eq(5L), eq(LocalDate.of(2026, 12, 1)),
                eq(LocalDate.of(2026, 12, 2)), eq("admin")))
                .thenReturn(new GenerationSummaryResponse(5L, LocalDate.of(2026, 12, 1),
                        LocalDate.of(2026, 12, 2), 4, 1, 0, List.of(result)));

        mvc.perform(post("/api/admin/schedule-plans/5/generate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"from\":\"2026-12-01\",\"to\":\"2026-12-02\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.createdCount").value(4))
                .andExpect(jsonPath("$.dates[0].outcome").value("PARTIAL"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminReadsLogs() throws Exception {
        var log = new GenerationLogResponse(10L, 5L, LocalDate.of(2026, 12, 1),
                GenerationOutcome.SUCCESS, 4, 0, "Đã tạo 4 suất.",
                Instant.parse("2026-11-24T00:30:02Z"));
        when(service.logs(eq(5L), isNull(), isNull(), eq(0), eq(20)))
                .thenReturn(new PageResponse<>(List.of(log), 0, 20, 1, 1));

        mvc.perform(get("/api/admin/schedule-plans/5/logs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].outcome").value("SUCCESS"))
                .andExpect(jsonPath("$.content[0].createdAt").value("2026-11-24T00:30:02Z"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void invalidPayloadIsRejected() throws Exception {
        mvc.perform(post("/api/admin/schedule-plans")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\",\"roomId\":2,\"daysOfWeek\":[],\"movieIds\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        verifyNoInteractions(service);
    }
}
