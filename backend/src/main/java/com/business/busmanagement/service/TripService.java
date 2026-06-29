package com.business.busmanagement.service;

/* ============================================================
 * TRIP SERVICE — Module: Quản lý chuyến xe (CRUD + Search)
 * Chức năng:
 *   - getTrips / getUpcomingTrips / searchTripsByRoute
 *   - createTrip / updateTrip / deleteTrip
 *   - Tính số ghế trống dựa trên số vé đã đặt
 * ============================================================ */

import com.business.busmanagement.dto.TripCreateRequest;
import com.business.busmanagement.dto.TripResponse;
import com.business.busmanagement.dto.TripSearchResponse;
import com.business.busmanagement.exception.ResourceNotFoundException;
import com.business.busmanagement.model.Bus;
import com.business.busmanagement.model.Route;
import com.business.busmanagement.model.Trip;
import com.business.busmanagement.repository.BusRepository;
import com.business.busmanagement.repository.RouteRepository;
import com.business.busmanagement.repository.SeatRepository;
import com.business.busmanagement.repository.TicketRepository;
import com.business.busmanagement.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final RouteRepository routeRepository;
    private final BusRepository busRepository;
    private final SeatRepository seatRepository;
    private final TicketRepository ticketRepository;

    /**
     * Lấy tất cả chuyến tương lai (không filter theo status).
     * Query: departureTime >= today và < today + 30 days.
     * Bọc trong @Transactional(readOnly=true) để đảm bảo lazy load hoạt động.
     */
    @Transactional(readOnly = true)
    public List<TripSearchResponse> getUpcomingTrips(LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.plusDays(30).atStartOfDay();

        List<Trip> trips = tripRepository.findUpcomingTrips(from, to);

        return trips.stream().map(trip -> toTripSearchResponse(trip)).toList();
    }

    /**
     * Tìm chuyến theo origin/destination trong 1 ngày.
     */
    @Transactional(readOnly = true)
    public List<TripSearchResponse> searchTripsByRoute(
            String origin, String destination, LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.plusDays(1).atStartOfDay();

        List<Trip> trips;
        if (origin == null || origin.isBlank() || destination == null || destination.isBlank()) {
            // Không có origin/destination -> trả tất cả
            trips = tripRepository.findScheduledTrips(from, to);
        } else {
            // Có origin/destination -> tìm chính xác
            trips = tripRepository.searchTripsByRoute(
                    origin.trim(), destination.trim(), from, to);
        }

        return trips.stream().map(trip -> toTripSearchResponse(trip)).toList();
    }

    /**
     * Convert Trip entity -> TripSearchResponse DTO.
     * - totalSeats: lấy từ bus.totalSeats (luôn đúng, không cần query thêm bảng seats)
     * - availableSeats: bus.totalSeats - số vé đã đặt
     */
    private TripSearchResponse toTripSearchResponse(Trip trip) {
        int totalSeats = 0;
        int booked = 0;

        if (trip.getBus() != null) {
            // Dùng bus.totalSeats - là con số admin nhập khi tạo xe
            totalSeats = trip.getBus().getTotalSeats() != null
                    ? trip.getBus().getTotalSeats() : 0;
        }

        if (trip.getId() != null) {
            // Đếm số vé đã đặt (không tính CANCELLED/REFUNDED)
            booked = ticketRepository.findBookedSeatIdsByTripId(trip.getId()).size();
        }

        String busLabel = trip.getBus() != null
                ? trip.getBus().getLicensePlate() + " - " + trip.getBus().getBusType() : "";
        BigDecimal price = trip.getRoute() != null
                ? trip.getRoute().getBasePrice() : BigDecimal.ZERO;
        String origin = trip.getRoute() != null ? trip.getRoute().getOrigin() : "";
        String destination = trip.getRoute() != null ? trip.getRoute().getDestination() : "";

        return new TripSearchResponse(
                trip.getId(),
                origin,
                destination,
                trip.getDepartureTime(),
                trip.getArrivalTime(),
                busLabel,
                totalSeats,
                Math.max(0, totalSeats - booked),
                price,
                trip.getStatus() != null ? trip.getStatus().name() : "UNKNOWN"
        );
    }

    // ===================== ADMIN METHODS =====================

    @Transactional(readOnly = true)
    public List<TripResponse> getTrips(LocalDate date, Long routeId, Trip.TripStatus status) {
        LocalDateTime from = date != null ? date.atStartOfDay() : null;
        LocalDateTime to = date != null ? date.plusDays(1).atStartOfDay() : null;

        return tripRepository.searchTrips(from, to, routeId, status)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TripResponse createTrip(TripCreateRequest request) {
        validateTripTimes(request.getDepartureTime(), request.getArrivalTime());

        Long busId = Objects.requireNonNull(request.getBusId(), "busId is required");
        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found"));

        if (bus.getStatus() == Bus.BusStatus.MAINTENANCE) {
            throw new IllegalStateException("Bus is under maintenance and cannot be scheduled");
        }

        boolean hasOverlap = tripRepository.existsConflictingTripForBus(
                bus.getId(),
                request.getDepartureTime(),
                request.getArrivalTime(),
                null);
        if (hasOverlap) {
            throw new IllegalStateException("Bus already has another trip in this time range");
        }

        Route route = resolveRoute(request);

        Trip trip = new Trip();
        trip.setRoute(route);
        trip.setBus(bus);
        trip.setDepartureTime(request.getDepartureTime());
        trip.setArrivalTime(request.getArrivalTime());
        trip.setStatus(request.getStatus() != null ? request.getStatus() : Trip.TripStatus.SCHEDULED);

        return toResponse(tripRepository.save(trip));
    }

    @Transactional
    public TripResponse updateTrip(Long id, TripCreateRequest request) {
        validateTripTimes(request.getDepartureTime(), request.getArrivalTime());

        Trip trip = getTripEntity(id);
        Long busId = Objects.requireNonNull(request.getBusId(), "busId is required");
        Bus bus = busRepository.findById(busId)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found"));

        if (bus.getStatus() == Bus.BusStatus.MAINTENANCE) {
            throw new IllegalStateException("Bus is under maintenance and cannot be scheduled");
        }

        boolean hasOverlap = tripRepository.existsConflictingTripForBus(
                bus.getId(),
                request.getDepartureTime(),
                request.getArrivalTime(),
                trip.getId());
        if (hasOverlap) {
            throw new IllegalStateException("Bus already has another trip in this time range");
        }

        Route route = resolveRoute(request);

        trip.setRoute(route);
        trip.setBus(bus);
        trip.setDepartureTime(request.getDepartureTime());
        trip.setArrivalTime(request.getArrivalTime());
        trip.setStatus(request.getStatus() != null ? request.getStatus() : trip.getStatus());

        return toResponse(tripRepository.save(trip));
    }

    @Transactional
    public void deleteTrip(Long id) {
        Trip trip = getTripEntity(id);
        tripRepository.delete(trip);
    }

    private Route resolveRoute(TripCreateRequest request) {
        if (request.getRouteId() != null) {
            return routeRepository.findById(request.getRouteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + request.getRouteId()));
        }

        if (request.getOrigin() == null || request.getDestination() == null) {
            throw new IllegalArgumentException("Either routeId or origin+destination is required");
        }

        String origin = request.getOrigin().trim();
        String destination = request.getDestination().trim();

        List<Route> existingRoutes = routeRepository.findAll();
        Route existingRoute = existingRoutes.stream()
                .filter(r -> r.getOrigin().equalsIgnoreCase(origin)
                                && r.getDestination().equalsIgnoreCase(destination))
                .findFirst()
                .orElse(null);

        if (existingRoute != null) {
            return existingRoute;
        }

        Route newRoute = new Route();
        newRoute.setOrigin(origin);
        newRoute.setDestination(destination);
        newRoute.setBasePrice(request.getBasePrice() != null ? request.getBasePrice() : BigDecimal.valueOf(300000));
        newRoute.setDistanceKm(request.getDistanceKm() != null ? request.getDistanceKm() : BigDecimal.ZERO);
        newRoute.setEstimatedDurationMin(request.getEstimatedDurationMin() != null ? request.getEstimatedDurationMin() : 60);
        newRoute.setIsActive(true);

        return routeRepository.save(newRoute);
    }

    private void validateTripTimes(LocalDateTime departureTime, LocalDateTime arrivalTime) {
        if (departureTime == null || arrivalTime == null) {
            throw new IllegalArgumentException("Departure time and arrival time are required");
        }
        if (arrivalTime.isBefore(departureTime) || arrivalTime.isEqual(departureTime)) {
            throw new IllegalArgumentException("Arrival time must be after departure time");
        }
    }

    @Transactional(readOnly = true)
    public Trip getTripEntity(Long id) {
        Long tripId = Objects.requireNonNull(id, "tripId is required");
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found"));
    }

    public TripResponse toResponse(Trip trip) {
        String routeName = trip.getRoute() != null
                ? trip.getRoute().getOrigin() + " -> " + trip.getRoute().getDestination()
                : "";
        String busLabel = trip.getBus() != null
                ? trip.getBus().getLicensePlate() + " - " + trip.getBus().getBusType()
                : "";

        int totalSeats = trip.getBus() != null && trip.getBus().getTotalSeats() != null
                ? trip.getBus().getTotalSeats() : 0;
        int bookedSeats = trip.getId() != null
                ? ticketRepository.findBookedSeatIdsByTripId(trip.getId()).size() : 0;

        return new TripResponse(
                trip.getId(),
                trip.getRoute() != null ? trip.getRoute().getId() : null,
                routeName,
                trip.getBus() != null ? trip.getBus().getId() : null,
                busLabel,
                trip.getDepartureTime(),
                trip.getArrivalTime(),
                trip.getStatus(),
                totalSeats,
                bookedSeats,
                Math.max(0, totalSeats - bookedSeats)
        );
    }
}
