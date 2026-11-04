package com.example.cinema.catalog.controller;

import com.example.cinema.auth.security.*;
import com.example.cinema.catalog.dto.MovieResponse;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.service.MoviePosterService;
import com.example.cinema.common.config.SecurityConfig;
import com.example.cinema.common.error.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminMoviePosterController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, DelegatedAuthenticationEntryPoint.class, DelegatedAccessDeniedHandler.class})
class MoviePosterControllerTest {
    @Autowired MockMvc mvc;
    @MockBean MoviePosterService service;
    @MockBean JwtUtils jwtUtils;
    @MockBean UserDetailsService userDetailsService;

    @Test void guestCannotUpload() throws Exception { denied(401); }
    @Test @WithMockUser(roles = "CUSTOMER") void customerCannotUpload() throws Exception { denied(403); }
    @Test @WithMockUser(roles = "STAFF") void staffCannotUpload() throws Exception { denied(403); }

    private void denied(int status) throws Exception {
        mvc.perform(multipart("/api/admin/movies/1/poster").file(new MockMultipartFile("file", new byte[]{1})))
                .andExpect(status().is(status));
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "ADMIN") void adminReceivesMovieWithPosterUrl() throws Exception {
        String url = "https://res.cloudinary.com/demo/image/upload/poster.png";
        when(service.upload(eq(1L), any())).thenReturn(new MovieResponse(1L, "Phim", null, 120, null, null, null, url, MovieStatus.SHOWING));
        mvc.perform(multipart("/api/admin/movies/1/poster").file(new MockMultipartFile("file", new byte[]{1})))
                .andExpect(status().isOk()).andExpect(jsonPath("$.posterUrl").value(url));
    }

    @Test @WithMockUser(roles = "ADMIN") void missingFilePartIs400() throws Exception {
        mvc.perform(multipart("/api/admin/movies/1/poster"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        verifyNoInteractions(service);
    }

    @Test @WithMockUser(roles = "ADMIN") void multipartSizeErrorsAre413() throws Exception {
        when(service.upload(eq(1L), any())).thenThrow(new org.springframework.web.multipart.MaxUploadSizeExceededException(5 * 1024 * 1024));
        mvc.perform(multipart("/api/admin/movies/1/poster").file(new MockMultipartFile("file", new byte[]{1})))
                .andExpect(status().isPayloadTooLarge()).andExpect(jsonPath("$.code").value("FILE_TOO_LARGE"));
    }

    @Test @WithMockUser(roles = "ADMIN") void disabledCloudinaryReturns503() throws Exception {
        when(service.upload(eq(1L), any())).thenThrow(new AppException(ErrorCode.MEDIA_STORAGE_UNAVAILABLE));
        mvc.perform(multipart("/api/admin/movies/1/poster").file(new MockMultipartFile("file", new byte[]{1})))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("MEDIA_STORAGE_UNAVAILABLE"));
    }

    @Test @WithMockUser(roles = "ADMIN") void wrongOuterContentTypeIs415InsteadOf500() throws Exception {
        mvc.perform(post("/api/admin/movies/1/poster").contentType(org.springframework.http.MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnsupportedMediaType()).andExpect(jsonPath("$.code").value("UNSUPPORTED_MEDIA_TYPE"));
        verifyNoInteractions(service);
    }
}
