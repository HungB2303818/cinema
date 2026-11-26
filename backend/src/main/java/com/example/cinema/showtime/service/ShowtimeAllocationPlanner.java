package com.example.cinema.showtime.service;

import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Pure allocation logic. No database, no clock, no Spring dependencies at runtime.
 * The caller supplies the time window, not-before instant, movie priorities and busy intervals.
 */
@Component
public class ShowtimeAllocationPlanner {

    public record AllocationMovie(Long movieId, int durationMinutes) {
    }

    public record AllocationInterval(Instant start, Instant end) {
    }

    public record AllocationInput(Instant windowStart, Instant windowEnd, int slotStepMinutes,
                                  int cleanupMinutes, Instant notBefore, int maxShowtimes,
                                  List<AllocationMovie> movies,
                                  List<AllocationInterval> occupied) {
    }

    public record PlannedShowtime(Long movieId, Instant startsAt, Instant endsAt) {
    }

    public List<PlannedShowtime> plan(AllocationInput input) {
        if (input == null || input.movies() == null || input.movies().isEmpty()
                || input.maxShowtimes() <= 0 || input.slotStepMinutes() <= 0
                || input.windowStart() == null || input.windowEnd() == null
                || !input.windowStart().isBefore(input.windowEnd())) {
            return List.of();
        }

        Instant anchor = input.windowStart();
        Duration step = Duration.ofMinutes(input.slotStepMinutes());
        Instant cursor = alignUp(laterOf(anchor, input.notBefore()), anchor, step);

        List<AllocationInterval> occupied = new ArrayList<>();
        if (input.occupied() != null) {
            occupied.addAll(input.occupied());
        }
        occupied.sort(Comparator.comparing(AllocationInterval::start));

        List<PlannedShowtime> planned = new ArrayList<>();
        int movieIndex = 0;
        int created = 0;

        while (created < input.maxShowtimes() && cursor.isBefore(input.windowEnd())) {
            AllocationInterval covering = coveringInterval(occupied, cursor);
            if (covering != null) {
                cursor = alignUp(covering.end(), anchor, step);
                continue;
            }

            int chosenIndex = -1;
            Instant chosenEnd = null;
            Instant chosenOccupiedUntil = null;
            for (int offset = 0; offset < input.movies().size(); offset++) {
                int index = (movieIndex + offset) % input.movies().size();
                AllocationMovie movie = input.movies().get(index);
                if (movie.durationMinutes() <= 0) {
                    continue;
                }
                Instant endsAt = cursor.plus(Duration.ofMinutes(movie.durationMinutes()));
                Instant occupiedUntil = endsAt.plus(Duration.ofMinutes(input.cleanupMinutes()));
                if (occupiedUntil.isAfter(input.windowEnd())) {
                    continue;
                }
                if (!overlaps(occupied, cursor, occupiedUntil)) {
                    chosenIndex = index;
                    chosenEnd = endsAt;
                    chosenOccupiedUntil = occupiedUntil;
                    break;
                }
            }

            if (chosenIndex < 0) {
                cursor = cursor.plus(step);
                continue;
            }

            AllocationMovie movie = input.movies().get(chosenIndex);
            planned.add(new PlannedShowtime(movie.movieId(), cursor, chosenEnd));
            occupied.add(new AllocationInterval(cursor, chosenOccupiedUntil));
            occupied.sort(Comparator.comparing(AllocationInterval::start));
            created++;
            movieIndex = (chosenIndex + 1) % input.movies().size();
            cursor = alignUp(chosenOccupiedUntil, anchor, step);
        }

        return planned;
    }

    private static Instant laterOf(Instant anchor, Instant notBefore) {
        return notBefore != null && notBefore.isAfter(anchor) ? notBefore : anchor;
    }

    private static AllocationInterval coveringInterval(List<AllocationInterval> occupied, Instant cursor) {
        for (AllocationInterval interval : occupied) {
            if (!cursor.isBefore(interval.start()) && cursor.isBefore(interval.end())) {
                return interval;
            }
        }
        return null;
    }

    private static boolean overlaps(List<AllocationInterval> occupied, Instant start, Instant end) {
        for (AllocationInterval interval : occupied) {
            if (start.isBefore(interval.end()) && interval.start().isBefore(end)) {
                return true;
            }
        }
        return false;
    }

    private static Instant alignUp(Instant value, Instant anchor, Duration step) {
        if (!value.isAfter(anchor)) {
            return anchor;
        }
        long millis = Duration.between(anchor, value).toMillis();
        long stepMillis = step.toMillis();
        long steps = Math.max(1, (millis + stepMillis - 1) / stepMillis);
        return anchor.plusMillis(steps * stepMillis);
    }
}
