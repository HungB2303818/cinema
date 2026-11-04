package com.example.cinema.payment.repository;

import com.example.cinema.payment.entity.Payment;
import com.example.cinema.payment.entity.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    Optional<Payment> findByBookingIdAndStatus(Long bookingId, PaymentStatus status);

    List<Payment> findByBookingId(Long bookingId);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = 'SUCCESS' AND p.paidAt >= :from AND p.paidAt < :to")
    BigDecimal calculateRevenueBetween(@Param("from") Instant from, @Param("to") Instant to);
}
