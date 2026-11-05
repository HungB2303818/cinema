package com.example.cinema.showtime.controller;

import com.example.cinema.auth.security.*;
import com.example.cinema.cinema.controller.AdminCinemaController;
import com.example.cinema.cinema.service.CinemaService;
import com.example.cinema.common.config.SecurityConfig;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.showtime.dto.*;
import com.example.cinema.showtime.service.ShowtimeService;
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
import java.time.Instant;
import java.util.List;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({AdminCinemaController.class, AdminShowtimeController.class, PublicShowtimeController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class, DelegatedAuthenticationEntryPoint.class, DelegatedAccessDeniedHandler.class})
class ScheduleControllerTest {
    @Autowired MockMvc mvc;
    @MockBean ShowtimeService showtimes;
    @MockBean CinemaService cinemas;
    @MockBean JwtUtils jwtUtils;
    @MockBean UserDetailsService userDetailsService;

    private static final String SHOWTIME = """
            {"movieId":1,"roomId":2,"startsAt":"2026-11-10T12:00:00Z",
             "endsAt":"2026-11-10T14:00:00Z","basePrice":75000}
            """;

    @Test void guestCanReadPublicEndpointsWithoutOwnerData() throws Exception {
        when(showtimes.schedule(eq(1L), any(), isNull(), eq(0), eq(20), eq("startsAt,asc")))
                .thenReturn(new PageResponse<>(List.of(), 0, 20, 0, 0));
        when(showtimes.seatMap(1L)).thenReturn(new SeatMapResponse(1L, Instant.parse("2026-11-10T12:00:00Z"),
                Instant.parse("2026-11-10T11:50:00Z"), List.of()));
        mvc.perform(get("/api/movies/1/showtimes?date=2026-11-10"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content").isArray());
        mvc.perform(get("/api/showtimes/1/seats")).andExpect(status().isOk())
                .andExpect(jsonPath("$.startsAt").value("2026-11-10T12:00:00Z"))
                .andExpect(jsonPath("$.currentBookingId").doesNotExist());
    }

    @Test void guestCanReadCinemaScheduleGroupedByMovie() throws Exception {
        var movieSummary = new MovieSummaryResponse(10L, "Phim Mẫu", "https://img.test/poster.jpg", "T18", 120);
        var showtimeItem = new ShowtimeResponse(101L, 10L, 1L, "Rạp Mẫu", 20L, "Phòng 01",
                Instant.parse("2026-11-10T11:00:00Z"), Instant.parse("2026-11-10T13:00:00Z"), 15,
                new java.math.BigDecimal("75000.00"), new java.math.BigDecimal("20000.00"),
                com.example.cinema.showtime.entity.ShowtimeStatus.SCHEDULED);
        var group = new CinemaMovieShowtimeGroupResponse(movieSummary, List.of(showtimeItem));

        when(showtimes.cinemaSchedule(eq(1L), any(), eq(0), eq(20)))
                .thenReturn(new PageResponse<>(List.of(group), 0, 20, 1, 1));

        mvc.perform(get("/api/cinemas/1/showtimes?date=2026-11-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].movie.title").value("Phim Mẫu"))
                .andExpect(jsonPath("$.content[0].movie.ageRating").value("T18"))
                .andExpect(jsonPath("$.content[0].showtimes[0].id").value(101))
                .andExpect(jsonPath("$.content[0].showtimes[0].roomName").value("Phòng 01"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/movies/1/showtimes", "/api/movies/1/showtimes?date=bad",
            "/api/movies/1/showtimes?date=2026-02-30", "/api/showtimes/abc/seats",
            "/api/cinemas/1/showtimes", "/api/cinemas/1/showtimes?date=bad",
            "/api/cinemas/1/showtimes?date=2026-02-30", "/api/cinemas/abc/showtimes?date=2026-11-10",
            "/api/cinemas/1/showtimes?date=2026-11-10&sort=startsAt,asc"})
    void invalidDateOrIdIs400(String url) throws Exception {
        mvc.perform(get(url)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test void guestCannotManageRoomsSeatsOrShowtimes() throws Exception { deniedWrites(401); }
    @Test @WithMockUser(roles = "CUSTOMER") void customerCannotManage() throws Exception { deniedWrites(403); }
    @Test @WithMockUser(roles = "STAFF") void staffCannotManage() throws Exception { deniedWrites(403); }

    private void deniedWrites(int status) throws Exception {
        for (String path : List.of("/api/admin/rooms", "/api/admin/rooms/1/seats", "/api/admin/showtimes")) {
            mvc.perform(post(path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().is(status));
        }
        mvc.perform(put("/api/admin/showtimes/1").contentType(MediaType.APPLICATION_JSON).content(SHOWTIME))
                .andExpect(status().is(status));
        verifyNoInteractions(cinemas, showtimes);
    }

    @Test @WithMockUser(roles = "ADMIN") void adminCanCreateRoomAndSeats() throws Exception {
        when(cinemas.createRoom(any())).thenReturn(new com.example.cinema.cinema.dto.RoomResponse(
                2L, 1L, "Phòng 1", com.example.cinema.cinema.entity.RoomStatus.ACTIVE));
        when(cinemas.createSeats(eq(2L), any())).thenReturn(List.of());
        mvc.perform(post("/api/admin/rooms").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"cinemaId\":1,\"name\":\"Phòng 1\",\"status\":\"ACTIVE\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/admin/rooms/2/seats").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"seats\":[{\"seatRow\":\"A\",\"seatNumber\":1,\"seatType\":\"VIP\",\"status\":\"ACTIVE\"}]}"))
                .andExpect(status().isCreated());
    }

    @Test @WithMockUser(roles = "ADMIN") void validatesDefaultsAndAcceptsOffsetTimestamps() throws Exception {
        mvc.perform(put("/api/admin/showtimes/1").contentType(MediaType.APPLICATION_JSON)
                        .content(SHOWTIME.replace("12:00:00Z", "19:00:00+07:00")))
                .andExpect(status().isOk());
        verify(showtimes).update(eq(1L), argThat(r -> r.startsAt().equals(Instant.parse("2026-11-10T12:00:00Z"))
                && r.cleanupMinutes() == 15 && r.vipSurcharge().signum() == 0));
    }

    @ParameterizedTest @WithMockUser(roles = "ADMIN")
    @ValueSource(strings = {"{}", "{", "{\"seats\":[]}", "{\"seats\":[null]}",
            "{\"seats\":[{\"seatRow\":\"A\",\"seatNumber\":0,\"seatType\":\"VIP\",\"status\":\"ACTIVE\"}]}",
            "{\"seats\":[{\"seatRow\":\"A1\",\"seatNumber\":1,\"seatType\":\"VIP\",\"status\":\"BOOKED\"}]}"})
    void rejectsInvalidSeatBatches(String body) throws Exception {
        mvc.perform(post("/api/admin/rooms/1/seats").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(cinemas);
    }

    @Test @WithMockUser(roles = "ADMIN") void rejectsInvalidMoneyAndCleanup() throws Exception {
        for (String body : List.of(SHOWTIME.replace("75000", "-1"), SHOWTIME.replace("75000", "1.001"),
                SHOWTIME.replace("75000", "10000000000"), SHOWTIME.replace("\"basePrice\":75000", "\"basePrice\":75000,\"cleanupMinutes\":-1"))) {
            mvc.perform(post("/api/admin/showtimes").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(showtimes);
    }

    @Test @WithMockUser(roles = "ADMIN") void returnsStandardBusinessConflictAndUnavailableErrors() throws Exception {
        when(showtimes.create(any())).thenThrow(new com.example.cinema.common.error.AppException(
                com.example.cinema.common.error.ErrorCode.SHOWTIME_OVERLAP));
        mvc.perform(post("/api/admin/showtimes").contentType(MediaType.APPLICATION_JSON).content(SHOWTIME))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("SHOWTIME_OVERLAP"));
        doThrow(new com.example.cinema.common.error.AppException(
                com.example.cinema.common.error.ErrorCode.ROOM_UNAVAILABLE)).when(showtimes).create(any());
        mvc.perform(post("/api/admin/showtimes").contentType(MediaType.APPLICATION_JSON).content(SHOWTIME))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("ROOM_UNAVAILABLE"));
    }

    @Test @WithMockUser(roles = "ADMIN") void databaseConflictsDoNotExposeSql() throws Exception {
        when(showtimes.create(any())).thenThrow(new org.springframework.dao.DataIntegrityViolationException("private SQL"));
        mvc.perform(post("/api/admin/showtimes").contentType(MediaType.APPLICATION_JSON).content(SHOWTIME))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("RESOURCE_STATE_CONFLICT"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private SQL"))));
    }
}
