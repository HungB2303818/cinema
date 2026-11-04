package com.example.cinema.ticket.service;

import com.example.cinema.auth.entity.UserRole;
import com.example.cinema.booking.service.BookingRetry;
import com.example.cinema.common.util.*;
import com.example.cinema.ticket.dto.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;
import java.util.List;

@Slf4j
@Service
@Validated
@RequiredArgsConstructor
public class TicketService {
    private final TicketQueries queries;
    private final CheckinTransactions transactions;
    private final BookingRetry retry;

    @PreAuthorize("hasAnyRole('CUSTOMER','ADMIN')")
    public List<TicketResponse> tickets(Long id) {
        Requests.positiveId(id);
        var actor = CurrentActor.require();
        var result = queries.tickets(actor.getId(), actor.getRole() == UserRole.ADMIN, id);
        if (actor.getRole() == UserRole.ADMIN) {
            log.info("ticket.support-read correlationId={} actorId={} bookingId={} outcome=SUCCESS",
                    MDC.get("correlationId"), actor.getId(), id);
        }
        return result;
    }

    @PreAuthorize("hasAnyRole('STAFF','ADMIN')")
    public CheckinResponse checkin(@NotNull(message = "Yêu cầu check-in không được null.") @Valid CheckinRequest request) {
        var actor = CurrentActor.require();
        var result = retry.execute(() -> transactions.checkin(actor.getId(), request));
        // Never log the bearer ticket code (including as a resource identifier).
        log.info("ticket.checkin correlationId={} actorId={} checkinId={} outcome=CHECKED_IN",
                MDC.get("correlationId"), actor.getId(), result.checkinId());
        return result.response();
    }
}
