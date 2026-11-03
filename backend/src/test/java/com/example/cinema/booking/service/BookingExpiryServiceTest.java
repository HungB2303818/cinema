package com.example.cinema.booking.service;

import com.example.cinema.booking.job.BookingExpiryJob;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BookingExpiryServiceTest {
    @Test void failedItemDoesNotPreventOtherBookingsFromExpiring() {
        BookingQueries queries = mock(BookingQueries.class);
        BookingTransactions transactions = mock(BookingTransactions.class);
        when(queries.expiredIds()).thenReturn(List.of(1L, 2L, 3L));
        when(transactions.expire(1L)).thenThrow(new IllegalStateException("fixture"));
        when(transactions.expire(2L)).thenReturn(true);
        when(transactions.expire(3L)).thenReturn(false);
        var service = new BookingExpiryService(queries, transactions, new BookingRetry());
        assertThat(service.cleanupBatch()).isEqualTo(1);
        verify(transactions).expire(3L);
    }

    @Test void jobDelegatesToBoundedBatchService() {
        BookingExpiryService service = mock(BookingExpiryService.class);
        new BookingExpiryJob(service).cleanup();
        verify(service).cleanupBatch();
    }
}
