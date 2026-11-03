package com.example.cinema.booking.controller;

import com.example.cinema.auth.security.*;
import com.example.cinema.booking.dto.*;
import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.config.SecurityConfig;
import com.example.cinema.common.error.*;
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

@WebMvcTest(BookingController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, DelegatedAuthenticationEntryPoint.class, DelegatedAccessDeniedHandler.class})
class BookingControllerTest {
    @Autowired MockMvc mvc;
    @MockBean BookingService service;
    @MockBean JwtUtils jwtUtils;
    @MockBean UserDetailsService userDetailsService;
    final String body = "{\"showtimeId\":1,\"seatIds\":[2],\"clientRequestId\":\"intent-1\"}";

    @Test void guestCannotReadOrWriteBookings() throws Exception {
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/bookings/me")).andExpect(status().isUnauthorized());
    }

    @Test @WithMockUser(roles = "STAFF") void staffCannotCreateCancelOrRead() throws Exception {
        denied();
        mvc.perform(get("/api/bookings/1")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test @WithMockUser(roles = "ADMIN") void adminCannotCreateOrCancelAsCustomer() throws Exception { denied(); }

    private void denied() throws Exception {
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/bookings/1/cancel")).andExpect(status().isForbidden());
        mvc.perform(get("/api/bookings/me")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "CUSTOMER") void newIntentReturns201AndReplayReturns200() throws Exception {
        var response = new BookingResponse(10L, "booking", 1L, BookingStatus.PENDING, List.of(2L), BigDecimal.TEN,
                Instant.parse("2026-11-10T11:35:00Z"));
        when(service.createBooking(any())).thenReturn(new BookingCreationResult(response, true), new BookingCreationResult(response, false));
        mvc.perform(post("/api/bookings").header("X-Correlation-ID", "booking-demo").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/bookings/10"))
                .andExpect(header().string("X-Correlation-ID", "booking-demo"))
                .andExpect(jsonPath("$.expiresAt").value("2026-11-10T11:35:00Z"));
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
    }

    @ParameterizedTest @WithMockUser(roles = "CUSTOMER")
    @ValueSource(strings = {"{}", "{", "{\"showtimeId\":1,\"seatIds\":[2,2],\"clientRequestId\":\"k\"}",
            "{\"showtimeId\":1,\"seatIds\":[],\"clientRequestId\":\"k\"}",
            "{\"showtimeId\":1,\"seatIds\":[null],\"clientRequestId\":\"k\"}",
            "{\"showtimeId\":1,\"seatIds\":[0],\"clientRequestId\":\"k\"}",
            "{\"showtimeId\":-1,\"seatIds\":[2],\"clientRequestId\":\"k\"}",
            "{\"showtimeId\":1,\"seatIds\":[1,2,3,4,5,6,7,8,9],\"clientRequestId\":\"k\"}",
            "{\"showtimeId\":1,\"seatIds\":[2],\"clientRequestId\":\"  \"}",
            "{\"showtimeId\":1.1,\"seatIds\":[2],\"clientRequestId\":\"k\"}",
            "{\"showtimeId\":1,\"seatIds\":[2.5],\"clientRequestId\":\"k\"}",
            "{\"showtimeId\":1,\"seatIds\":[\"2\"],\"clientRequestId\":\"k\"}"})
    void invalidInputIs400(String json) throws Exception {
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "CUSTOMER") void rejectsOversizedKeyAndIntegerOverflow() throws Exception {
        for (String json : List.of(body.replace("intent-1", "a".repeat(65)), body.replace("[2]", "[9223372036854775808]"))) {
            mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(json)).andExpect(status().isBadRequest());
        }
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "CUSTOMER") void returnsStandardConflictCutoffAndOwnershipErrors() throws Exception {
        when(service.createBooking(any())).thenThrow(new AppException(ErrorCode.SEAT_UNAVAILABLE), new AppException(ErrorCode.BOOKING_CUTOFF_PASSED));
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("SEAT_UNAVAILABLE"));
        mvc.perform(post("/api/bookings").contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isUnprocessableEntity());
        when(service.detail(10L)).thenThrow(new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        mvc.perform(get("/api/bookings/10")).andExpect(status().isNotFound());
    }
}
