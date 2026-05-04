package com.business.busmanagement.repository;

import com.business.busmanagement.model.Seat;
import com.business.busmanagement.model.Ticket;
import com.business.busmanagement.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Optional<Ticket> findByTripAndSeat(Trip trip, Seat seat);

    boolean existsByTripAndSeat(Trip trip, Seat seat);

    @Query("""
            SELECT t FROM Ticket t
            JOIN t.passenger p
            WHERE p.user.id = :userId
            ORDER BY t.bookedAt DESC
            """)
    List<Ticket> findByPassengerUserId(@Param("userId") Long userId);

    @Query("""
            SELECT t.seat.id FROM Ticket t
            WHERE t.trip.id = :tripId
              AND t.status NOT IN ('CANCELLED', 'REFUNDED')
            """)
    List<Long> findBookedSeatIdsByTripId(@Param("tripId") Long tripId);

    @Query("""
            SELECT t FROM Ticket t
            WHERE (:keyword IS NULL OR :keyword = ''
                   OR LOWER(t.passenger.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                   OR LOWER(t.passenger.phone) LIKE LOWER(CONCAT('%', :keyword, '%')))
              AND (:status IS NULL OR t.status = :status)
              AND (:tripId IS NULL OR t.trip.id = :tripId)
            ORDER BY t.bookedAt DESC
            """)
    List<Ticket> findAllWithFilters(
            @Param("keyword") String keyword,
            @Param("status") Ticket.TicketStatus status,
            @Param("tripId") Long tripId
    );
}
