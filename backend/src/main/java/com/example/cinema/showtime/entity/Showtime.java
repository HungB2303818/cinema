package com.example.cinema.showtime.entity;

import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.cinema.entity.Room;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "showtimes", indexes = {
        @Index(name = "idx_showtimes_room_time", columnList = "room_id, starts_at, ends_at"),
        @Index(name = "idx_showtimes_movie_time", columnList = "movie_id, starts_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Showtime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.SMALLINT)
    @Column(name = "cleanup_minutes", nullable = false)
    @Builder.Default
    private Integer cleanupMinutes = 15;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "vip_surcharge", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal vipSurcharge = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ShowtimeStatus status = ShowtimeStatus.SCHEDULED;
}
