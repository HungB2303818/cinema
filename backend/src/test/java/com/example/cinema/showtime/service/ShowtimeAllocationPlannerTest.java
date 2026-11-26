package com.example.cinema.showtime.service;

import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationInput;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationInterval;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.AllocationMovie;
import com.example.cinema.showtime.service.ShowtimeAllocationPlanner.PlannedShowtime;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ShowtimeAllocationPlannerTest {

    private static final Instant START = Instant.parse("2026-12-01T09:00:00Z");
    private static final Instant END = Instant.parse("2026-12-01T13:00:00Z");
    private final ShowtimeAllocationPlanner planner = new ShowtimeAllocationPlanner();

    private static AllocationMovie movie(long id, int duration) {
        return new AllocationMovie(id, duration);
    }

    private static AllocationInput input(Instant start, Instant end, int step, int cleanup,
                                         Instant notBefore, int max, List<AllocationMovie> movies,
                                         List<AllocationInterval> occupied) {
        return new AllocationInput(start, end, step, cleanup, notBefore, max, movies, occupied);
    }

    @Test
    void plansMoviesInPriorityOrderAndRotates() {
        var result = planner.plan(input(START, END, 15, 0, START, 10,
                List.of(movie(1, 60), movie(2, 60), movie(3, 60)), List.of()));

        assertThat(result).extracting(PlannedShowtime::movieId).containsExactly(1L, 2L, 3L, 1L);
        assertThat(result).extracting(PlannedShowtime::startsAt)
                .containsExactly(Instant.parse("2026-12-01T09:00:00Z"),
                        Instant.parse("2026-12-01T10:00:00Z"),
                        Instant.parse("2026-12-01T11:00:00Z"),
                        Instant.parse("2026-12-01T12:00:00Z"));
    }

    @Test
    void respectsDurationAndCleanup() {
        var result = planner.plan(input(START, Instant.parse("2026-12-01T12:00:00Z"),
                15, 15, START, 10, List.of(movie(1, 60)), List.of()));

        assertThat(result).extracting(PlannedShowtime::startsAt)
                .containsExactly(Instant.parse("2026-12-01T09:00:00Z"),
                        Instant.parse("2026-12-01T10:15:00Z"));
        assertThat(result).extracting(PlannedShowtime::endsAt)
                .containsExactly(Instant.parse("2026-12-01T10:00:00Z"),
                        Instant.parse("2026-12-01T11:15:00Z"));
    }

    @Test
    void skipsOccupiedInterval() {
        var occupied = List.of(new AllocationInterval(Instant.parse("2026-12-01T09:30:00Z"),
                Instant.parse("2026-12-01T10:45:00Z")));

        var result = planner.plan(input(START, Instant.parse("2026-12-01T12:00:00Z"),
                15, 0, START, 10, List.of(movie(1, 60)), occupied));

        assertThat(result).extracting(PlannedShowtime::startsAt)
                .containsExactly(Instant.parse("2026-12-01T10:45:00Z"));
    }

    @Test
    void startsAtAlignedNotBefore() {
        var result = planner.plan(input(START, Instant.parse("2026-12-01T12:00:00Z"),
                15, 0, Instant.parse("2026-12-01T10:07:00Z"), 10,
                List.of(movie(1, 60)), List.of()));

        assertThat(result).extracting(PlannedShowtime::startsAt)
                .containsExactly(Instant.parse("2026-12-01T10:15:00Z"));
    }

    @Test
    void doesNotCrossWindowEnd() {
        var result = planner.plan(input(START, Instant.parse("2026-12-01T10:30:00Z"),
                15, 0, START, 10, List.of(movie(1, 120)), List.of()));

        assertThat(result).isEmpty();
    }

    @Test
    void picksShorterMovieWhenLongerDoesNotFit() {
        var result = planner.plan(input(START, Instant.parse("2026-12-01T10:30:00Z"),
                15, 0, START, 10, List.of(movie(1, 120), movie(2, 60)), List.of()));

        assertThat(result).hasSize(1);
        assertThat(result.get(0).movieId()).isEqualTo(2L);
    }

    @Test
    void respectsMaxShowtimes() {
        var result = planner.plan(input(START, Instant.parse("2026-12-01T18:00:00Z"),
                15, 0, START, 3, List.of(movie(1, 30)), List.of()));

        assertThat(result).hasSize(3);
        assertThat(result).extracting(PlannedShowtime::startsAt)
                .containsExactly(Instant.parse("2026-12-01T09:00:00Z"),
                        Instant.parse("2026-12-01T09:30:00Z"),
                        Instant.parse("2026-12-01T10:00:00Z"));
    }

    @Test
    void repeatedRunOverSameOccupiedIntervalsCreatesNothing() {
        var windowEnd = Instant.parse("2026-12-01T10:30:00Z");
        var first = planner.plan(input(START, windowEnd, 15, 15, START, 10,
                List.of(movie(1, 30)), List.of()));
        assertThat(first).hasSize(2);

        var occupied = first.stream()
                .map(item -> new AllocationInterval(item.startsAt(),
                        item.endsAt().plusSeconds(15 * 60)))
                .toList();
        var second = planner.plan(input(START, windowEnd, 15, 15, START, 10,
                List.of(movie(1, 30)), occupied));

        assertThat(second).isEmpty();
    }

    @Test
    void allowsOccupiedEndExactlyAtWindowEnd() {
        var result = planner.plan(input(START, Instant.parse("2026-12-01T10:00:00Z"),
                15, 0, START, 10, List.of(movie(1, 60)), List.of()));

        assertThat(result).hasSize(1);
    }

    @Test
    void returnsEmptyForInvalidInputs() {
        assertThat(planner.plan(input(START, END, 15, 0, START, 10, List.of(), List.of()))).isEmpty();
        assertThat(planner.plan(input(END, START, 15, 0, START, 10,
                List.of(movie(1, 60)), List.of()))).isEmpty();
        assertThat(planner.plan(input(START, END, 15, 0, END, 10,
                List.of(movie(1, 60)), List.of()))).isEmpty();
        assertThat(planner.plan(input(START, END, 15, 0, START, 0,
                List.of(movie(1, 60)), List.of()))).isEmpty();
    }
}
