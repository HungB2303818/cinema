package com.example.cinema.payment.service;

import com.example.cinema.booking.repository.*;
import com.example.cinema.common.error.*;
import com.example.cinema.payment.dto.*;
import com.example.cinema.payment.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, propagation = Propagation.REQUIRES_NEW, isolation = Isolation.REPEATABLE_READ)
public class PaymentQueries {
    private final BookingRepository bookings;
    private final PaymentRepository payments;
    private final BookingSeatRepository selections;

    public Optional<PaymentResponse> replay(long userId, Long id, MockPaymentRequest request) {
        var booking = bookings.findById(id).orElseThrow(() -> new AppException(ErrorCode.RESOURCE_NOT_FOUND));
        if (!booking.getUser().getId().equals(userId)) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND);
        return payments.findByIdempotencyKey(request.idempotencyKey())
                .map(payment -> PaymentResults.replay(payment, id, request, selections));
    }
}
