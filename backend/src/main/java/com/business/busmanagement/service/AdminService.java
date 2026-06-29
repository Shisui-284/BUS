package com.business.busmanagement.service;

/* ============================================================
 * ADMIN SERVICE — Module: Quản lý phía Admin (1270+ dòng)
 * Chức năng:
 *   - Dashboard: tổng quan số liệu
 *   - Revenue: thống kê doanh thu (ngày/tuần/tháng)
 *   - User CRUD + khóa/mở khóa/reset password
 *   - Bus CRUD + đổi status
 *   - Route CRUD
 *   - Trip CRUD
 *   - Ticket: xác nhận, mark paid, admin cancel
 * ============================================================ */

import com.business.busmanagement.dto.TripCreateRequest;
import com.business.busmanagement.dto.TripResponse;
import com.business.busmanagement.dto.admin.*;
import com.business.busmanagement.exception.BusinessConflictException;
import com.business.busmanagement.exception.ResourceNotFoundException;
import com.business.busmanagement.model.*;
import com.business.busmanagement.repository.*;
import com.business.busmanagement.service.TripService;
import com.business.busmanagement.util.RoleNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PassengerRepository passengerRepository;
    private final BusRepository busRepository;
    private final RouteRepository routeRepository;
    private final TripRepository tripRepository;
    private final TicketRepository ticketRepository;
    private final TripService tripService;
    private final SeatRepository seatRepository;
    private final PaymentRepository paymentRepository;
    private final EmployeeRepository employeeRepository;
    private final TripAssignmentRepository tripAssignmentRepository;
    private final PasswordEncoder passwordEncoder;

    // ==================== DASHBOARD ====================

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {
        List<User> visibleUsers = userRepository.findAll()
                .stream()
                .filter(user -> user.getStatus() != User.UserStatus.INACTIVE)
                .collect(Collectors.toList());

        long totalUsers = visibleUsers.size();
        long totalBuses = busRepository.count();
        long totalRoutes = routeRepository.count();

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        // Dashboard: đếm tất cả trips trong ngày (không filter status)
        long todayTrips = tripRepository.findAll()
                .stream()
                .filter(t -> t.getDepartureTime() != null
                        && !t.getDepartureTime().isBefore(startOfDay)
                        && t.getDepartureTime().isBefore(endOfDay))
                .count();

        List<Role> roles = roleRepository.findAll();
        List<AdminDashboardResponse.RoleCount> roleDistribution = roles.stream()
                .map(role -> {
                    String normalizedRole = RoleNormalizer.normalize(role.getName());

                    long count = visibleUsers.stream()
                            .filter(user -> user.getRole() != null)
                            .filter(user -> normalizedRole.equalsIgnoreCase(
                                    RoleNormalizer.normalize(user.getRole().getName())))
                            .count();

                    return new AdminDashboardResponse.RoleCount(normalizedRole, count);
                })
                .filter(roleCount -> roleCount.getCount() > 0)
                .collect(Collectors.toList());

        List<Bus> allBuses = busRepository.findAll();
        List<AdminDashboardResponse.BusStatusCount> busStatusDistribution = allBuses.stream()
                .collect(Collectors.groupingBy(bus -> bus.getStatus().name()))
                .entrySet()
                .stream()
                .map(entry -> new AdminDashboardResponse.BusStatusCount(entry.getKey(), entry.getValue().size()))
                .collect(Collectors.toList());

        List<AdminDashboardResponse.BusInsuranceAlert> insuranceAlerts = buildInsuranceAlerts(allBuses);

        return new AdminDashboardResponse(
                totalUsers,
                totalBuses,
                totalRoutes,
                todayTrips,
                roleDistribution,
                busStatusDistribution,
                insuranceAlerts);
    }

    private List<AdminDashboardResponse.BusInsuranceAlert> buildInsuranceAlerts(List<Bus> buses) {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysLater = today.plusDays(30);
        List<AdminDashboardResponse.BusInsuranceAlert> alerts = new ArrayList<>();

        for (Bus bus : buses) {
            if (bus.getInsuranceExpiry() == null) {
                continue;
            }

            LocalDate expiry = bus.getInsuranceExpiry();
            String alertType;

            if (expiry.isBefore(today)) {
                alertType = "EXPIRED";
            } else if (expiry.isBefore(thirtyDaysLater)) {
                alertType = "EXPIRING_SOON";
            } else {
                continue;
            }

            alerts.add(new AdminDashboardResponse.BusInsuranceAlert(
                    bus.getId(),
                    bus.getLicensePlate(),
                    bus.getBusType() != null ? bus.getBusType().name() : "",
                    bus.getStatus().name(),
                    expiry.toString(),
                    alertType));
        }

        return alerts;
    }

    // ==================== USER MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<UserListResponse> getUsers(String keyword, String role, String status) {
        List<User> users;

        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.toLowerCase();

            users = userRepository.findAll()
                    .stream()
                    .filter(user -> user.getUsername().toLowerCase().contains(kw)
                            || (user.getEmail() != null && user.getEmail().toLowerCase().contains(kw))
                            || (user.getPhone() != null && user.getPhone().toLowerCase().contains(kw)))
                    .collect(Collectors.toList());
        } else {
            users = userRepository.findAll();
        }

        return users.stream()
                .filter(user -> {
                    if (role != null && !role.isBlank()) {
                        String normalizedRole = RoleNormalizer.normalize(user.getRole().getName());

                        if (!role.equalsIgnoreCase(normalizedRole)) {
                            return false;
                        }
                    }

                    if (status != null && !status.isBlank()) {
                        return user.getStatus() != null
                                && user.getStatus().name().equalsIgnoreCase(status);
                    }

                    return user.getStatus() != User.UserStatus.INACTIVE;
                })
                .map(this::toUserListResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public UserDetailResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        return toUserDetailResponse(user);
    }

    @Transactional
    public UserDetailResponse createUser(CreateUserRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessConflictException("Username already exists");
        }

        if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessConflictException("Email already exists");
        }

        Role role = roleRepository.findByName(request.getRole().toUpperCase())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + request.getRole()));

        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setRole(role);
        user.setStatus(User.UserStatus.ACTIVE);

        User saved = userRepository.save(user);

        return toUserDetailResponse(saved);
    }

    @Transactional
    public UserDetailResponse updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (request.getEmail() != null) {
            Optional<User> existing = userRepository.findByEmail(request.getEmail());

            if (existing.isPresent() && !existing.get().getId().equals(id)) {
                throw new BusinessConflictException("Email already in use");
            }

            user.setEmail(request.getEmail());
        }

        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }

        return toUserDetailResponse(userRepository.save(user));
    }

    @Transactional
    public UserDetailResponse lockUnlockUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (user.getStatus() == User.UserStatus.ACTIVE) {
            user.setStatus(User.UserStatus.LOCKED);
        } else {
            user.setStatus(User.UserStatus.ACTIVE);
        }

        return toUserDetailResponse(userRepository.save(user));
    }

    @Transactional
    public void resetUserPassword(Long id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if ("admin".equalsIgnoreCase(user.getUsername())) {
            throw new BusinessConflictException("Không thể xóa tài khoản admin mặc định");
        }

        String currentRole = RoleNormalizer.normalize(user.getRole().getName());

        if ("ADMIN".equalsIgnoreCase(currentRole)) {
            long activeAdminCount = userRepository.findAll()
                    .stream()
                    .filter(existingUser -> existingUser.getStatus() == User.UserStatus.ACTIVE)
                    .filter(existingUser -> existingUser.getRole() != null)
                    .filter(existingUser -> "ADMIN".equalsIgnoreCase(
                            RoleNormalizer.normalize(existingUser.getRole().getName())))
                    .count();

            if (activeAdminCount <= 1) {
                throw new BusinessConflictException("Không thể xóa admin cuối cùng của hệ thống");
            }
        }

        String deletedSuffix = "_deleted_" + user.getId();

        if (user.getUsername() != null && !user.getUsername().contains("_deleted_")) {
            user.setUsername(user.getUsername() + deletedSuffix);
        }

        if (user.getEmail() != null && !user.getEmail().startsWith("deleted_")) {
            user.setEmail("deleted_" + user.getId() + "_" + user.getEmail());
        }

        user.setPhone(null);
        user.setStatus(User.UserStatus.INACTIVE);

        userRepository.save(user);
    }

    // ==================== BUS MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<BusListResponse> getBuses(String keyword, String status) {
        List<Bus> buses;

        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.toLowerCase();

            buses = busRepository.findAll()
                    .stream()
                    .filter(bus -> bus.getLicensePlate().toLowerCase().contains(kw))
                    .collect(Collectors.toList());
        } else {
            buses = busRepository.findAll();
        }

        LocalDate today = LocalDate.now();
        LocalDate thirtyDays = today.plusDays(30);

        return buses.stream()
                .filter(bus -> {
                    if (status != null && !status.isBlank()) {
                        return bus.getStatus().name().equalsIgnoreCase(status);
                    }

                    return true;
                })
                .map(bus -> new BusListResponse(
                        bus.getId(),
                        bus.getLicensePlate(),
                        bus.getBusType() != null ? bus.getBusType().name() : "",
                        bus.getTotalSeats(),
                        bus.getStatus().name(),
                        bus.getLastMaintenanceDate(),
                        bus.getInsuranceExpiry(),
                        bus.getInsuranceExpiry() != null && bus.getInsuranceExpiry().isBefore(today),
                        bus.getInsuranceExpiry() != null
                                && !bus.getInsuranceExpiry().isBefore(today)
                                && bus.getInsuranceExpiry().isBefore(thirtyDays)))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BusDetailResponse getBusById(Long id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id: " + id));

        return toBusDetailResponse(bus);
    }

    @Transactional
    public BusDetailResponse createBus(CreateBusRequest request) {
        if (busRepository.findAll()
                .stream()
                .anyMatch(bus -> bus.getLicensePlate().equalsIgnoreCase(request.getLicensePlate()))) {
            throw new BusinessConflictException("License plate already exists");
        }

        Bus bus = new Bus();
        bus.setLicensePlate(request.getLicensePlate());
        bus.setBusType(Bus.BusType.valueOf(request.getBusType().toUpperCase()));
        bus.setTotalSeats(request.getTotalSeats());
        bus.setStatus(Bus.BusStatus.AVAILABLE);
        bus.setLastMaintenanceDate(request.getLastMaintenanceDate());
        bus.setInsuranceExpiry(request.getInsuranceExpiry());

        Bus saved = busRepository.save(bus);

        List<Seat> seats = new ArrayList<>();

        for (int i = 1; i <= saved.getTotalSeats(); i++) {
            Seat seat = new Seat();
            seat.setBus(saved);
            seat.setSeatNumber(String.valueOf(i));
            seat.setPositionX((i - 1) % 10);
            seat.setPositionY((i - 1) / 10);
            seats.add(seat);
        }

        seatRepository.saveAll(seats);

        return toBusDetailResponse(saved);
    }

    @Transactional
    public BusDetailResponse updateBus(Long id, UpdateBusRequest request) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id: " + id));

        if (request.getBusType() != null) {
            bus.setBusType(Bus.BusType.valueOf(request.getBusType().toUpperCase()));
        }

        if (request.getTotalSeats() != null) {
            bus.setTotalSeats(request.getTotalSeats());
        }

        if (request.getLastMaintenanceDate() != null) {
            bus.setLastMaintenanceDate(request.getLastMaintenanceDate());
        }

        if (request.getInsuranceExpiry() != null) {
            bus.setInsuranceExpiry(request.getInsuranceExpiry());
        }

        return toBusDetailResponse(busRepository.save(bus));
    }

    @Transactional
    public BusDetailResponse updateBusStatus(Long id, String status) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id: " + id));

        bus.setStatus(Bus.BusStatus.valueOf(status.toUpperCase()));

        return toBusDetailResponse(busRepository.save(bus));
    }

    @Transactional
    public void deleteBus(Long id) {
        Bus bus = busRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Bus not found with id: " + id));

        if (bus.getTrips() != null && !bus.getTrips().isEmpty()) {
            throw new BusinessConflictException(
                    "Không thể xóa xe vì đang có " + bus.getTrips().size() + " chuyến xe liên quan");
        }

        busRepository.delete(bus);
    }

    // ==================== ROUTE MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<RouteListResponse> getRoutes(String keyword, Boolean activeOnly) {
        List<Route> routes = routeRepository.findAll();

        return routes.stream()
                .filter(route -> {
                    if (keyword != null && !keyword.isBlank()) {
                        String kw = keyword.toLowerCase();

                        if (!route.getOrigin().toLowerCase().contains(kw)
                                && !route.getDestination().toLowerCase().contains(kw)) {
                            return false;
                        }
                    }

                    if (Boolean.TRUE.equals(activeOnly)) {
                        return Boolean.TRUE.equals(route.getIsActive());
                    }

                    return true;
                })
                .map(route -> new RouteListResponse(
                        route.getId(),
                        route.getOrigin(),
                        route.getDestination(),
                        route.getDistanceKm(),
                        route.getEstimatedDurationMin(),
                        route.getBasePrice(),
                        route.getIsActive()))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RouteDetailResponse getRouteById(Long id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));

        return toRouteDetailResponse(route);
    }

    @Transactional
    public RouteDetailResponse createRoute(CreateRouteRequest request) {
        Route route = new Route();
        route.setOrigin(request.getOrigin());
        route.setDestination(request.getDestination());
        route.setDistanceKm(request.getDistanceKm());
        route.setEstimatedDurationMin(request.getEstimatedDurationMin());
        route.setBasePrice(request.getBasePrice());
        route.setIsActive(true);

        return toRouteDetailResponse(routeRepository.save(route));
    }

    @Transactional
    public RouteDetailResponse updateRoute(Long id, UpdateRouteRequest request) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));

        if (request.getOrigin() != null) {
            route.setOrigin(request.getOrigin());
        }

        if (request.getDestination() != null) {
            route.setDestination(request.getDestination());
        }

        if (request.getDistanceKm() != null) {
            route.setDistanceKm(request.getDistanceKm());
        }

        if (request.getEstimatedDurationMin() != null) {
            route.setEstimatedDurationMin(request.getEstimatedDurationMin());
        }

        if (request.getBasePrice() != null) {
            route.setBasePrice(request.getBasePrice());
        }

        if (request.getIsActive() != null) {
            route.setIsActive(request.getIsActive());
        }

        return toRouteDetailResponse(routeRepository.save(route));
    }

    @Transactional
    public void deleteRoute(Long id) {
        Route route = routeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Route not found with id: " + id));

        if (route.getTrips() != null && !route.getTrips().isEmpty()) {
            throw new BusinessConflictException(
                    "Không thể xóa tuyến đường vì đang có " + route.getTrips().size() + " chuyến xe liên quan");
        }

        routeRepository.delete(route);
    }

    @Transactional(readOnly = true)
    public List<TripResponse> getTrips(LocalDate date, Long routeId, Trip.TripStatus status) {
        return tripService.getTrips(date, routeId, status);
    }

    @Transactional
    public TripResponse createTrip(TripCreateRequest request) {
        return tripService.createTrip(request);
    }

    @Transactional
    public TripResponse updateTrip(Long id, TripCreateRequest request) {
        return tripService.updateTrip(id, request);
    }

    @Transactional
    public void deleteTrip(Long id) {
        tripService.deleteTrip(id);
    }

    // ==================== TRIP DETAIL ====================

    @Transactional(readOnly = true)
    public TripDetailResponse getTripById(Long id) {
        Trip trip = tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + id));

        List<Long> bookedSeatIds = ticketRepository.findBookedSeatIdsByTripId(id);
        List<Ticket> allTickets = ticketRepository.findAll().stream()
                .filter(t -> t.getTrip() != null && t.getTrip().getId().equals(id))
                .toList();

        // Fetch seats directly via repository to avoid lazy loading issues
        List<Seat> seats = List.of();
        if (trip.getBus() != null) {
            seats = seatRepository.findByBusId(trip.getBus().getId());
        }

        int totalSeats = seats.size();
        int bookedCount = bookedSeatIds.size();

        // Build seat info list
        List<TripDetailResponse.SeatInfo> seatInfos = seats.stream()
                .map(seat -> {
                    boolean isBooked = bookedSeatIds.contains(seat.getId());
                    Ticket bookedTicket = isBooked ? allTickets.stream()
                            .filter(t -> t.getSeat() != null && t.getSeat().getId().equals(seat.getId()))
                            .findFirst().orElse(null) : null;

                    String bookedBy = "";
                    String passengerName = "";
                    if (bookedTicket != null && bookedTicket.getBookedBy() != null) {
                        bookedBy = bookedTicket.getBookedBy().getUsername();
                    }
                    if (bookedTicket != null && bookedTicket.getPassenger() != null) {
                        passengerName = bookedTicket.getPassenger().getFullName();
                    }

                    return new TripDetailResponse.SeatInfo(
                            seat.getId(),
                            seat.getSeatNumber(),
                            seat.getPositionX(),
                            seat.getPositionY(),
                            isBooked,
                            bookedBy,
                            passengerName
                    );
                })
                .toList();

        // Build ticket list
        List<TripDetailResponse.TicketInfo> ticketInfos = allTickets.stream()
                .map(ticket -> {
                    String paymentMethod = null;
                    String paymentStatus = null;
                    if (ticket.getPayment() != null) {
                        paymentMethod = ticket.getPayment().getPaymentMethod().name();
                        paymentStatus = ticket.getPayment().getStatus().name();
                    }
                    return new TripDetailResponse.TicketInfo(
                            ticket.getId(),
                            ticket.getSeat() != null ? ticket.getSeat().getSeatNumber() : "",
                            ticket.getPassenger() != null ? ticket.getPassenger().getFullName() : "",
                            ticket.getPassenger() != null ? ticket.getPassenger().getPhone() : "",
                            ticket.getPrice(),
                            ticket.getStatus().name(),
                            ticket.getBookedAt(),
                            ticket.getPickupPoint(),
                            ticket.getDropoffPoint(),
                            paymentMethod,
                            paymentStatus,
                            ticket.getPaidAt()
                    );
                })
                .toList();

        // Revenue calculation
        BigDecimal estimatedRevenue = trip.getRoute() != null
                ? trip.getRoute().getBasePrice().multiply(BigDecimal.valueOf(bookedCount))
                : BigDecimal.ZERO;
        BigDecimal actualRevenue = allTickets.stream()
                .filter(t -> t.getStatus() == Ticket.TicketStatus.PAID)
                .map(Ticket::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Route info
        TripDetailResponse.RouteInfo routeInfo = null;
        if (trip.getRoute() != null) {
            routeInfo = new TripDetailResponse.RouteInfo(
                    trip.getRoute().getId(),
                    trip.getRoute().getOrigin(),
                    trip.getRoute().getDestination(),
                    trip.getRoute().getDistanceKm(),
                    trip.getRoute().getEstimatedDurationMin(),
                    trip.getRoute().getBasePrice()
            );
        }

        // Bus info
        TripDetailResponse.BusInfo busInfo = null;
        if (trip.getBus() != null) {
            busInfo = new TripDetailResponse.BusInfo(
                    trip.getBus().getId(),
                    trip.getBus().getLicensePlate(),
                    trip.getBus().getBusType().name(),
                    trip.getBus().getTotalSeats(),
                    trip.getBus().getStatus().name()
            );
        }

        return new TripDetailResponse(
                trip.getId(),
                routeInfo,
                busInfo,
                trip.getDepartureTime(),
                trip.getArrivalTime(),
                trip.getStatus(),
                trip.getActualDeparture(),
                trip.getActualArrival(),
                totalSeats,
                bookedCount,
                totalSeats - bookedCount,
                seatInfos,
                ticketInfos,
                estimatedRevenue,
                actualRevenue
        );
    }

    // ==================== TICKET MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<TicketListResponse> getTickets(String keyword, String status, Long tripId) {
        Ticket.TicketStatus ticketStatus = null;
        if (status != null && !status.isBlank()) {
            try {
                ticketStatus = Ticket.TicketStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ignored) {
            }
        }

        List<Ticket> tickets = ticketRepository.findAllWithFilters(keyword, ticketStatus, tripId);

        return tickets.stream().map(this::toTicketListResponse).toList();
    }

    @Transactional(readOnly = true)
    public TicketDetailResponse getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));

        return toTicketDetailResponse(ticket);
    }

    /**
     * Admin xác nhận vé sau khi gọi điện cho khách.
     * Chỉ vé đang ở trạng thái HOLD mới có thể xác nhận.
     * Logic payment:
     *   - Nếu vé chưa có payment row → tạo mới Payment CASH (COD) SUCCESS.
     *   - Nếu vé đã có payment (vd: khách đã mở VNPay URL trước đó nên đã có
     *     row PENDING) → KHÔNG insert row mới (vi phạm unique constraint trên
     *     payments.ticket_id), chỉ update status/paidAt để đánh dấu xác nhận.
     */
    @Transactional
    public TicketDetailResponse confirmTicket(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));

        if (ticket.getStatus() == Ticket.TicketStatus.CANCELLED) {
            throw new BusinessConflictException("Vé đã bị hủy, không thể xác nhận");
        }

        if (ticket.getStatus() != Ticket.TicketStatus.HOLD) {
            throw new BusinessConflictException("Chỉ vé đang chờ xác nhận (HOLD) mới có thể xác nhận");
        }

        if (ticket.getTrip() != null && ticket.getTrip().getDepartureTime() != null
                && LocalDateTime.now().isAfter(ticket.getTrip().getDepartureTime())) {
            throw new BusinessConflictException("Chuyến xe đã khởi hành, không thể xác nhận vé");
        }

        ticket.setStatus(Ticket.TicketStatus.CONFIRMED);
        return toTicketDetailResponse(ticketRepository.save(ticket));
    }

    @Transactional
    public TicketDetailResponse markTicketAsPaid(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));

        if (ticket.getStatus() == Ticket.TicketStatus.CANCELLED) {
            throw new BusinessConflictException("Vé đã bị hủy, không thể cập nhật");
        }

        LocalDateTime now = LocalDateTime.now();
        ticket.setStatus(Ticket.TicketStatus.PAID);
        ticket.setPaidAt(now);

        Payment payment = ticket.getPayment();
        if (payment == null) {
            payment = new Payment();
            payment.setTicket(ticket);
            payment.setAmount(ticket.getPrice());
            payment.setPaymentMethod(Payment.PaymentMethod.CASH);
            payment.setStatus(Payment.PaymentStatus.SUCCESS);
            payment.setTransactionCode("MANUAL-" + System.currentTimeMillis());
            payment.setPaidAt(now);
            ticket.setPayment(payment);
            paymentRepository.save(payment);
        } else {
            if (payment.getStatus() == Payment.PaymentStatus.FAILED || payment.getStatus() == Payment.PaymentStatus.PENDING) {
                if (payment.getPaymentMethod() == null) {
                     payment.setPaymentMethod(Payment.PaymentMethod.CASH);
                }
                payment.setStatus(Payment.PaymentStatus.SUCCESS);
                if (payment.getTransactionCode() == null) {
                     payment.setTransactionCode("MANUAL-" + System.currentTimeMillis());
                }
                payment.setPaidAt(now);
            }
            paymentRepository.save(payment);
        }

        return toTicketDetailResponse(ticketRepository.save(ticket));
    }

    // ==================== REVENUE STATISTICS ====================

    /**
     * Trả về thống kê doanh thu cho admin.
     *
     * Quy tắc (theo yêu cầu):
     *  - Vé đã được admin "xác nhận" (status = CONFIRMED và có paidAt) HOẶC vé đã
     *    thanh toán online qua VNPay (status = PAID) → được tính vào doanh thu.
     *  - Vé đang HOLD (chờ admin xác nhận) → không tính.
     *  - Vé CANCELLED / REFUNDED / EXPIRED / BOOKED → không tính.
     *
     * Thời điểm dùng để ghi nhận doanh thu = {@code ticket.paidAt} (admin xác
     * nhận lúc nào / VNPay success lúc nào), fallback về bookedAt nếu thiếu.
     */
    @Transactional(readOnly = true)
    public RevenueStatsResponse getRevenueStats() {
        List<Ticket> confirmedTickets = ticketRepository.findAll().stream()
                .filter(t -> t.getStatus() == Ticket.TicketStatus.CONFIRMED
                        || t.getStatus() == Ticket.TicketStatus.PAID)
                .collect(Collectors.toList());

        List<Ticket> pendingTickets = ticketRepository.findAll().stream()
                .filter(t -> t.getStatus() == Ticket.TicketStatus.HOLD)
                .collect(Collectors.toList());

        List<Ticket> cancelledTickets = ticketRepository.findAll().stream()
                .filter(t -> t.getStatus() == Ticket.TicketStatus.CANCELLED
                        || t.getStatus() == Ticket.TicketStatus.REFUNDED)
                .collect(Collectors.toList());

        BigDecimal totalRevenue = confirmedTickets.stream()
                .map(Ticket::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // ===== Daily revenue: 7 ngày gần nhất =====
        LocalDate today = LocalDate.now();
        List<RevenueStatsResponse.DailyRevenue> dailyRevenue = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            dailyRevenue.add(new RevenueStatsResponse.DailyRevenue(
                    day.toString(),
                    String.format("%02d/%02d", day.getDayOfMonth(), day.getMonthValue()),
                    BigDecimal.ZERO));
        }
        Map<String, BigDecimal> dailyMap = dailyRevenue.stream()
                .collect(Collectors.toMap(
                        RevenueStatsResponse.DailyRevenue::getDate,
                        RevenueStatsResponse.DailyRevenue::getAmount,
                        (a, b) -> a,
                        LinkedHashMap::new));
        for (Ticket t : confirmedTickets) {
            LocalDate paidDay = resolveRevenueDate(t).toLocalDate();
            if (!paidDay.isBefore(today.minusDays(6)) && !paidDay.isAfter(today)) {
                dailyMap.merge(paidDay.toString(),
                        t.getPrice() == null ? BigDecimal.ZERO : t.getPrice(),
                        BigDecimal::add);
            }
        }
        dailyRevenue = dailyMap.entrySet().stream()
                .map(e -> new RevenueStatsResponse.DailyRevenue(
                        e.getKey(),
                        LocalDate.parse(e.getKey())
                                .format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")),
                        e.getValue()))
                .collect(Collectors.toList());

        // ===== Weekly revenue: 12 tuần gần nhất =====
        LocalDate currentWeekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<RevenueStatsResponse.WeeklyRevenue> weeklyRevenue = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            LocalDate ws = currentWeekStart.minusWeeks(i);
            weeklyRevenue.add(new RevenueStatsResponse.WeeklyRevenue(
                    ws.toString(),
                    "Tuần " + ws.get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear()),
                    BigDecimal.ZERO));
        }
        Map<LocalDate, BigDecimal> weeklyMap = new TreeMap<>();
        for (RevenueStatsResponse.WeeklyRevenue w : weeklyRevenue) {
            weeklyMap.put(LocalDate.parse(w.getWeekStart()), w.getAmount());
        }
        for (Ticket t : confirmedTickets) {
            LocalDate paidDay = resolveRevenueDate(t).toLocalDate();
            LocalDate ws = paidDay.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            if (!ws.isBefore(currentWeekStart.minusWeeks(11)) && !ws.isAfter(currentWeekStart)) {
                weeklyMap.merge(ws, t.getPrice() == null ? BigDecimal.ZERO : t.getPrice(),
                        BigDecimal::add);
            }
        }
        weeklyRevenue = weeklyMap.entrySet().stream()
                .map(e -> new RevenueStatsResponse.WeeklyRevenue(
                        e.getKey().toString(),
                        "Tuần " + e.getKey().get(java.time.temporal.WeekFields.ISO.weekOfWeekBasedYear()),
                        e.getValue()))
                .collect(Collectors.toList());

        // ===== Monthly revenue: 12 tháng gần nhất =====
        java.time.YearMonth currentMonth = java.time.YearMonth.from(today);
        List<RevenueStatsResponse.MonthlyRevenue> monthlyRevenue = new ArrayList<>();
        for (int i = 11; i >= 0; i--) {
            java.time.YearMonth ym = currentMonth.minusMonths(i);
            monthlyRevenue.add(new RevenueStatsResponse.MonthlyRevenue(
                    ym.toString(),
                    String.format("T%02d/%d", ym.getMonthValue(), ym.getYear()),
                    BigDecimal.ZERO));
        }
        Map<String, BigDecimal> monthlyMap = new LinkedHashMap<>();
        for (RevenueStatsResponse.MonthlyRevenue m : monthlyRevenue) {
            monthlyMap.put(m.getMonth(), m.getAmount());
        }
        for (Ticket t : confirmedTickets) {
            LocalDateTime dt = resolveRevenueDate(t);
            java.time.YearMonth ym = java.time.YearMonth.from(dt.toLocalDate());
            if (!ym.isBefore(currentMonth.minusMonths(11)) && !ym.isAfter(currentMonth)) {
                monthlyMap.merge(ym.toString(),
                        t.getPrice() == null ? BigDecimal.ZERO : t.getPrice(),
                        BigDecimal::add);
            }
        }
        monthlyRevenue = monthlyMap.entrySet().stream()
                .map(e -> {
                    java.time.YearMonth ym = java.time.YearMonth.parse(e.getKey());
                    return new RevenueStatsResponse.MonthlyRevenue(
                            e.getKey(),
                            String.format("T%02d/%d", ym.getMonthValue(), ym.getYear()),
                            e.getValue());
                })
                .collect(Collectors.toList());

        // ===== Yearly revenue: 5 năm gần nhất =====
        int currentYear = today.getYear();
        List<RevenueStatsResponse.YearlyRevenue> yearlyRevenue = new ArrayList<>();
        for (int i = 4; i >= 0; i--) {
            int y = currentYear - i;
            yearlyRevenue.add(new RevenueStatsResponse.YearlyRevenue(
                    String.valueOf(y),
                    String.valueOf(y),
                    BigDecimal.ZERO));
        }
        Map<String, BigDecimal> yearlyMap = new LinkedHashMap<>();
        for (RevenueStatsResponse.YearlyRevenue y : yearlyRevenue) {
            yearlyMap.put(y.getYear(), y.getAmount());
        }
        for (Ticket t : confirmedTickets) {
            int y = resolveRevenueDate(t).getYear();
            if (y >= currentYear - 4 && y <= currentYear) {
                yearlyMap.merge(String.valueOf(y),
                        t.getPrice() == null ? BigDecimal.ZERO : t.getPrice(),
                        BigDecimal::add);
            }
        }
        yearlyRevenue = yearlyMap.entrySet().stream()
                .map(e -> new RevenueStatsResponse.YearlyRevenue(
                        e.getKey(), e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        // ===== Top xe: gom theo trip.bus.id, đếm số chuyến và doanh thu =====
        Map<Long, BusRevenueAccumulator> busAgg = new HashMap<>();
        for (Ticket t : confirmedTickets) {
            if (t.getTrip() == null || t.getTrip().getBus() == null) continue;
            Bus b = t.getTrip().getBus();
            busAgg.computeIfAbsent(b.getId(), k -> new BusRevenueAccumulator())
                    .add(t.getPrice() == null ? BigDecimal.ZERO : t.getPrice());
        }
        // Cộng số chuyến theo trip.bus
        for (Trip trip : tripRepository.findAll()) {
            if (trip.getBus() == null) continue;
            busAgg.computeIfAbsent(trip.getBus().getId(), k -> new BusRevenueAccumulator())
                    .addTrip();
        }
        List<RevenueStatsResponse.TopBusRevenue> topBuses = busAgg.entrySet().stream()
                .map(e -> {
                    Bus b = busRepository.findById(e.getKey()).orElse(null);
                    if (b == null) return null;
                    return new RevenueStatsResponse.TopBusRevenue(
                            b.getId(),
                            b.getLicensePlate(),
                            b.getBusType() != null ? b.getBusType().name() : "",
                            e.getValue().tripCount,
                            e.getValue().ticketCount,
                            e.getValue().revenue);
                })
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(RevenueStatsResponse.TopBusRevenue::getRevenue).reversed())
                .limit(10)
                .collect(Collectors.toList());

        // ===== Top tài xế: theo trip_assignments với role = DRIVER =====
        List<TripAssignment> assignments = tripAssignmentRepository.findAll();
        Map<Long, DriverAccumulator> driverAgg = new HashMap<>();
        // Đếm số chuyến được phân công
        for (TripAssignment a : assignments) {
            if (a.getAssignmentRole() != TripAssignment.AssignmentRole.DRIVER) continue;
            driverAgg.computeIfAbsent(a.getEmployeeId(), k -> new DriverAccumulator()).addTrip();
        }
        // Cộng doanh thu theo trip_id gắn với tài xế đó
        for (TripAssignment a : assignments) {
            if (a.getAssignmentRole() != TripAssignment.AssignmentRole.DRIVER) continue;
            long tripId = a.getTripId();
            BigDecimal tripRevenue = confirmedTickets.stream()
                    .filter(t -> t.getTrip() != null && t.getTrip().getId().equals(tripId))
                    .map(Ticket::getPrice)
                    .filter(java.util.Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            long ticketCount = confirmedTickets.stream()
                    .filter(t -> t.getTrip() != null && t.getTrip().getId().equals(tripId))
                    .count();
            DriverAccumulator acc = driverAgg.get(a.getEmployeeId());
            if (acc != null) {
                acc.addRevenue(tripRevenue, ticketCount);
            }
        }
        List<RevenueStatsResponse.TopDriverRevenue> topDrivers = driverAgg.entrySet().stream()
                .map(e -> {
                    Employee emp = employeeRepository.findById(e.getKey()).orElse(null);
                    if (emp == null) return null;
                    return new RevenueStatsResponse.TopDriverRevenue(
                            emp.getId(),
                            emp.getFullName(),
                            e.getValue().tripCount,
                            e.getValue().ticketCount,
                            e.getValue().revenue);
                })
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(RevenueStatsResponse.TopDriverRevenue::getRevenue).reversed())
                .limit(10)
                .collect(Collectors.toList());

        return new RevenueStatsResponse(
                totalRevenue,
                dailyRevenue,
                weeklyRevenue,
                monthlyRevenue,
                yearlyRevenue,
                topBuses,
                topDrivers,
                confirmedTickets.size(),
                pendingTickets.size(),
                cancelledTickets.size());
    }

    private LocalDateTime resolveRevenueDate(Ticket t) {
        if (t.getPaidAt() != null) return t.getPaidAt();
        if (t.getBookedAt() != null) return t.getBookedAt();
        return LocalDateTime.now();
    }

    private static class BusRevenueAccumulator {
        long tripCount = 0;
        long ticketCount = 0;
        BigDecimal revenue = BigDecimal.ZERO;

        void add(BigDecimal amount) {
            revenue = revenue.add(amount == null ? BigDecimal.ZERO : amount);
            ticketCount++;
        }

        void addTrip() {
            tripCount++;
        }
    }

    private static class DriverAccumulator {
        long tripCount = 0;
        long ticketCount = 0;
        BigDecimal revenue = BigDecimal.ZERO;

        void addTrip() {
            tripCount++;
        }

        void addRevenue(BigDecimal amount, long tickets) {
            revenue = revenue.add(amount == null ? BigDecimal.ZERO : amount);
            ticketCount += tickets;
        }
    }

    /**
     * Admin hủy vé khi không xác nhận được với khách.
     * Cho phép hủy vé HOLD hoặc CONFIRMED.
     * Ghế sẽ được giải phóng để đặt lại.
     */
    @Transactional
    public TicketDetailResponse adminCancelTicket(Long id) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Ticket not found with id: " + id));

        if (ticket.getStatus() == Ticket.TicketStatus.CANCELLED) {
            throw new BusinessConflictException("Vé đã bị hủy trước đó");
        }

        if (ticket.getStatus() == Ticket.TicketStatus.PAID) {
            throw new BusinessConflictException("Vé đã thanh toán, không thể hủy. Vui lòng hoàn tiền trước.");
        }

        if (ticket.getStatus() == Ticket.TicketStatus.REFUNDED) {
            throw new BusinessConflictException("Vé đã được hoàn tiền");
        }

        // Không cho hủy nếu chuyến đã khởi hành
        if (ticket.getTrip() != null && ticket.getTrip().getDepartureTime() != null
                && LocalDateTime.now().isAfter(ticket.getTrip().getDepartureTime())) {
            throw new BusinessConflictException("Chuyến xe đã khởi hành, không thể hủy vé");
        }

        ticket.setStatus(Ticket.TicketStatus.CANCELLED);

        return toTicketDetailResponse(ticketRepository.save(ticket));
    }

    private TicketListResponse toTicketListResponse(Ticket ticket) {
        String routeName = "";
        String busLabel = "";
        String departureTime = "";
        String tripStatus = "";
        if (ticket.getTrip() != null) {
            if (ticket.getTrip().getRoute() != null) {
                routeName = ticket.getTrip().getRoute().getOrigin() + " -> " + ticket.getTrip().getRoute().getDestination();
            }
            if (ticket.getTrip().getBus() != null) {
                busLabel = ticket.getTrip().getBus().getLicensePlate() + " - " + ticket.getTrip().getBus().getBusType();
            }
            departureTime = ticket.getTrip().getDepartureTime() != null
                    ? ticket.getTrip().getDepartureTime().toString() : "";
            tripStatus = ticket.getTrip().getStatus().name();
        }

        String passengerName = ticket.getPassenger() != null ? ticket.getPassenger().getFullName() : "";
        String passengerPhone = ticket.getPassenger() != null ? ticket.getPassenger().getPhone() : "";
        String passengerEmail = ticket.getPassenger() != null ? ticket.getPassenger().getEmail() : "";
        String bookedBy = ticket.getBookedBy() != null ? ticket.getBookedBy().getUsername() : "";

        TicketListResponse.PaymentInfo paymentInfo = null;
        if (ticket.getPayment() != null) {
            String paidAt = ticket.getPayment().getPaidAt() != null
                    ? ticket.getPayment().getPaidAt().toString() : "";
            paymentInfo = new TicketListResponse.PaymentInfo(
                    ticket.getPayment().getId(),
                    ticket.getPayment().getPaymentMethod().name(),
                    ticket.getPayment().getStatus().name(),
                    paidAt
            );
        }

        boolean canCancel = ticket.getStatus() != Ticket.TicketStatus.CANCELLED
                && ticket.getStatus() != Ticket.TicketStatus.REFUNDED;

        String seatNumber = "";
        try {
            if (ticket.getSeat() != null) {
                seatNumber = ticket.getSeat().getSeatNumber();
            }
        } catch (jakarta.persistence.EntityNotFoundException ex) {
            seatNumber = "";
        }

        return new TicketListResponse(
                ticket.getId(),
                new TicketListResponse.TripInfo(ticket.getTrip() != null ? ticket.getTrip().getId() : null,
                        routeName, busLabel, departureTime, tripStatus),
                seatNumber,
                passengerName,
                passengerPhone,
                passengerEmail,
                ticket.getPrice(),
                ticket.getStatus().name(),
                bookedBy,
                ticket.getBookedAt(),
                paymentInfo,
                canCancel,
                ticket.getPickupPoint(),
                ticket.getDropoffPoint()
        );
    }

    private TicketDetailResponse toTicketDetailResponse(Ticket ticket) {
        TicketDetailResponse.TripDetail tripDetail = null;
        if (ticket.getTrip() != null) {
            String routeName = "";
            String busLabel = "";
            if (ticket.getTrip().getRoute() != null) {
                routeName = ticket.getTrip().getRoute().getOrigin() + " -> " + ticket.getTrip().getRoute().getDestination();
            }
            if (ticket.getTrip().getBus() != null) {
                busLabel = ticket.getTrip().getBus().getLicensePlate() + " - " + ticket.getTrip().getBus().getBusType();
            }
            tripDetail = new TicketDetailResponse.TripDetail(
                    ticket.getTrip().getId(),
                    ticket.getTrip().getRoute() != null ? ticket.getTrip().getRoute().getId() : null,
                    routeName,
                    ticket.getTrip().getBus() != null ? ticket.getTrip().getBus().getId() : null,
                    busLabel,
                    ticket.getTrip().getDepartureTime(),
                    ticket.getTrip().getArrivalTime(),
                    ticket.getTrip().getStatus().name()
            );
        }

        TicketDetailResponse.SeatDetail seatDetail = null;
        if (ticket.getSeat() != null) {
            seatDetail = new TicketDetailResponse.SeatDetail(
                    ticket.getSeat().getId(),
                    ticket.getSeat().getSeatNumber(),
                    ticket.getSeat().getPositionX(),
                    ticket.getSeat().getPositionY()
            );
        }

        TicketDetailResponse.PassengerDetail passengerDetail = null;
        if (ticket.getPassenger() != null) {
            passengerDetail = new TicketDetailResponse.PassengerDetail(
                    ticket.getPassenger().getId(),
                    ticket.getPassenger().getFullName(),
                    ticket.getPassenger().getPhone(),
                    ticket.getPassenger().getEmail(),
                    ticket.getPassenger().getIdCard()
            );
        }

        TicketDetailResponse.UserDetail userDetail = null;
        if (ticket.getBookedBy() != null) {
            userDetail = new TicketDetailResponse.UserDetail(
                    ticket.getBookedBy().getId(),
                    ticket.getBookedBy().getUsername(),
                    ticket.getBookedBy().getRole() != null ? ticket.getBookedBy().getRole().getName() : ""
            );
        }

        TicketDetailResponse.PaymentDetail paymentDetail = null;
        if (ticket.getPayment() != null) {
            paymentDetail = new TicketDetailResponse.PaymentDetail(
                    ticket.getPayment().getId(),
                    ticket.getPayment().getAmount(),
                    ticket.getPayment().getPaymentMethod().name(),
                    ticket.getPayment().getStatus().name(),
                    ticket.getPayment().getTransactionCode(),
                    ticket.getPayment().getPaidAt()
            );
        }

        return new TicketDetailResponse(
                ticket.getId(),
                tripDetail,
                seatDetail,
                passengerDetail,
                ticket.getPrice(),
                ticket.getStatus().name(),
                userDetail,
                ticket.getBookedAt(),
                ticket.getPaidAt(),
                paymentDetail
        );
    }

    private UserListResponse toUserListResponse(User user) {
        UserListResponse response = new UserListResponse();

        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setPhone(user.getPhone());
        response.setRole(RoleNormalizer.normalize(user.getRole().getName()));
        response.setStatus(user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
        response.setCreatedAt(user.getCreatedAt());

        Optional<Passenger> passenger = passengerRepository.findByUserId(user.getId());
        if (passenger.isPresent()) {
            response.setFullName(passenger.get().getFullName());
        }

        return response;
    }

    private UserDetailResponse toUserDetailResponse(User user) {
        UserDetailResponse response = new UserDetailResponse();

        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setPhone(user.getPhone());
        response.setRole(RoleNormalizer.normalize(user.getRole().getName()));
        response.setStatus(user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
        response.setCreatedAt(user.getCreatedAt());
        response.setPermissions(List.of());

        Optional<Passenger> passenger = passengerRepository.findByUserId(user.getId());
        if (passenger.isPresent()) {
            response.setFullName(passenger.get().getFullName());
        }

        return response;
    }

    private BusDetailResponse toBusDetailResponse(Bus bus) {
        int tripCount = bus.getTrips() != null ? bus.getTrips().size() : 0;

        return new BusDetailResponse(
                bus.getId(),
                bus.getLicensePlate(),
                bus.getBusType() != null ? bus.getBusType().name() : "",
                bus.getTotalSeats(),
                bus.getStatus().name(),
                bus.getLastMaintenanceDate(),
                bus.getInsuranceExpiry(),
                tripCount);
    }

    private RouteDetailResponse toRouteDetailResponse(Route route) {
        int tripCount = route.getTrips() != null ? route.getTrips().size() : 0;

        return new RouteDetailResponse(
                route.getId(),
                route.getOrigin(),
                route.getDestination(),
                route.getDistanceKm(),
                route.getEstimatedDurationMin(),
                route.getBasePrice(),
                route.getIsActive(),
                tripCount);
    }
}