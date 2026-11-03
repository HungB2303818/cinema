package com.example.cinema.ticket.entity;

import com.example.cinema.auth.entity.User;
import com.example.cinema.booking.entity.BookingSeat;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "ticket_checkins", uniqueConstraints = {
        @UniqueConstraint(name = "uk_ticket_checkin_once", columnNames = {"booking_seat_id"})
}, indexes = {
        @Index(name = "idx_ticket_checkins_staff_time", columnList = "staff_id, checked_in_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TicketCheckin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_seat_id", nullable = false)
    private BookingSeat bookingSeat;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_id", nullable = false)
    private User staff;

    @Column(name = "checked_in_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant checkedInAt = Instant.now();
}
