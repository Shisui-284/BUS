package com.business.busmanagement.service;

import com.business.busmanagement.model.Passenger;
import com.business.busmanagement.model.Seat;
import com.business.busmanagement.model.Ticket;
import com.business.busmanagement.model.Trip;
import com.business.busmanagement.model.User;
import com.business.busmanagement.repository.PassengerRepository;
import com.business.busmanagement.repository.SeatRepository;
import com.business.busmanagement.repository.TicketRepository;
import com.business.busmanagement.repository.TripRepository;
import com.business.busmanagement.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TripRepository tripRepository;
    private final SeatRepository seatRepository;
    private final PassengerRepository passengerRepository;
    private final UserRepository userRepository;

    @Transactional
    public Ticket bookTicket(Long tripId, Long seatId, Long passengerId, Long bookedById, BigDecimal price) {
        Long safeTripId = Objects.requireNonNull(tripId, "tripId is required");
        Long safeSeatId = Objects.requireNonNull(seatId, "seatId is required");

        if (price == null || price.signum() <= 0) {
            throw new IllegalArgumentException("Ticket price must be greater than 0");
        }

        Trip trip = tripRepository.findById(safeTripId)
                .orElseThrow(() -> new IllegalArgumentException("Trip not found"));

        if (trip.getStatus() == Trip.TripStatus.CANCELLED || trip.getStatus() == Trip.TripStatus.COMPLETED) {
            throw new IllegalStateException("Không thể đặt vé cho chuyến đã hủy hoặc đã hoàn thành");
        }

        if (trip.getDepartureTime() == null || trip.getDepartureTime().minusMinutes(15).isBefore(LocalDateTime.now())) {
            throw new IllegalStateException("Không thể đặt vé trong vòng 15 phút trước giờ khởi hành");
        }

        Seat seat = seatRepository.findByIdForUpdate(safeSeatId)
                .orElseThrow(() -> new IllegalArgumentException("Seat not found"));

        if (!seat.getBus().getId().equals(trip.getBus().getId())) {
            throw new IllegalStateException("Ghế không thuộc xe của chuyến này");
        }

        if (ticketRepository.existsByTripAndSeat(trip, seat)) {
            throw new IllegalStateException("Ghế này đã được đặt cho chuyến này");
        }

        Ticket ticket = new Ticket();
        ticket.setTrip(trip);
        ticket.setSeat(seat);
        ticket.setPrice(price);
        ticket.setStatus(Ticket.TicketStatus.BOOKED);
        ticket.setBookedAt(LocalDateTime.now());

        if (passengerId != null) {
            Passenger passenger = passengerRepository.findById(passengerId)
                    .orElseThrow(() -> new IllegalArgumentException("Passenger not found"));
            ticket.setPassenger(passenger);
        }

        if (bookedById != null) {
            User user = userRepository.findById(bookedById)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));
            ticket.setBookedBy(user);
        }

        try {
            return ticketRepository.save(ticket);
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalStateException("Ghế đã được đặt bởi người khác. Vui lòng thử ghế khác.", ex);
        }
    }
}
