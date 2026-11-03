package com.example.cinema.booking.entity;

import com.example.cinema.showtime.entity.ShowtimeSeat;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "booking_seats", uniqueConstraints = {
        @UniqueConstraint(name = "uk_booking_seat_item", columnNames = {"booking_id", "showtime_seat_id"}),
        @UniqueConstraint(name = "uk_ticket_code", columnNames = {"ticket_code"})
}, indexes = {
        @Index(name = "idx_booking_seats_showtime_seat", columnList = "showtime_seat_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_seat_id", nullable = false)
    private ShowtimeSeat showtimeSeat;

    @Column(name = "ticket_code", unique = true, length = 48)
    private String ticketCode;

    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;
}
