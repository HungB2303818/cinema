package com.example.cinema.booking.service;

import com.example.cinema.auth.entity.*;
import com.example.cinema.auth.security.UserPrincipal;
import com.example.cinema.booking.dto.*;
import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.common.error.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {
    @Mock BookingTransactions transactions;
    @Mock BookingQueries queries;
    BookingService service;
    final BookingCreateRequest request = new BookingCreateRequest(2L, List.of(3L), "intent-1");

    @BeforeEach void setup() {
        service = new BookingService(transactions, queries, new BookingRetry());
        var principal = UserPrincipal.create(User.builder().id(7L).email("customer@example.test")
                .role(UserRole.CUSTOMER).status(UserStatus.ACTIVE).build());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    @Test void usesAuthenticatedUserAndReturnsCommittedResult() {
        when(transactions.create(7L, request)).thenReturn(result(true));
        assertThat(service.createBooking(request).created()).isTrue();
        verify(transactions).create(7L, request);
    }

    @Test void uniqueConflictReplaysFromFreshQueryWorker() {
        when(transactions.create(7L, request)).thenThrow(new DataIntegrityViolationException("duplicate"));
        when(queries.replay(7L, request)).thenReturn(Optional.of(result(false)));
        assertThat(service.createBooking(request).created()).isFalse();
        InOrder order = inOrder(transactions, queries);
        order.verify(transactions).create(7L, request);
        order.verify(queries).replay(7L, request);
    }

    @Test void unrelatedIntegrityConflictIsNotMistakenForIdempotency() {
        when(transactions.create(7L, request)).thenThrow(new DataIntegrityViolationException("fixture"));
        when(queries.replay(7L, request)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.createBooking(request)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void retriesDeadlockUsingSameUserKeyAndPayload() {
        when(transactions.create(7L, request)).thenThrow(new CannotAcquireLockException("deadlock")).thenReturn(result(false));
        assertThat(service.createBooking(request).created()).isFalse();
        verify(transactions, times(2)).create(7L, request);
    }

    @Test void boundedRetryStopsAfterThreeTransactions() {
        when(transactions.create(7L, request)).thenThrow(new CannotAcquireLockException("deadlock"));
        assertThatThrownBy(() -> service.createBooking(request)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.BOOKING_CONCURRENT_CONFLICT));
        verify(transactions, times(3)).create(7L, request);
    }

    @Test void doesNotRetryBusinessSeatConflict() {
        when(transactions.create(7L, request)).thenThrow(new AppException(ErrorCode.SEAT_UNAVAILABLE));
        assertThatThrownBy(() -> service.createBooking(request)).isInstanceOf(AppException.class);
        verify(transactions).create(7L, request);
    }

    @Test void cutoffBoundaryIsStrict() {
        Instant start = Instant.parse("2026-11-10T12:00:00Z");
        assertThatCode(() -> BookingRules.requireBeforeCutoff(start, start.minusSeconds(600).minusMillis(1))).doesNotThrowAnyException();
        assertThatThrownBy(() -> BookingRules.requireBeforeCutoff(start, start.minusSeconds(600))).isInstanceOf(AppException.class);
        assertThatThrownBy(() -> BookingRules.requireBeforeCutoff(start, start.minusSeconds(599))).isInstanceOf(AppException.class);
    }

    @Test void rejectsMissingTypedOrDisabledPrincipal() {
        SecurityContextHolder.clearContext();
        assertThatThrownBy(() -> service.createBooking(request)).isInstanceOf(AppException.class);
        var disabled = UserPrincipal.create(User.builder().id(7L).email("disabled@example.test")
                .role(UserRole.CUSTOMER).status(UserStatus.INACTIVE).build());
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(disabled, null, disabled.getAuthorities()));
        assertThatThrownBy(() -> service.createBooking(request)).isInstanceOfSatisfying(AppException.class,
                ex -> assertThat(ex.getErrorCode()).isEqualTo(ErrorCode.UNAUTHENTICATED));
        verifyNoInteractions(transactions);
    }

    private BookingCreationResult result(boolean created) {
        return new BookingCreationResult(new BookingResponse(10L, "booking", 2L, BookingStatus.PENDING,
                List.of(3L), BigDecimal.TEN, Instant.parse("2026-11-10T11:35:00Z")), created);
    }
}
