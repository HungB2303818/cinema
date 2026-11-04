package com.example.cinema.payment.controller;

import com.example.cinema.auth.security.*;
import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.common.config.SecurityConfig;
import com.example.cinema.common.error.*;
import com.example.cinema.payment.dto.PaymentResponse;
import com.example.cinema.payment.entity.PaymentStatus;
import com.example.cinema.payment.service.PaymentService;
import com.example.cinema.report.controller.RevenueController;
import com.example.cinema.report.dto.RevenueResponse;
import com.example.cinema.report.service.RevenueService;
import com.example.cinema.ticket.controller.TicketController;
import com.example.cinema.ticket.dto.*;
import com.example.cinema.ticket.service.TicketService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({PaymentController.class, TicketController.class, RevenueController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class, DelegatedAuthenticationEntryPoint.class, DelegatedAccessDeniedHandler.class})
class PaymentTicketControllerTest {
    @Autowired MockMvc mvc;
    @MockBean PaymentService payments;
    @MockBean TicketService tickets;
    @MockBean RevenueService revenue;
    @MockBean JwtUtils jwtUtils;
    @MockBean UserDetailsService userDetailsService;
    final String paymentPath = "/api/bookings/1/payments/mock";
    final String checkinPath = "/api/staff/tickets/check-in";
    final String reportPath = "/api/admin/reports/revenue?from=2026-11-01&to=2026-11-30";
    final String body = "{\"simulatedResult\":\"SUCCESS\",\"idempotencyKey\":\"key-1\"}";

