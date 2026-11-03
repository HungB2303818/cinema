package com.example.cinema.booking.repository;

import com.example.cinema.booking.entity.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    List<BookingSeat> findByBookingId(Long bookingId);

    Optional<BookingSeat> findByTicketCode(String ticketCode);

    List<BookingSeat> findByBookingIdAndTicketCodeIsNotNull(Long bookingId);
}
