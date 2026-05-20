package com.business.busmanagement.service;

import com.business.busmanagement.model.*;
import com.business.busmanagement.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

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

        // Chặn đặt vé khi trip đã hủy, hoàn thành, đang chạy hoặc trễ
        if (trip.getStatus() == Trip.TripStatus.CANCELLED
                || trip.getStatus() == Trip.TripStatus.COMPLETED
                || trip.getStatus() == Trip.TripStatus.RUNNING
                || trip.getStatus() == Trip.TripStatus.DELAYED) {
            throw new IllegalStateException("Không thể đặt vé cho chuyến đã hủy, đã hoàn thành, đang chạy hoặc bị trễ");
        }

        if (trip.getDepartureTime() == null || LocalDateTime.now().isAfter(trip.getDepartureTime().minusMinutes(15))) {
            throw new IllegalStateException("Không thể đặt vé trong vòng 15 phút trước giờ khởi hành");
        }

        Seat seat = seatRepository.findByIdForUpdate(safeSeatId)
                .orElseThrow(() -> new IllegalArgumentException("Seat not found"));

        if (!seat.getBus().getId().equals(trip.getBus().getId())) {
            throw new IllegalStateException("Ghế không thuộc xe của chuyến này");
        }

        // Dùng query CÓ LOCK để tránh race condition
        Optional<Ticket> existingTicket = ticketRepository.findByTripIdAndSeatIdForUpdate(safeTripId, safeSeatId);
        Ticket ticket;

        if (existingTicket.isPresent()) {
            ticket = existingTicket.get();
            if (ticket.getStatus() != Ticket.TicketStatus.CANCELLED
                    && ticket.getStatus() != Ticket.TicketStatus.REFUNDED
                    && ticket.getStatus() != Ticket.TicketStatus.HOLD
                    && ticket.getStatus() != Ticket.TicketStatus.CONFIRMED) {
                throw new IllegalStateException("Ghế này đã được đặt cho chuyến này");
            }

            ticket.setPrice(price);
            ticket.setStatus(Ticket.TicketStatus.HOLD);
            ticket.setBookedAt(LocalDateTime.now());
            ticket.setPaidAt(null);
        } else {
            ticket = new Ticket();
            ticket.setTrip(trip);
            ticket.setSeat(seat);
            ticket.setPrice(price);
            ticket.setStatus(Ticket.TicketStatus.HOLD);
            ticket.setBookedAt(LocalDateTime.now());
            ticket.setPaidAt(null);
        }

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
            Ticket savedTicket = ticketRepository.save(ticket);
            return savedTicket;
        } catch (DataIntegrityViolationException ex) {
            throw new IllegalStateException("Ghế đã được đặt bởi người khác. Vui lòng thử ghế khác.", ex);
        }
    }
}
