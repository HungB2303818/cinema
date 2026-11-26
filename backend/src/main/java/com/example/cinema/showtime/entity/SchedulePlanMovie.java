package com.example.cinema.showtime.entity;

import com.example.cinema.catalog.entity.Movie;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "schedule_plan_movies", uniqueConstraints = {
        @UniqueConstraint(name = "uk_schedule_plan_movie", columnNames = {"plan_id", "movie_id"})
}, indexes = {
        @Index(name = "idx_schedule_plan_movies_movie", columnList = "movie_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SchedulePlanMovie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private SchedulePlan plan;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @Column(name = "priority", nullable = false)
    private int priority;
}
