package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.SchedulePlanMovie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SchedulePlanMovieRepository extends JpaRepository<SchedulePlanMovie, Long> {

    List<SchedulePlanMovie> findByPlanIdOrderByPriorityAsc(Long planId);
}
