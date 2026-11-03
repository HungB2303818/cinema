package com.example.cinema.booking.job;

import com.example.cinema.booking.service.BookingExpiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.booking.cleanup.enabled", havingValue = "true", matchIfMissing = true)
public class BookingExpiryJob {
    private final BookingExpiryService service;

    @Scheduled(fixedDelayString = "${app.booking.cleanup.delay-ms:30000}",
            initialDelayString = "${app.booking.cleanup.initial-delay-ms:30000}")
    public void cleanup() { service.cleanupBatch(); }
}
