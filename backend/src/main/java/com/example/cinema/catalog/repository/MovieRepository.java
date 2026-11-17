package com.example.cinema.catalog.repository;

import com.example.cinema.catalog.entity.Movie;
import com.example.cinema.catalog.entity.MovieStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MovieRepository extends JpaRepository<Movie, Long>, JpaSpecificationExecutor<Movie> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select m from Movie m where m.id = :id")
    java.util.Optional<Movie> findByIdForUpdate(@org.springframework.data.repository.query.Param("id") Long id);

    Page<Movie> findByStatusIn(List<MovieStatus> statuses, Pageable pageable);

    List<Movie> findByStatus(MovieStatus status);

    @Modifying(clearAutomatically = true)
    @Query("update Movie m set m.status = 'SHOWING' " +
           "where m.status = 'UPCOMING' and m.releaseDate is not null and m.releaseDate <= :targetDate")
    int transitionUpcomingToShowing(@Param("targetDate") LocalDate targetDate);
}
