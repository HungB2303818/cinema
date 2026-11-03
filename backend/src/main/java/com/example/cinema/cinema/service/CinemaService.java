package com.example.cinema.cinema.service;

import com.example.cinema.cinema.dto.*;
import com.example.cinema.cinema.entity.*;
import com.example.cinema.cinema.repository.*;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.error.*;
import com.example.cinema.common.util.Requests;
import com.example.cinema.showtime.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Transactional(readOnly = true)
public class CinemaService {
    private final CinemaRepository cinemaRepository;
    private final RoomRepository roomRepository;
    private final SeatRepository seatRepository;
    private final ShowtimeRepository showtimeRepository;

    public PageResponse<CinemaResponse> cinemas(int page, int size, String sort) {
        return PageResponse.from(cinemaRepository.findAll(Requests.page(page, size, sort, Set.of("id", "name")))
                .map(CinemaResponse::from));
    }

    public PageResponse<RoomResponse> rooms(Long cinemaId, int page, int size, String sort) {
        cinema(cinemaId);
        return PageResponse.from(roomRepository.findByCinemaId(cinemaId,
                Requests.page(page, size, sort, Set.of("id", "name", "status"))).map(RoomResponse::from));
    }

    public List<SeatResponse> seats(Long roomId) {
        Requests.positiveId(roomId);
        roomRepository.findById(roomId).orElseThrow(this::notFound);
        return seatRepository.findByRoomIdOrderBySeatRowAscSeatNumberAsc(roomId).stream().map(SeatResponse::from).toList();
    }

    @Transactional
    public RoomResponse createRoom(RoomRequest request) {
        Cinema cinema = cinema(request.cinemaId());
        String name = request.name().strip();
        checkRoomName(request.cinemaId(), name, null);
        Room saved = roomRepository.saveAndFlush(Room.builder().cinema(cinema).name(name).status(request.status()).build());
        audit("room.create", saved.getId());
        return RoomResponse.from(saved);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RoomResponse updateRoom(Long id, RoomRequest request) {
        Room room = lockRoom(id);
        ensureNoShowtimes(id);
        if (!room.getCinema().getId().equals(request.cinemaId())) {
            throw new AppException(ErrorCode.RESOURCE_STATE_CONFLICT, "Không chuyển phòng sang rạp khác trong MVP.");
        }
        String name = request.name().strip();
        checkRoomName(request.cinemaId(), name, id);
        room.setName(name);
        room.setStatus(request.status());
        roomRepository.flush();
        audit("room.update", id);
        return RoomResponse.from(room);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public List<SeatResponse> createSeats(Long roomId, SeatBatchRequest request) {
        Room room = lockRoom(roomId);
        ensureNoShowtimes(roomId);
        Set<String> positions = new HashSet<>();
        List<Seat> seats = new ArrayList<>();
        for (SeatRequest item : request.seats()) {
            String row = item.seatRow().toUpperCase(Locale.ROOT);
            if (!positions.add(row + ":" + item.seatNumber()) || seatRepository
                    .findByRoomIdAndSeatRowAndSeatNumber(roomId, row, item.seatNumber()).isPresent()) {
                throw new AppException(ErrorCode.DUPLICATE_RESOURCE, "Vị trí ghế bị trùng trong phòng hoặc trong yêu cầu.");
            }
            seats.add(Seat.builder().room(room).seatRow(row).seatNumber(item.seatNumber())
                    .seatType(item.seatType()).status(item.status()).build());
        }
        List<Seat> saved = seatRepository.saveAllAndFlush(seats);
        audit("seats.create", roomId);
        return saved.stream().map(SeatResponse::from).toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SeatResponse updateSeat(Long roomId, Long seatId, SeatRequest request) {
        lockRoom(roomId);
        ensureNoShowtimes(roomId);
        Requests.positiveId(seatId);
        Seat seat = seatRepository.findByIdAndRoomId(seatId, roomId).orElseThrow(this::notFound);
        String row = request.seatRow().toUpperCase(Locale.ROOT);
        seatRepository.findByRoomIdAndSeatRowAndSeatNumber(roomId, row, request.seatNumber())
                .filter(existing -> !existing.getId().equals(seatId))
                .ifPresent(existing -> { throw new AppException(ErrorCode.DUPLICATE_RESOURCE); });
        seat.setSeatRow(row);
        seat.setSeatNumber(request.seatNumber());
        seat.setSeatType(request.seatType());
        seat.setStatus(request.status());
        seatRepository.flush();
        audit("seat.update", seatId);
        return SeatResponse.from(seat);
    }

    private Cinema cinema(Long id) {
        Requests.positiveId(id);
        return cinemaRepository.findById(id).orElseThrow(this::notFound);
    }

    private Room lockRoom(Long id) {
        Requests.positiveId(id);
        return roomRepository.findByIdForUpdate(id).orElseThrow(this::notFound);
    }

    private void ensureNoShowtimes(Long roomId) {
        if (showtimeRepository.existsByRoomId(roomId)) {
            throw new AppException(ErrorCode.RESOURCE_STATE_CONFLICT,
                    "Phòng đã có suất chiếu; không thay đổi cấu hình phòng/ghế trong MVP.");
        }
    }

    private void checkRoomName(Long cinemaId, String name, Long excludedId) {
        roomRepository.findByCinemaIdAndName(cinemaId, name)
                .filter(existing -> !existing.getId().equals(excludedId))
                .ifPresent(existing -> { throw new AppException(ErrorCode.DUPLICATE_RESOURCE); });
    }

    private AppException notFound() {
        return new AppException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy rạp, phòng hoặc ghế.");
    }

    private void audit(String action, Long resourceId) {
        log.info("{} actor={} resourceId={} outcome=SUCCESS", action,
                SecurityContextHolder.getContext().getAuthentication().getName(), resourceId);
    }
}