    @Test void guestsCannotUseAnyWeekFourEndpoint() throws Exception {
        mvc.perform(post(paymentPath).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/bookings/1/tickets")).andExpect(status().isUnauthorized());
        mvc.perform(post(checkinPath).contentType(MediaType.APPLICATION_JSON).content("{\"ticketCode\":\"code\"}")).andExpect(status().isUnauthorized());
        mvc.perform(get(reportPath)).andExpect(status().isUnauthorized());
        verifyNoInteractions(payments, tickets, revenue);
    }

    @Test @WithMockUser(roles = "CUSTOMER") void customerCanPayReadTicketsButCannotCheckinOrReport() throws Exception {
        var items = List.of(new TicketResponse(2L, "A1", "random-code"));
        when(payments.pay(eq(1L), any())).thenReturn(new PaymentResponse(1L, "booking", BookingStatus.CONFIRMED, PaymentStatus.SUCCESS,
                Instant.parse("2026-11-10T11:32:00Z"), items, null));
        when(tickets.tickets(1L)).thenReturn(items);
        mvc.perform(post(paymentPath).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk())
                .andExpect(jsonPath("$.paidAt").value("2026-11-10T11:32:00Z"))
                .andExpect(jsonPath("$.tickets[0].ticketCode").value("random-code"));
        mvc.perform(get("/api/bookings/1/tickets")).andExpect(status().isOk()).andExpect(jsonPath("$[0].label").value("A1"));
        mvc.perform(post(checkinPath).contentType(MediaType.APPLICATION_JSON).content("{\"ticketCode\":\"code\"}")).andExpect(status().isForbidden());
        mvc.perform(get(reportPath)).andExpect(status().isForbidden());
    }

    @Test @WithMockUser(roles = "STAFF") void staffCanCheckinButCannotPayReadTicketsOrReport() throws Exception {
        when(tickets.checkin(any())).thenReturn(new CheckinResponse("CHECKED_IN", "Phim", "Phòng 1", "A1", Instant.parse("2026-11-10T11:40:00Z")));
        mvc.perform(post(checkinPath).contentType(MediaType.APPLICATION_JSON).content("{\"ticketCode\":\"code\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.result").value("CHECKED_IN"))
                .andExpect(jsonPath("$.checkedInAt").value("2026-11-10T11:40:00Z"));
        mvc.perform(post(paymentPath).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(get("/api/bookings/1/tickets")).andExpect(status().isForbidden());
        mvc.perform(get(reportPath)).andExpect(status().isForbidden());
        verifyNoInteractions(payments, revenue);
    }

    @Test @WithMockUser(roles = "ADMIN") void adminCanReadTicketsCheckinAndReportButCannotPayAsCustomer() throws Exception {
        when(tickets.tickets(1L)).thenReturn(List.of());
        when(revenue.report(any(), any())).thenReturn(new RevenueResponse(BigDecimal.ZERO, 0, "VND", List.of()));
        mvc.perform(get("/api/bookings/1/tickets")).andExpect(status().isOk());
        mvc.perform(post(checkinPath).contentType(MediaType.APPLICATION_JSON).content("{\"ticketCode\":\"code\"}")).andExpect(status().isOk());
        mvc.perform(get(reportPath)).andExpect(status().isOk()).andExpect(jsonPath("$.currency").value("VND"));
        mvc.perform(post(paymentPath).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        verifyNoInteractions(payments);
    }

    @ParameterizedTest @WithMockUser(roles = "CUSTOMER")
    @ValueSource(strings = {"{}", "{", "{\"simulatedResult\":\"INITIATED\",\"idempotencyKey\":\"k\"}",
            "{\"simulatedResult\":0,\"idempotencyKey\":\"k\"}", "{\"simulatedResult\":\"success\",\"idempotencyKey\":\"k\"}",
            "{\"simulatedResult\":\"SUCCESS\",\"idempotencyKey\":\" \"}", "{\"simulatedResult\":null,\"idempotencyKey\":\"k\"}"})
    void invalidPaymentIs400BeforeService(String json) throws Exception {
        mvc.perform(post(paymentPath).contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(payments);
    }

    @Test @WithMockUser(roles = "CUSTOMER") void oversizedPaymentKeyIs400() throws Exception {
        mvc.perform(post(paymentPath).contentType(MediaType.APPLICATION_JSON).content(body.replace("key-1", "a".repeat(65))))
                .andExpect(status().isBadRequest()); verifyNoInteractions(payments);
    }

    @ParameterizedTest @WithMockUser(roles = "STAFF")
    @ValueSource(strings = {"{}", "{", "{\"ticketCode\":null}", "{\"ticketCode\":\" \"}"})
    void invalidCheckinIs400(String json) throws Exception {
        mvc.perform(post(checkinPath).contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isBadRequest());
        verifyNoInteractions(tickets);
    }

    @Test @WithMockUser(roles = "STAFF") void oversizedTicketCodeIs400() throws Exception {
        mvc.perform(post(checkinPath).contentType(MediaType.APPLICATION_JSON).content("{\"ticketCode\":\"" + "a".repeat(49) + "\"}"))
                .andExpect(status().isBadRequest()); verifyNoInteractions(tickets);
    }

    @ParameterizedTest @WithMockUser(roles = "ADMIN")
    @ValueSource(strings = {"", "?from=2026-11-01", "?from=bad&to=2026-11-30", "?from=2026-02-30&to=2026-11-30"})
    void invalidReportDatesAre400(String query) throws Exception {
        mvc.perform(get("/api/admin/reports/revenue" + query)).andExpect(status().isBadRequest());
        verifyNoInteractions(revenue);
    }

    @Test @WithMockUser(roles = "CUSTOMER") void failedPaymentReturns200AndConflictAndOwnershipUseErrorEnvelope() throws Exception {
        when(payments.pay(eq(1L), any())).thenReturn(new PaymentResponse(1L, null, BookingStatus.PENDING, PaymentStatus.FAILED, null, null, "Thất bại"));
        mvc.perform(post(paymentPath).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("FAILED")).andExpect(jsonPath("$.tickets").doesNotExist());
        when(payments.pay(eq(1L), any())).thenThrow(new AppException(ErrorCode.IDEMPOTENCY_CONFLICT));
        mvc.perform(post(paymentPath).contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        when(tickets.tickets(1L)).thenThrow(new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        mvc.perform(get("/api/bookings/1/tickets")).andExpect(status().isNotFound());
    }

    @Test @WithMockUser(roles = "STAFF") void duplicateAndOutOfWindowUse409And422() throws Exception {
        when(tickets.checkin(any())).thenThrow(new AppException(ErrorCode.TICKET_ALREADY_USED), new AppException(ErrorCode.CHECKIN_TIME_INVALID));
        mvc.perform(post(checkinPath).contentType(MediaType.APPLICATION_JSON).content("{\"ticketCode\":\"code\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("TICKET_ALREADY_USED"));
        mvc.perform(post(checkinPath).contentType(MediaType.APPLICATION_JSON).content("{\"ticketCode\":\"code\"}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("CHECKIN_TIME_INVALID"));
    }
}
