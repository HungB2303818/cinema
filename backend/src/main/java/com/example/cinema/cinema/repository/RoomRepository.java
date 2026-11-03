package com.example.cinema.cinema.repository;

import com.example.cinema.cinema.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByCinemaId(Long cinemaId);

    Optional<Room> findByCinemaIdAndName(Long cinemaId, String name);
}
