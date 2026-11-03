package com.example.cinema.booking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingExpiryService {
    private final BookingQueries queries;
    private final BookingTransactions transactions;
    private final BookingRetry retry;

    public boolean expire(Long id) {
        boolean expired = retry.execute(() -> transactions.expire(id));
        if (expired) log.info("booking.expire actor=SYSTEM bookingId={} outcome=EXPIRED", id);
        return expired;
    }

    public int cleanupBatch() {
        int expired = 0;
        for (Long id : queries.expiredIds()) {
            try { if (expire(id)) expired++; }
            catch (RuntimeException ex) {
                // Continue the batch; do not log SQL, payloads, request keys or credentials.
                log.warn("booking.cleanup bookingId={} outcome=FAILED errorType={}", id, ex.getClass().getSimpleName());
            }
        }
        return expired;
    }
}
