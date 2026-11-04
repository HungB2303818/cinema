package com.example.cinema.payment.controller;

import com.example.cinema.payment.dto.*;
import com.example.cinema.payment.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings/{id}/payments/mock")
@RequiredArgsConstructor
public class PaymentController {
    private final PaymentService service;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentResponse pay(@PathVariable Long id, @Valid @RequestBody MockPaymentRequest request) {
        return service.pay(id, request);
    }
}
