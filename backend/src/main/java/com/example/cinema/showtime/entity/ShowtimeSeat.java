package com.example.cinema.showtime.entity;

import com.example.cinema.cinema.entity.Seat;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "showtime_seats", uniqueConstraints = {
        @UniqueConstraint(name = "uk_showtime_seat", columnNames = {"showtime_id", "seat_id"})
}, indexes = {
        @Index(name = "idx_showtime_seats_booker", columnList = "current_booking_id"),
        @Index(name = "idx_showtime_seats_expire", columnList = "status, hold_expires_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShowtimeSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ShowtimeSeatStatus status = ShowtimeSeatStatus.AVAILABLE;

    @Column(name = "current_booking_id")
    private Long currentBookingId;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Version
    @Column(name = "version", nullable = false)
    @Builder.Default
    private Long version = 0L;
}
