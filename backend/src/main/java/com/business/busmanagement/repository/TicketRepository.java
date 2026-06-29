package com.business.busmanagement.repository;

/* ============================================================
 * Query đặc biệt:
 *   - findBookedSeatIdsByTripId: lấy DS ghế đã đặt của 1 chuyến
 *   - findByTripIdAndSeatIdForUpdate: PESSIMISTIC LOCK chống race
 *   - findByPassengerUserId: lịch sử vé của 1 user
 *   - findAllTicketsForAdmin: admin xem tất cả vé
 * ============================================================ */
import com.business.busmanagement.dto.AdminTicketDTO;
import com.business.busmanagement.model.Seat;
import com.business.busmanagement.model.Ticket;
import com.business.busmanagement.model.Trip;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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
            LEFT JOIN FETCH t.trip tr
            LEFT JOIN FETCH tr.route
            LEFT JOIN FETCH tr.bus
            LEFT JOIN FETCH t.seat
            LEFT JOIN FETCH t.passenger p
            LEFT JOIN FETCH p.user
            LEFT JOIN FETCH t.payment
            WHERE t.id = :id
            """)
    Optional<Ticket> findByIdWithDetails(@Param("id") Long id);

    @Query("SELECT t FROM Ticket t WHERE t.trip.id = :tripId AND t.seat.id = :seatId")
    Optional<Ticket> findByTripIdAndSeatId(@Param("tripId") Long tripId, @Param("seatId") Long seatId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM Ticket t WHERE t.trip.id = :tripId AND t.seat.id = :seatId")
    Optional<Ticket> findByTripIdAndSeatIdForUpdate(@Param("tripId") Long tripId, @Param("seatId") Long seatId);

    @Query("""
            SELECT t FROM Ticket t
            JOIN FETCH t.passenger p
            LEFT JOIN FETCH p.user
            LEFT JOIN FETCH t.trip tr
            LEFT JOIN FETCH tr.route
            LEFT JOIN FETCH tr.bus
            LEFT JOIN FETCH t.seat
            LEFT JOIN FETCH t.payment
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


   @Query("SELECT new com.business.busmanagement.dto.AdminTicketDTO(" +
           "t.id, r.origin, r.destination, tr.departureTime, " +
           "b.licensePlate, b.busType, s.seatNumber, " +
           "p.fullName, p.phone, t.bookedAt, t.price, t.status, " +
           "t.pickupPoint, t.dropoffPoint) " +
           "FROM Ticket t " +
           "LEFT JOIN t.trip tr " +
           "LEFT JOIN tr.route r " +
           "LEFT JOIN tr.bus b " +
           "LEFT JOIN t.seat s " +
           "LEFT JOIN t.passenger p " +
           "ORDER BY t.bookedAt DESC")
    List<AdminTicketDTO> findAllTicketsForAdmin();
}



