package com.business.busmanagement.controller;

import com.business.busmanagement.dto.*;
import com.business.busmanagement.exception.ResourceNotFoundException;
import com.business.busmanagement.model.*;
import com.business.busmanagement.repository.*;
import com.business.busmanagement.service.TicketService;
import com.business.busmanagement.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class TicketController {

    private final TripRepository tripRepository;
    private final SeatRepository seatRepository;
    private final TicketRepository ticketRepository;
    private final PassengerRepository passengerRepository;
    private final UserService userService;
    private final TicketService ticketService;

    // ----------------------------------------------------------------
    // PUBLIC — Tìm chuyến theo origin/destination/date
    // GET /api/public/trips/search?origin=Hà Nội&destination=TP.HCM&date=2025-05-01
    // ----------------------------------------------------------------
    @GetMapping("/public/trips/search")
    public ResponseEntity<List<TripSearchResponse>> searchTrips(
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false) String date) {

        LocalDate localDate = (date != null && !date.isBlank())
                ? LocalDate.parse(date)
                : LocalDate.now();

        LocalDateTime from = localDate.atStartOfDay();
        LocalDateTime to   = localDate.plusDays(1).atStartOfDay();

        List<Trip> trips = tripRepository.searchTripsByRoute(origin, destination, from, to);

        List<TripSearchResponse> result = trips.stream().map(trip -> {
            List<Long> bookedIds = ticketRepository.findBookedSeatIdsByTripId(trip.getId());
            int total   = (trip.getBus() != null && trip.getBus().getSeats() != null)
                          ? trip.getBus().getSeats().size() : 0;
            int booked  = bookedIds.size();
            String bus  = trip.getBus() != null
                          ? trip.getBus().getLicensePlate() + " - " + trip.getBus().getBusType() : "";
            BigDecimal price = trip.getRoute() != null
                               ? trip.getRoute().getBasePrice() : BigDecimal.ZERO;

            return new TripSearchResponse(
                    trip.getId(),
                    trip.getRoute() != null ? trip.getRoute().getOrigin() : "",
                    trip.getRoute() != null ? trip.getRoute().getDestination() : "",
                    trip.getDepartureTime(),
                    trip.getArrivalTime(),
                    bus,
                    total,
                    total - booked,
                    price,
                    trip.getStatus().name()
            );
        }).toList();

        return ResponseEntity.ok(result);
    }

    // ----------------------------------------------------------------
    // PUBLIC — Sơ đồ ghế của 1 chuyến
    // GET /api/public/trips/{tripId}/seats
    // ----------------------------------------------------------------
    @GetMapping("/public/trips/{tripId}/seats")
    public ResponseEntity<List<SeatStatusResponse>> getTripSeats(@PathVariable Long tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));

        List<Long> bookedIds = ticketRepository.findBookedSeatIdsByTripId(tripId);

        List<SeatStatusResponse> seats = trip.getBus().getSeats().stream()
                .map(seat -> new SeatStatusResponse(
                        seat.getId(),
                        seat.getSeatNumber(),
                        seat.getPositionX(),
                        seat.getPositionY(),
                        bookedIds.contains(seat.getId())
                ))
                .sorted((a, b) -> a.getSeatNumber().compareTo(b.getSeatNumber()))
                .toList();

        return ResponseEntity.ok(seats);
    }

    // ----------------------------------------------------------------
    // PRIVATE — Đặt vé (cần đăng nhập, chỉ CUSTOMER)
    // POST /api/private/tickets
    // Body: { tripId, seatId, price, passengerPhone }
    // ----------------------------------------------------------------
    @PostMapping("/private/tickets")
    public ResponseEntity<TicketResponse> bookTicket(@Valid @RequestBody BookTicketRequest request) {
        User currentUser = getCurrentUser();

        Passenger passenger = passengerRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new IllegalStateException("Passenger profile not found"));

        // Cập nhật SĐT từ form đặt vé vào Passenger
        passenger.setPhone(request.getPassengerPhone());
        passengerRepository.save(passenger);

        Ticket ticket = ticketService.bookTicket(
                request.getTripId(),
                request.getSeatId(),
                passenger.getId(),
                currentUser.getId(),
                request.getPrice()
        );

        return ResponseEntity.ok(toTicketResponse(ticket));
    }

    // ----------------------------------------------------------------
    // PRIVATE — Lịch sử vé
    // GET /api/private/tickets/my
    // ----------------------------------------------------------------
    @GetMapping("/private/tickets/my")
    public ResponseEntity<List<TicketResponse>> getMyTickets() {
        User currentUser = getCurrentUser();
        List<Ticket> tickets = ticketRepository.findByPassengerUserId(currentUser.getId());
        return ResponseEntity.ok(tickets.stream().map(this::toTicketResponse).toList());
    }

    // ----------------------------------------------------------------
    // PRIVATE — Hủy vé
    // PUT /api/private/tickets/{id}/cancel
    // ----------------------------------------------------------------
    @PutMapping("/private/tickets/{id}/cancel")
    public ResponseEntity<TicketResponse> cancelTicket(@PathVariable Long id) {
        User currentUser = getCurrentUser();

        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found"));

        // Chỉ cho hủy vé của chính mình
        if (ticket.getPassenger() == null
                || !ticket.getPassenger().getUser().getId().equals(currentUser.getId())) {
            throw new SecurityException("Bạn không có quyền hủy vé này");
        }

        if (ticket.getStatus() == Ticket.TicketStatus.CANCELLED) {
            throw new IllegalStateException("Vé đã bị hủy trước đó");
        }

        ticket.setStatus(Ticket.TicketStatus.CANCELLED);
        ticketRepository.save(ticket);

        return ResponseEntity.ok(toTicketResponse(ticket));
    }

    // ---- Helpers ----

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userService.findByUsername(username)
                .orElseThrow(() -> new SecurityException("User not found"));
    }

    private TicketResponse toTicketResponse(Ticket ticket) {
        String routeName = (ticket.getTrip() != null && ticket.getTrip().getRoute() != null)
                ? ticket.getTrip().getRoute().getOrigin() + " -> " + ticket.getTrip().getRoute().getDestination()
                : "";
        String busLabel = (ticket.getTrip() != null && ticket.getTrip().getBus() != null)
                ? ticket.getTrip().getBus().getLicensePlate() + " - " + ticket.getTrip().getBus().getBusType()
                : "";

        return new TicketResponse(
                ticket.getId(),
                ticket.getTrip() != null ? ticket.getTrip().getId() : null,
                routeName,
                ticket.getTrip() != null ? ticket.getTrip().getDepartureTime() : null,
                ticket.getTrip() != null ? ticket.getTrip().getArrivalTime() : null,
                busLabel,
                ticket.getSeat() != null ? ticket.getSeat().getSeatNumber() : "",
                ticket.getPassenger() != null ? ticket.getPassenger().getFullName() : "",
                ticket.getPassenger() != null ? ticket.getPassenger().getPhone() : "",
                ticket.getPrice(),
                ticket.getStatus().name(),
                ticket.getBookedAt()
        );
    }
}
