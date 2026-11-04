package com.example.cinema.ticket.controller;

import com.example.cinema.ticket.dto.*;
import com.example.cinema.ticket.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class TicketController {
    private final TicketService service;

    @GetMapping("/api/bookings/{id}/tickets")
    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN')")
    public List<TicketResponse> tickets(@PathVariable Long id) { return service.tickets(id); }

    @PostMapping("/api/staff/tickets/check-in")
    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public CheckinResponse checkin(@Valid @RequestBody CheckinRequest request) { return service.checkin(request); }
}
