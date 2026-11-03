package com.example.cinema.ticket.repository;

import com.example.cinema.ticket.entity.TicketCheckin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TicketCheckinRepository extends JpaRepository<TicketCheckin, Long> {

    Optional<TicketCheckin> findByBookingSeatId(Long bookingSeatId);

    boolean existsByBookingSeatId(Long bookingSeatId);
}
