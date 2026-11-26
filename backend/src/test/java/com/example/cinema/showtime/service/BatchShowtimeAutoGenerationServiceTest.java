package com.example.cinema.showtime.service;

import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import com.example.cinema.catalog.repository.MovieRepository;
import com.example.cinema.cinema.entity.Cinema;
import com.example.cinema.cinema.entity.CinemaStatus;
import com.example.cinema.cinema.entity.PhysicalSeatStatus;
import com.example.cinema.cinema.entity.Room;
import com.example.cinema.cinema.entity.RoomStatus;
import com.example.cinema.cinema.repository.CinemaRepository;
import com.example.cinema.cinema.repository.RoomRepository;
import com.example.cinema.cinema.repository.SeatRepository;
import com.example.cinema.common.error.AppException;
import com.example.cinema.common.error.ErrorCode;
import com.example.cinema.common.time.DatabaseTime;
import com.example.cinema.showtime.dto.BatchAutoGenerateShowtimesRequest;
import com.example.cinema.showtime.dto.BatchAutoGenerateShowtimesResponse;
import com.example.cinema.showtime.dto.ShowtimeRequest;
import com.example.cinema.showtime.entity.GenerationOutcome;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BatchShowtimeAutoGenerationServiceTest {

    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

    @Mock CinemaRepository cinemaRepository;
    @Mock RoomRepository roomRepository;
    @Mock SeatRepository seatRepository;
    @Mock MovieRepository movieRepository;
    @Mock ShowtimeRepository showtimeRepository;
    @Mock ShowtimeService showtimeService;
    @Mock DatabaseTime databaseTime;

    private BatchShowtimeAutoGenerationService service;

    private static final Cinema CINEMA = Cinema.builder()
            .id(1L).name("CGV Cần Thơ").address("2 Hùng Vương").status(CinemaStatus.ACTIVE).build();
    private static final Cinema OTHER_CINEMA = Cinema.builder()
            .id(2L).name("Lotte Cần Thơ").address("84 Mậu Thân").status(CinemaStatus.ACTIVE).build();
    private static final Room ROOM_1 = Room.builder()
            .id(10L).cinema(CINEMA).name("Phòng 1").status(RoomStatus.ACTIVE).build();
    private static final Room ROOM_2 = Room.builder()
            .id(11L).cinema(CINEMA).name("Phòng 2").status(RoomStatus.ACTIVE).build();
    private static final Room OTHER_ROOM = Room.builder()
            .id(20L).cinema(OTHER_CINEMA).name("Phòng Khác").status(RoomStatus.ACTIVE).build();
    private static final Movie MOVIE_A = Movie.builder()
            .id(100L).title("Phim A").durationMinutes(100).status(MovieStatus.SHOWING)
            .releaseDate(LocalDate.of(2026, 11, 1)).build();
    private static final Movie MOVIE_B = Movie.builder()
            .id(101L).title("Phim B").durationMinutes(110).status(MovieStatus.SHOWING)
            .releaseDate(LocalDate.of(2026, 11, 1)).build();

    @BeforeEach
    void setUp() {
        service = new BatchShowtimeAutoGenerationService(
                cinemaRepository,
                roomRepository,
                seatRepository,
                movieRepository,
                showtimeRepository,
                showtimeService,
                new ShowtimeAllocationPlanner(),
                databaseTime
        );
    }

    private BatchAutoGenerateShowtimesRequest sampleRequest(List<Long> roomIds, List<Long> movieIds, int staggerMinutes) {
        return new BatchAutoGenerateShowtimesRequest(
                1L,
                roomIds,
                movieIds,
                LocalDate.of(2026, 12, 1),
                LocalDate.of(2026, 12, 1),
                List.of(1, 2, 3, 4, 5, 6, 7),
                LocalTime.of(8, 0),
                LocalTime.of(12, 30),
                15,
                15,
                staggerMinutes,
                new BigDecimal("75000.00"),
                new BigDecimal("20000.00")
        );
    }

    @Test
    void previewRotatesMoviesAndStaggersStartTimesAcrossRoomsWithoutWriting() {
        when(databaseTime.now()).thenReturn(LocalDate.of(2026, 11, 26).atStartOfDay(VIETNAM).toInstant());
        when(cinemaRepository.findById(1L)).thenReturn(Optional.of(CINEMA));
        when(roomRepository.findAllById(List.of(10L, 11L))).thenReturn(List.of(ROOM_1, ROOM_2));
        when(movieRepository.findAllById(List.of(100L, 101L))).thenReturn(List.of(MOVIE_A, MOVIE_B));
        when(seatRepository.existsByRoomIdAndStatus(anyLong(), eq(PhysicalSeatStatus.ACTIVE))).thenReturn(true);
        when(showtimeRepository.findScheduledOverlapping(anyLong(), any(), any())).thenReturn(List.of());
        when(showtimeRepository.countScheduledStartsForRoomBetween(anyLong(), any(), any())).thenReturn(0);

        BatchAutoGenerateShowtimesResponse response = service.preview(sampleRequest(List.of(10L, 11L), List.of(100L, 101L), 15));

        assertThat(response.preview()).isTrue();
        assertThat(response.totalCreatedCount()).isZero();
        assertThat(response.totalPlannedCount()).isGreaterThan(0);
        assertThat(response.rooms()).hasSize(2);

        var room1First = response.rooms().get(0).dates().get(0).showtimes().get(0);
        var room2First = response.rooms().get(1).dates().get(0).showtimes().get(0);

        // Room 1 starts with Movie A at 08:00; Room 2 rotates to Movie B at 08:15 (staggered by 15m).
        assertThat(room1First.movieId()).isEqualTo(100L);
        assertThat(room1First.startsAt()).isEqualTo(LocalDate.of(2026, 12, 1).atTime(8, 0).atZone(VIETNAM).toInstant());
        assertThat(room2First.movieId()).isEqualTo(101L);
        assertThat(room2First.startsAt()).isEqualTo(LocalDate.of(2026, 12, 1).atTime(8, 15).atZone(VIETNAM).toInstant());

        verify(showtimeService, never()).createInternalBulk(any(), any(), any());
    }

    @Test
    void generateCreatesShowtimesWithoutSchedulePlanIdAndTracksOverlapSkips() {
        when(databaseTime.now()).thenReturn(LocalDate.of(2026, 11, 26).atStartOfDay(VIETNAM).toInstant());
        when(cinemaRepository.findById(1L)).thenReturn(Optional.of(CINEMA));
        when(roomRepository.findAllById(List.of(10L))).thenReturn(List.of(ROOM_1));
        when(movieRepository.findAllById(List.of(100L))).thenReturn(List.of(MOVIE_A));
        when(seatRepository.existsByRoomIdAndStatus(10L, PhysicalSeatStatus.ACTIVE)).thenReturn(true);
        when(showtimeRepository.findScheduledOverlapping(anyLong(), any(), any())).thenReturn(List.of());
        when(showtimeRepository.countScheduledStartsForRoomBetween(anyLong(), any(), any())).thenReturn(0);

        when(showtimeService.createInternalBulk(any(ShowtimeRequest.class), eq("admin@cinema.com"), isNull()))
                .thenReturn(null)
                .thenThrow(new AppException(ErrorCode.SHOWTIME_OVERLAP, "Trùng lịch"));

        BatchAutoGenerateShowtimesResponse response = service.generate(
                sampleRequest(List.of(10L), List.of(100L), 0), "admin@cinema.com");

        assertThat(response.preview()).isFalse();
        assertThat(response.totalPlannedCount()).isEqualTo(2);
        assertThat(response.totalCreatedCount()).isEqualTo(1);
        assertThat(response.totalSkippedCount()).isEqualTo(1);
        assertThat(response.rooms().get(0).dates().get(0).outcome()).isEqualTo(GenerationOutcome.PARTIAL);

        ArgumentCaptor<ShowtimeRequest> captor = ArgumentCaptor.forClass(ShowtimeRequest.class);
        verify(showtimeService, times(2)).createInternalBulk(captor.capture(), eq("admin@cinema.com"), isNull());
        assertThat(captor.getAllValues().get(0).roomId()).isEqualTo(10L);
        assertThat(captor.getAllValues().get(0).movieId()).isEqualTo(100L);
    }

    @Test
    void rejectsRoomNotBelongingToSelectedCinema() {
        when(databaseTime.now()).thenReturn(Instant.parse("2026-11-26T00:00:00Z"));
        when(cinemaRepository.findById(1L)).thenReturn(Optional.of(CINEMA));
        when(roomRepository.findAllById(List.of(20L))).thenReturn(List.of(OTHER_ROOM));

        assertThatThrownBy(() -> service.preview(sampleRequest(List.of(20L), List.of(100L), 0)))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }
}
