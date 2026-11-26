package com.example.cinema.showtime.entity;

import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.cinema.entity.Room;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "schedule_plans", uniqueConstraints = {
        @UniqueConstraint(name = "uk_schedule_plan_name", columnNames = {"room_id", "name"})
}, indexes = {
        @Index(name = "idx_schedule_plan_room_status",
                columnList = "room_id, status, effective_from, effective_to")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchedulePlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to", nullable = false)
    private LocalDate effectiveTo;

    @Column(name = "days_of_week", nullable = false)
    private int daysOfWeek;

    @Column(name = "open_time", nullable = false)
    private LocalTime openTime;

    @Column(name = "close_time", nullable = false)
    private LocalTime closeTime;

    @Column(name = "slot_step_minutes", nullable = false)
    private int slotStepMinutes;

    @Column(name = "cleanup_minutes", nullable = false)
    private int cleanupMinutes;

    @Column(name = "base_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "vip_surcharge", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal vipSurcharge = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SchedulePlanStatus status = SchedulePlanStatus.ACTIVE;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("priority ASC")
    @Builder.Default
    private List<SchedulePlanMovie> movies = new ArrayList<>();

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private Instant updatedAt;

    public void replaceMovies(List<SchedulePlanMovie> newMovies) {
        movies.clear();
        movies.addAll(newMovies);
    }
}
