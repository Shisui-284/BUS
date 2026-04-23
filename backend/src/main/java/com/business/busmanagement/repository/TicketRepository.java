package com.business.busmanagement.repository;

import com.business.busmanagement.model.Seat;
import com.business.busmanagement.model.Ticket;
import com.business.busmanagement.model.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Optional<Ticket> findByTripAndSeat(Trip trip, Seat seat);

    boolean existsByTripAndSeat(Trip trip, Seat seat);
}
