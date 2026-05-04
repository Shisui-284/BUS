package com.business.busmanagement.repository;

import com.business.busmanagement.model.Seat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SeatRepository extends JpaRepository<Seat, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Seat s WHERE s.id = :id")
    Optional<Seat> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT s FROM Seat s WHERE s.bus.id = :busId ORDER BY s.seatNumber ASC")
    java.util.List<Seat> findByBusId(@Param("busId") Long busId);
}
