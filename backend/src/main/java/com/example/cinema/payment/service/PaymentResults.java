package com.example.cinema.payment.service;

import com.example.cinema.booking.entity.BookingStatus;
import com.example.cinema.booking.repository.BookingSeatRepository;
import com.example.cinema.common.error.*;
import com.example.cinema.payment.dto.*;
import com.example.cinema.payment.entity.*;
import com.example.cinema.ticket.dto.TicketResponse;

final class PaymentResults {
    private PaymentResults() { }

    static PaymentResponse replay(Payment payment, Long bookingId, MockPaymentRequest request,
            BookingSeatRepository selections) {
        if (!payment.getBooking().getId().equals(bookingId) || payment.getMethod() != PaymentMethod.MOCK
                || !payment.getStatus().name().equals(request.simulatedResult().name())) {
            throw new AppException(ErrorCode.IDEMPOTENCY_CONFLICT);
        }
        return response(payment, selections);
    }

    static PaymentResponse response(Payment payment, BookingSeatRepository selections) {
        var booking = payment.getBooking();
        if (payment.getStatus() == PaymentStatus.FAILED) {
            // Historical attempt result, even if a later attempt confirmed/cancelled/expired the booking.
            return new PaymentResponse(booking.getId(), null, BookingStatus.PENDING, PaymentStatus.FAILED,
                    null, null, "Thanh toán mô phỏng thất bại; có thể thử lại trước hạn giữ ghế.");
        }
        return new PaymentResponse(booking.getId(), booking.getBookingCode(), BookingStatus.CONFIRMED,
                PaymentStatus.SUCCESS, payment.getPaidAt(), selections.findDetails(booking.getId()).stream()
                        .map(TicketResponse::from).toList(), null);
    }
}
