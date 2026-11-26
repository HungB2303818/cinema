package com.example.cinema.showtime.repository;

import com.example.cinema.showtime.dto.ActivePlanRef;
import com.example.cinema.showtime.entity.SchedulePlan;
import com.example.cinema.showtime.entity.SchedulePlanStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface SchedulePlanRepository extends JpaRepository<SchedulePlan, Long> {

    @EntityGraph(attributePaths = {"room", "room.cinema"})
    @Query(value = "select p from SchedulePlan p where " +
            "(:cinemaId is null or p.room.cinema.id = :cinemaId) and " +
            "(:roomId is null or p.room.id = :roomId) and " +
            "(:status is null or p.status = :status)",
            countQuery = "select count(p) from SchedulePlan p where " +
            "(:cinemaId is null or p.room.cinema.id = :cinemaId) and " +
            "(:roomId is null or p.room.id = :roomId) and " +
            "(:status is null or p.status = :status)")
    Page<SchedulePlan> findAdminPlans(@Param("cinemaId") Long cinemaId,
                                      @Param("roomId") Long roomId,
                                      @Param("status") SchedulePlanStatus status,
                                      Pageable pageable);

    @EntityGraph(attributePaths = {"room", "room.cinema", "movies", "movies.movie"})
    @Query("select p from SchedulePlan p where p.id = :id")
    Optional<SchedulePlan> findDetailById(@Param("id") Long id);

    @EntityGraph(attributePaths = {"room", "room.cinema", "movies", "movies.movie"})
    @Query("select p from SchedulePlan p where p.id = :id")
    Optional<SchedulePlan> findSnapshotById(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from SchedulePlan p where p.id = :id")
    Optional<SchedulePlan> findByIdForUpdate(@Param("id") Long id);

    @Query("select p.room.id from SchedulePlan p where p.id = :id")
    Optional<Long> findRoomIdById(@Param("id") Long id);

    @Query("select p from SchedulePlan p where p.room.id = :roomId " +
            "and p.status = 'ACTIVE' and (:excludedId is null or p.id <> :excludedId) " +
            "and p.effectiveFrom <= :to and p.effectiveTo >= :from")
    List<SchedulePlan> findActiveOverlappingDates(@Param("roomId") Long roomId,
                                                  @Param("from") LocalDate from,
                                                  @Param("to") LocalDate to,
                                                  @Param("excludedId") Long excludedId);

    @Query("select count(p) > 0 from SchedulePlan p where p.room.id = :roomId " +
            "and p.name = :name and (:excludedId is null or p.id <> :excludedId)")
    boolean existsName(@Param("roomId") Long roomId, @Param("name") String name,
                       @Param("excludedId") Long excludedId);

    @Query("select new com.example.cinema.showtime.dto.ActivePlanRef(" +
            "p.id, p.effectiveFrom, p.effectiveTo, p.daysOfWeek) " +
            "from SchedulePlan p where p.status = 'ACTIVE' order by p.id asc")
    List<ActivePlanRef> findAllActiveRefs();

    @Query("select m.plan.id, count(m) from SchedulePlanMovie m " +
            "where m.plan.id in :planIds group by m.plan.id")
    List<Object[]> countMoviesByPlanIds(@Param("planIds") List<Long> planIds);
}
