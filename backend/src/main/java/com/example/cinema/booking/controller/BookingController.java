package com.example.cinema.booking.controller;

import com.example.cinema.booking.dto.*;
import com.example.cinema.booking.service.BookingService;
import com.example.cinema.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.net.URI;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
@Tag(name = "Bookings", description = "Giữ ghế, hủy đơn và tra cứu lịch sử đặt vé")
public class BookingController {
    private final BookingService service;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<BookingResponse> create(@Valid @RequestBody BookingCreateRequest request) {
        BookingCreationResult result = service.createBooking(request);
        if (result.created()) {
            return ResponseEntity.created(URI.create("/api/bookings/" + result.booking().bookingId())).body(result.booking());
        }
        return ResponseEntity.ok(result.booking());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('CUSTOMER')")
    public BookingCancelResponse cancel(@PathVariable Long id) { return service.cancel(id); }

    @GetMapping("/me")
    @PreAuthorize("hasRole('CUSTOMER')")
    public PageResponse<BookingSummaryResponse> history(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(defaultValue = "createdAt,desc") String sort) {
        return service.history(page, size, sort);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN')")
    public BookingDetailResponse detail(@PathVariable Long id) { return service.detail(id); }
}
