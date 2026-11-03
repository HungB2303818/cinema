package com.example.cinema.booking.service;

import com.example.cinema.common.error.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.stereotype.Component;
import java.util.function.Supplier;

@Slf4j
@Component
public class BookingRetry {
    public <T> T execute(Supplier<T> operation) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            try { return operation.get(); }
            catch (ConcurrencyFailureException ex) {
                log.warn("booking.lock-conflict attempt={} outcome={}", attempt, attempt == 3 ? "EXHAUSTED" : "RETRY");
                if (attempt == 3) throw new AppException(ErrorCode.BOOKING_CONCURRENT_CONFLICT);
                try { Thread.sleep(20L * attempt); }
                catch (InterruptedException interrupted) {
                    Thread.currentThread().interrupt();
                    throw new AppException(ErrorCode.BOOKING_CONCURRENT_CONFLICT);
                }
            }
        }
        throw new IllegalStateException("Không thể đạt nhánh này.");
    }
}
