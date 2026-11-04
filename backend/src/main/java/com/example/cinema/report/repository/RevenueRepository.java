package com.example.cinema.report.repository;

import com.example.cinema.payment.entity.Payment;
import org.springframework.data.repository.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public interface RevenueRepository extends Repository<Payment, Long> {
    interface DailyTotal {
        String getDay();
        BigDecimal getRevenue();
        long getPaymentCount();
    }

    // Vietnam has a fixed UTC+07 offset; DATE_ADD does not require MySQL timezone tables.
    @Query(value = "SELECT DATE_FORMAT(DATE_ADD(paid_at, INTERVAL 7 HOUR), '%Y-%m-%d') AS day, "
            + "SUM(amount) AS revenue, COUNT(*) AS paymentCount FROM payments "
            + "WHERE status = 'SUCCESS' AND paid_at >= :from AND paid_at < :to "
            + "GROUP BY day ORDER BY day", nativeQuery = true)
    List<DailyTotal> dailyTotals(@Param("from") Instant from, @Param("to") Instant to);
}
