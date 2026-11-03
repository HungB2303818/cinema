package com.example.cinema.cinema.service;

import com.example.cinema.cinema.dto.*;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.*;
import com.example.cinema.common.error.*;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CinemaServiceTest {
    @Mock CinemaRepository cinemas;
    @Mock RoomRepository rooms;
    @Mock SeatRepository seats;
    @Mock ShowtimeRepository showtimes;
    @InjectMocks CinemaService service;
    Cinema cinema;
    Room room;

    @BeforeEach
    void setup() {
        cinema = Cinema.builder().id(1L).name("Rạp").address("Địa chỉ").build();
        room = Room.builder().id(2L).cinema(cinema).name("Phòng 1").build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("admin", null, List.of()));
    }

    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void createsRoomWithTrimmedName() {
        when(cinemas.findById(1L)).thenReturn(Optional.of(cinema));
        when(rooms.saveAndFlush(any())).thenAnswer(call -> { Room r = call.getArgument(0); r.setId(3L); return r; });
        assertThat(service.createRoom(new RoomRequest(1L, " Phòng mới ", RoomStatus.ACTIVE)).name()).isEqualTo("Phòng mới");
    }

    @Test void rejectsDuplicateRoomName() {
        when(cinemas.findById(1L)).thenReturn(Optional.of(cinema));
        when(rooms.findByCinemaIdAndName(1L, "Phòng 1")).thenReturn(Optional.of(room));
        assertCode(() -> service.createRoom(new RoomRequest(1L, "Phòng 1", RoomStatus.ACTIVE)), ErrorCode.DUPLICATE_RESOURCE);
        verify(rooms, never()).saveAndFlush(any());
    }

    @Test void createsWholeSeatBatchAndNormalizesRows() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        when(seats.saveAllAndFlush(anyList())).thenAnswer(call -> call.getArgument(0));
        var result = service.createSeats(2L, new SeatBatchRequest(List.of(seat("a", 1), seat("b", 2))));
        assertThat(result).extracting(SeatResponse::label).containsExactly("A1", "B2");
        InOrder order = inOrder(rooms, showtimes, seats);
        order.verify(rooms).findByIdForUpdate(2L);
        order.verify(showtimes).existsByRoomId(2L);
    }

    @Test void rejectsDuplicateBatchBeforeSavingAnySeat() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        assertCode(() -> service.createSeats(2L, new SeatBatchRequest(List.of(seat("a", 1), seat("A", 1)))), ErrorCode.DUPLICATE_RESOURCE);
        verify(seats, never()).saveAllAndFlush(anyList());
    }

    @Test void rejectsPositionAlreadyInDatabase() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        when(seats.findByRoomIdAndSeatRowAndSeatNumber(2L, "A", 1)).thenReturn(Optional.of(Seat.builder().id(9L).build()));
        assertCode(() -> service.createSeats(2L, new SeatBatchRequest(List.of(seat("A", 1)))), ErrorCode.DUPLICATE_RESOURCE);
    }

    @Test void cannotChangeSeatsOrRoomAfterAnyShowtimeExists() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        when(showtimes.existsByRoomId(2L)).thenReturn(true);
        assertCode(() -> service.createSeats(2L, new SeatBatchRequest(List.of(seat("A", 1)))), ErrorCode.RESOURCE_STATE_CONFLICT);
        assertCode(() -> service.updateSeat(2L, 9L, seat("A", 1)), ErrorCode.RESOURCE_STATE_CONFLICT);
        assertCode(() -> service.updateRoom(2L, new RoomRequest(1L, "Khác", RoomStatus.MAINTENANCE)), ErrorCode.RESOURCE_STATE_CONFLICT);
        verifyNoInteractions(seats);
    }

    @Test void canSetPhysicalSeatMaintenanceBeforeScheduling() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        Seat seat = Seat.builder().id(9L).room(room).seatRow("A").seatNumber(1).build();
        when(seats.findByIdAndRoomId(9L, 2L)).thenReturn(Optional.of(seat));
        var response = service.updateSeat(2L, 9L, new SeatRequest("a", 1, SeatType.VIP, PhysicalSeatStatus.MAINTENANCE));
        assertThat(response.status()).isEqualTo(PhysicalSeatStatus.MAINTENANCE);
        assertThat(response.seatType()).isEqualTo(SeatType.VIP);
    }

    @Test void cannotEditSeatOfAnotherRoom() {
        when(rooms.findByIdForUpdate(2L)).thenReturn(Optional.of(room));
        assertCode(() -> service.updateSeat(2L, 9L, seat("A", 1)), ErrorCode.RESOURCE_NOT_FOUND);
    }

    private SeatRequest seat(String row, int number) { return new SeatRequest(row, number, SeatType.STANDARD, PhysicalSeatStatus.ACTIVE); }
    private void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, ErrorCode code) {
        assertThatThrownBy(action).isInstanceOfSatisfying(AppException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(code));
    }
}
