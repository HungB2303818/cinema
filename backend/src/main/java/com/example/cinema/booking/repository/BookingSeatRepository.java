package com.example.cinema.booking.repository;

import com.example.cinema.booking.entity.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    @Query("select bs.showtimeSeat.id from BookingSeat bs where bs.booking.id = :id order by bs.showtimeSeat.id")
    List<Long> findInventoryIds(@Param("id") Long bookingId);

    @Query("select bs.showtimeSeat.seat.id from BookingSeat bs where bs.booking.id = :id order by bs.showtimeSeat.seat.id")
    List<Long> findPhysicalSeatIds(@Param("id") Long bookingId);

    @Query("select bs from BookingSeat bs join fetch bs.showtimeSeat inventory join fetch inventory.seat seat " +
            "where bs.booking.id = :id order by seat.seatRow, seat.seatNumber")
    List<BookingSeat> findDetails(@Param("id") Long bookingId);

    List<BookingSeat> findByBookingId(Long bookingId);

    Optional<BookingSeat> findByTicketCode(String ticketCode);

    @Query("select bs.booking.id from BookingSeat bs where bs.ticketCode = :code")
    Optional<Long> findBookingIdByTicketCode(@Param("code") String code);

    List<BookingSeat> findByBookingIdAndTicketCodeIsNotNull(Long bookingId);
}
