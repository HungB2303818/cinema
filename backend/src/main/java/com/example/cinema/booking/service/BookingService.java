package com.example.cinema.booking.service;

import com.example.cinema.auth.entity.UserRole;
import com.example.cinema.auth.security.UserPrincipal;
import com.example.cinema.booking.dto.*;
import com.example.cinema.common.dto.PageResponse;
import com.example.cinema.common.error.*;
import com.example.cinema.common.util.Requests;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

/** No enclosing transaction: exceptions are caught only AFTER the worker's transaction rolled back. */
@Slf4j
@Service
@Validated
@RequiredArgsConstructor
public class BookingService {
    private final BookingTransactions transactions;
    private final BookingQueries queries;
    private final BookingRetry retry;

    @PreAuthorize("hasRole('CUSTOMER')")
    public BookingCreationResult createBooking(@NotNull(message = "Yêu cầu đặt vé không được null.") @Valid BookingCreateRequest request) {
        long userId = actor().getId();
        BookingCreationResult result = retry.execute(() -> {
            try { return transactions.create(userId, request); }
            catch (DataIntegrityViolationException conflict) {
                // Unique key contender waited for the winning commit. Query using a fresh transaction/context.
                return queries.replay(userId, request).orElseThrow(() -> conflict);
            }
        });
        audit("booking.create", userId, result.booking().bookingId(), result.created() ? "CREATED" : "REPLAY");
        return result;
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    public BookingCancelResponse cancel(Long id) {
        Requests.positiveId(id);
        long userId = actor().getId();
        BookingCancelResponse result = retry.execute(() -> transactions.cancel(userId, id));
        audit("booking.cancel", userId, id, "SUCCESS");
        return result;
    }

    @PreAuthorize("hasRole('CUSTOMER')")
    public PageResponse<BookingSummaryResponse> history(int page, int size, String sort) {
        return queries.history(actor().getId(), page, size, sort);
    }

    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN')")
    public BookingDetailResponse detail(Long id) {
        Requests.positiveId(id);
        UserPrincipal principal = actor();
        boolean admin = principal.getRole() == UserRole.ADMIN;
        BookingDetailResponse result = queries.detail(principal.getId(), admin, id);
        if (admin) audit("booking.support-read", principal.getId(), id, "SUCCESS");
        return result;
    }

    private UserPrincipal actor() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof UserPrincipal principal) || !principal.isEnabled()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return principal;
    }

    private void audit(String action, long userId, Long bookingId, String outcome) {
        log.info("{} correlationId={} actorId={} bookingId={} outcome={}", action, MDC.get("correlationId"), userId, bookingId, outcome);
    }
}
