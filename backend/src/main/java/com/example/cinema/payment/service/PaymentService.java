package com.example.cinema.payment.service;

import com.example.cinema.booking.service.BookingRetry;
import com.example.cinema.common.util.*;
import com.example.cinema.payment.dto.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

@Slf4j
@Service
@Validated
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentTransactions transactions;
    private final PaymentQueries queries;
    private final BookingRetry retry;

    @PreAuthorize("hasRole('CUSTOMER')")
    public PaymentResponse pay(Long id, @NotNull(message = "Yêu cầu thanh toán không được null.") @Valid MockPaymentRequest request) {
        Requests.positiveId(id);
        long actorId = CurrentActor.require().getId();
        var result = retry.execute(() -> {
            try { return transactions.pay(actorId, id, request); }
            catch (DataIntegrityViolationException conflict) {
                // A global-key contender can belong to a different booking. Never query a failed transaction.
                return queries.replay(actorId, id, request).orElseThrow(() -> conflict);
            }
        });
        log.info("payment.mock correlationId={} actorId={} bookingId={} outcome={}",
                MDC.get("correlationId"), actorId, id, result.paymentStatus());
        return result;
    }
}
