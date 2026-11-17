package com.example.cinema.catalog.job;

import com.example.cinema.catalog.service.MovieService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MovieStatusTransitionJobTest {

    @Mock
    private MovieService movieService;

    private Clock fixedClock;
    private MovieStatusTransitionJob job;

    @BeforeEach
    void setUp() {
        // 2026-11-16 18:00:00 UTC -> 2026-11-17 01:00:00 UTC+7 (Vietnam Time)
        Instant instant = Instant.parse("2026-11-16T18:00:00Z");
        fixedClock = Clock.fixed(instant, ZoneOffset.UTC);
        job = new MovieStatusTransitionJob(movieService, fixedClock);
    }

    @Test
    void transitionUpcomingMovies_triggersServiceWithVietnamDate() {
        LocalDate expectedVietnamDate = LocalDate.of(2026, 11, 17);
        when(movieService.transitionUpcomingToShowing(expectedVietnamDate)).thenReturn(5);

        int result = job.transitionUpcomingMovies();

        assertThat(result).isEqualTo(5);
        verify(movieService).transitionUpcomingToShowing(expectedVietnamDate);
    }

    @Test
    void onApplicationReady_triggersServiceWithVietnamDate() {
        LocalDate expectedVietnamDate = LocalDate.of(2026, 11, 17);
        when(movieService.transitionUpcomingToShowing(expectedVietnamDate)).thenReturn(2);

        job.onApplicationReady();

        verify(movieService).transitionUpcomingToShowing(expectedVietnamDate);
    }

    @Test
    void onApplicationReady_handlesExceptionGracefully() {
        when(movieService.transitionUpcomingToShowing(any())).thenThrow(new RuntimeException("DB Connection Timeout"));

        assertThatCode(() -> job.onApplicationReady()).doesNotThrowAnyException();
        verify(movieService).transitionUpcomingToShowing(any());
    }
}
