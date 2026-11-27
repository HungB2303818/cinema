package com.example.cinema.report.repository;

import com.example.cinema.report.dto.RevenueGroupBy;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * Aggregates revenue at payment grain. The booking_seats derived table is grouped per booking
 * before the join so a booking with several seats never multiplies payment amounts.
 */
@Repository
@RequiredArgsConstructor
public class RevenueAnalyticsRepository {

    private static final String BASE_FROM = """
            FROM payments p
            JOIN bookings b ON b.id = p.booking_id
            JOIN showtimes s ON s.id = b.showtime_id
            JOIN rooms r ON r.id = s.room_id
            LEFT JOIN (
                SELECT booking_id, COUNT(*) AS tickets
                FROM booking_seats
                WHERE ticket_code IS NOT NULL
                GROUP BY booking_id
            ) t ON t.booking_id = p.booking_id
            """;

    // 0 is a safe sentinel because ids are positive; it avoids binding nulls into native queries.
    private static final String BASE_WHERE = """
            WHERE p.status = 'SUCCESS'
              AND p.paid_at >= :from
              AND p.paid_at < :to
              AND (:cinemaFilter = 0 OR r.cinema_id = :cinemaFilter)
              AND (:movieFilter = 0 OR s.movie_id = :movieFilter)
            """;

    private final EntityManager em;

    public record SummaryRow(BigDecimal revenue, long paymentCount, long tickets) {
    }

    public record SeriesRow(String period, BigDecimal revenue, long paymentCount, long tickets) {
    }

    public record BreakdownRow(Long groupId, String groupName, BigDecimal revenue, long paymentCount, long tickets) {
    }

    public SummaryRow summary(Instant from, Instant to, long cinemaFilter, long movieFilter) {
        Query query = em.createNativeQuery(
                "SELECT COALESCE(SUM(p.amount), 0) AS revenue, COUNT(*) AS paymentCount, "
                        + "COALESCE(SUM(t.tickets), 0) AS tickets "
                        + BASE_FROM + BASE_WHERE);
        bindRange(query, from, to, cinemaFilter, movieFilter);
        Object[] row = (Object[]) query.getSingleResult();
        return new SummaryRow(toBigDecimal(row[0]), toLong(row[1]), toLong(row[2]));
    }

    public List<SeriesRow> series(Instant from, Instant to, long cinemaFilter, long movieFilter, String pattern) {
        Query query = em.createNativeQuery(
                "SELECT DATE_FORMAT(DATE_ADD(p.paid_at, INTERVAL 7 HOUR), :pattern) AS period, "
                        + "COALESCE(SUM(p.amount), 0) AS revenue, COUNT(*) AS paymentCount, "
                        + "COALESCE(SUM(t.tickets), 0) AS tickets "
                        + BASE_FROM + BASE_WHERE
                        + " GROUP BY period ORDER BY period");
        bindRange(query, from, to, cinemaFilter, movieFilter);
        query.setParameter("pattern", pattern);
        return query.getResultList().stream().map(row -> {
            Object[] values = (Object[]) row;
            return new SeriesRow((String) values[0], toBigDecimal(values[1]), toLong(values[2]), toLong(values[3]));
        }).toList();
    }

    public List<BreakdownRow> breakdown(Instant from, Instant to, long cinemaFilter, long movieFilter,
            RevenueGroupBy groupBy, String sortColumn, String direction, int offset, int limit) {
        String groupId = groupColumn(groupBy);
        String nameColumn = nameColumn(groupBy);
        String join = groupJoin(groupBy);
        Query query = em.createNativeQuery(
                "SELECT " + groupId + " AS groupId, " + nameColumn + " AS groupName, "
                        + "COALESCE(SUM(p.amount), 0) AS totalRevenue, COUNT(*) AS successfulPayments, "
                        + "COALESCE(SUM(t.tickets), 0) AS ticketsSold "
                        + BASE_FROM + join + BASE_WHERE
                        + " GROUP BY " + groupId + ", " + nameColumn
                        + " ORDER BY " + sortColumn + " " + direction + ", " + groupId + " ASC"
                        // limit/offset are validated ints; inlining avoids MySQL prepared LIMIT quirks.
                        + " LIMIT " + limit + " OFFSET " + offset);
        bindRange(query, from, to, cinemaFilter, movieFilter);
        return mapBreakdownRows(query.getResultList());
    }

    public List<BreakdownRow> breakdownAll(Instant from, Instant to, long cinemaFilter, long movieFilter,
            RevenueGroupBy groupBy, int limit) {
        String groupId = groupColumn(groupBy);
        String nameColumn = nameColumn(groupBy);
        String join = groupJoin(groupBy);
        Query query = em.createNativeQuery(
                "SELECT " + groupId + " AS groupId, " + nameColumn + " AS groupName, "
                        + "COALESCE(SUM(p.amount), 0) AS totalRevenue, COUNT(*) AS successfulPayments, "
                        + "COALESCE(SUM(t.tickets), 0) AS ticketsSold "
                        + BASE_FROM + join + BASE_WHERE
                        + " GROUP BY " + groupId + ", " + nameColumn
                        + " ORDER BY totalRevenue DESC, " + groupId + " ASC"
                        + " LIMIT " + limit);
        bindRange(query, from, to, cinemaFilter, movieFilter);
        return mapBreakdownRows(query.getResultList());
    }

    public long breakdownCount(Instant from, Instant to, long cinemaFilter, long movieFilter,
            RevenueGroupBy groupBy) {
        Query query = em.createNativeQuery(
                "SELECT COUNT(DISTINCT " + groupColumn(groupBy) + ") " + BASE_FROM + BASE_WHERE);
        bindRange(query, from, to, cinemaFilter, movieFilter);
        return toLong(query.getSingleResult());
    }

    private static String groupColumn(RevenueGroupBy groupBy) {
        return groupBy == RevenueGroupBy.MOVIE ? "s.movie_id" : "r.cinema_id";
    }

    private static String nameColumn(RevenueGroupBy groupBy) {
        return groupBy == RevenueGroupBy.MOVIE ? "g.title" : "g.name";
    }

    private static String groupJoin(RevenueGroupBy groupBy) {
        return groupBy == RevenueGroupBy.MOVIE ? " JOIN movies g ON g.id = s.movie_id " : " JOIN cinemas g ON g.id = r.cinema_id ";
    }

    private static void bindRange(Query query, Instant from, Instant to, long cinemaFilter, long movieFilter) {
        query.setParameter("from", from);
        query.setParameter("to", to);
        query.setParameter("cinemaFilter", cinemaFilter);
        query.setParameter("movieFilter", movieFilter);
    }

    private static List<BreakdownRow> mapBreakdownRows(List<?> rows) {
        return rows.stream().map(row -> {
            Object[] values = (Object[]) row;
            return new BreakdownRow(toLong(values[0]), (String) values[1], toBigDecimal(values[2]),
                    toLong(values[3]), toLong(values[4]));
        }).toList();
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return new BigDecimal(number.toString());
        return new BigDecimal(value.toString());
    }

    private static long toLong(Object value) {
        if (value == null) return 0L;
        return value instanceof Number number ? number.longValue() : Long.parseLong(value.toString());
    }
}
