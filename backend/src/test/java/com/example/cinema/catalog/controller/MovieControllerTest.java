package com.example.cinema.catalog.controller;

import com.example.cinema.auth.security.DelegatedAccessDeniedHandler;
import com.example.cinema.auth.security.DelegatedAuthenticationEntryPoint;
import com.example.cinema.auth.security.JwtAuthFilter;
import com.example.cinema.auth.security.JwtUtils;
import com.example.cinema.catalog.dto.MoviePageResponse;
import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.service.MovieService;
import com.example.cinema.common.config.SecurityConfig;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({MovieController.class, AdminMovieController.class})
@Import({SecurityConfig.class, JwtAuthFilter.class, DelegatedAuthenticationEntryPoint.class,
        DelegatedAccessDeniedHandler.class})
class MovieControllerTest {
    @Autowired private MockMvc mvc;
    @MockBean private MovieService service;
    @MockBean private JwtUtils jwtUtils;
    @MockBean private UserDetailsService userDetailsService;

    private static final String BODY = """
            {"title":"Phim mới","durationMinutes":120,"status":"UPCOMING"}
            """;

    @Test
    void guestCanListAndReadMovie() throws Exception {
        when(service.list(null, null, null, 0, 20, "releaseDate,desc"))
                .thenReturn(new MoviePageResponse(List.of(response()), 0, 20, 1, 1));
        when(service.getPublic(1L)).thenReturn(response());
        mvc.perform(get("/api/movies")).andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].title").value("Phim mới"))
                .andExpect(jsonPath("$.size").value(20));
        mvc.perform(get("/api/movies/1")).andExpect(status().isOk());
    }

    @Test
    void forwardsFiltersAndPagination() throws Exception {
        when(service.list("Phim", MovieStatus.SHOWING, "Drama", 1, 5, "title,asc"))
                .thenReturn(new MoviePageResponse(List.of(), 1, 5, 0, 0));
        mvc.perform(get("/api/movies").param("keyword", "Phim").param("status", "SHOWING")
                        .param("genre", "Drama").param("page", "1").param("size", "5").param("sort", "title,asc"))
                .andExpect(status().isOk());
        verify(service).list("Phim", MovieStatus.SHOWING, "Drama", 1, 5, "title,asc");
    }

    @Test
    void hiddenOrMissingMovieIs404() throws Exception {
        when(service.getPublic(1L)).thenThrow(new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        mvc.perform(get("/api/movies/1")).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/movies?status=INVALID", "/api/movies?page=abc", "/api/movies/not-a-number"})
    void invalidParametersAre400(String path) throws Exception {
        mvc.perform(get(path)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void guestCannotReadOrWriteAdmin() throws Exception {
        mvc.perform(get("/api/admin/movies")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/movies/1")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/admin/movies").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/admin/movies/1").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @Test
    @WithMockUser(roles = "CUSTOMER")
    void customerCannotReadOrWriteAdmin() throws Exception {
        assertAdminForbidden();
    }

    @Test
    @WithMockUser(roles = "STAFF")
    void staffCannotReadOrWriteAdmin() throws Exception {
        assertAdminForbidden();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanListAndReadAdminMoviesIncludingHidden() throws Exception {
        MovieResponse hiddenMovie = new MovieResponse(10L, "Phim ẩn", null, 90, null, null, null, null, MovieStatus.HIDDEN);
        when(service.listAdmin(null, null, null, 0, 20, "releaseDate,desc"))
                .thenReturn(new MoviePageResponse(List.of(hiddenMovie), 0, 20, 1, 1));
        when(service.getAdmin(10L)).thenReturn(hiddenMovie);

        mvc.perform(get("/api/admin/movies"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].status").value("HIDDEN"));

        mvc.perform(get("/api/admin/movies/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(10))
                .andExpect(jsonPath("$.status").value("HIDDEN"));

        verify(service).listAdmin(null, null, null, 0, 20, "releaseDate,desc");
        verify(service).getAdmin(10L);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminGetNonExistentMovieReturns404() throws Exception {
        when(service.getAdmin(999L)).thenThrow(new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy phim."));
        mvc.perform(get("/api/admin/movies/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminCanCreateAndUpdate() throws Exception {
        when(service.create(any())).thenReturn(response());
        when(service.update(eq(1L), any())).thenReturn(response());
        mvc.perform(post("/api/admin/movies").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/admin/movies/1"));
        mvc.perform(put("/api/admin/movies/1").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(1));
    }

    @ParameterizedTest
    @WithMockUser(roles = "ADMIN")
    @ValueSource(strings = {
            "{}", "{", "{\"title\":\"  \",\"durationMinutes\":120,\"status\":\"SHOWING\"}",
            "{\"title\":\"A\",\"durationMinutes\":0,\"status\":\"SHOWING\"}",
            "{\"title\":\"A\",\"durationMinutes\":65536,\"status\":\"SHOWING\"}",
            "{\"title\":\"A\",\"durationMinutes\":120,\"status\":\"INVALID\"}",
            "{\"title\":\"A\",\"durationMinutes\":120,\"status\":\"SHOWING\",\"posterUrl\":\"javascript:alert(1)\"}",
            "{\"title\":\"A\",\"durationMinutes\":120,\"status\":\"SHOWING\",\"releaseDate\":\"not-a-date\"}"
    })
    void invalidBodyIs400(String body) throws Exception {
        mvc.perform(post("/api/admin/movies").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(service);
    }

    private void assertAdminForbidden() throws Exception {
        mvc.perform(get("/api/admin/movies"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        mvc.perform(get("/api/admin/movies/1"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        mvc.perform(post("/api/admin/movies").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
        mvc.perform(put("/api/admin/movies/1").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    private MovieResponse response() {
        return new MovieResponse(1L, "Phim mới", null, 120, null, null, null, null, MovieStatus.UPCOMING);
    }
}
