package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.entity.ScheduleGenerationLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;

@Repository
public interface ScheduleGenerationLogRepository extends JpaRepository<ScheduleGenerationLog, Long> {

    @Query(value = "select l from ScheduleGenerationLog l where l.plan.id = :planId " +
            "and (:from is null or l.targetDate >= :from) " +
            "and (:to is null or l.targetDate <= :to) " +
            "order by l.targetDate desc, l.createdAt desc",
            countQuery = "select count(l) from ScheduleGenerationLog l where l.plan.id = :planId " +
            "and (:from is null or l.targetDate >= :from) " +
            "and (:to is null or l.targetDate <= :to)")
    Page<ScheduleGenerationLog> findPlanLogs(@Param("planId") Long planId,
                                             @Param("from") LocalDate from,
                                             @Param("to") LocalDate to,
                                             Pageable pageable);

    @Query("select count(l) > 0 from ScheduleGenerationLog l " +
            "where l.plan.id = :planId and l.targetDate = :date " +
            "and l.outcome in ('SUCCESS','PARTIAL') and l.createdCount > 0")
    boolean existsSuccessfulGeneration(@Param("planId") Long planId,
                                       @Param("date") LocalDate date);
}
