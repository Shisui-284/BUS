package com.business.busmanagement.service;

import com.business.busmanagement.dto.admin.*;
import com.business.busmanagement.exception.BusinessConflictException;
import com.business.busmanagement.exception.ResourceNotFoundException;
import com.business.busmanagement.model.*;
import com.business.busmanagement.repository.*;
import com.business.busmanagement.util.RoleNormalizer;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EmployeeRepository employeeRepository;
    private final PassengerRepository passengerRepository;
    private final BusRepository busRepository;
    private final RouteRepository routeRepository;
    private final TripRepository tripRepository;
    private final SeatRepository seatRepository;
    private final PasswordEncoder passwordEncoder;

    // ==================== DASHBOARD ====================

    public AdminDashboardResponse getDashboard() {
        long totalUsers = userRepository.count();
        long totalBuses = busRepository.count();
        long totalRoutes = routeRepository.count();

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        long todayTrips = tripRepository.searchTrips(startOfDay, endOfDay, null, null).size();

        List<Role> roles = roleRepository.findAll();
        List<AdminDashboardResponse.RoleCount> roleDistribution = roles.stream()
                .map(r -> new AdminDashboardResponse.RoleCount(
                        RoleNormalizer.normalize(r.getName()),
                        userRepository.countByRoleId(r.getId())
                ))
                .filter(rc -> rc.getCount() > 0)
                .collect(Collectors.toList());

        List<Bus> allBuses = busRepository.findAll();
        List<AdminDashboardResponse.BusStatusCount> busStatusDistribution = allBuses.stream()
                .collect(Collectors.groupingBy(b -> b.getStatus().name()))
                .entrySet().stream()
                .map(e -> new AdminDashboardResponse.BusStatusCount(e.getKey(), e.getValue().size()))
                .collect(Collectors.toList());

        List<AdminDashboardResponse.BusInsuranceAlert> insuranceAlerts = buildInsuranceAlerts(allBuses);

        return new AdminDashboardResponse(
                totalUsers, totalBuses, totalRoutes, todayTrips,
                roleDistribution, busStatusDistribution, insuranceAlerts
        );
    }

    private List<AdminDashboardResponse.BusInsuranceAlert> buildInsuranceAlerts(List<Bus> buses) {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysLater = today.plusDays(30);
        List<AdminDashboardResponse.BusInsuranceAlert> alerts = new ArrayList<>();

        for (Bus bus : buses) {
            if (bus.getInsuranceExpiry() == null) continue;

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
                    alertType
            ));
        }
        return alerts;
    }

    // ==================== USER MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<UserListResponse> getUsers(String keyword, String role, String status) {
        List<User> users;
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.toLowerCase();
            users = userRepository.findAll().stream()
                    .filter(u -> u.getUsername().toLowerCase().contains(kw)
                            || (u.getEmail() != null && u.getEmail().toLowerCase().contains(kw)))
                    .collect(Collectors.toList());
        } else {
            users = userRepository.findAll();
        }

        return users.stream()
                .filter(u -> {
                    if (role != null && !role.isBlank()) {
                        String normalizedRole = RoleNormalizer.normalize(u.getRole().getName());
                        if (!role.equalsIgnoreCase(normalizedRole)) return false;
                    }
                    if (status != null && !status.isBlank()) {
                        if (u.getStatus() == null || !u.getStatus().name().equalsIgnoreCase(status)) return false;
                    }
                    return true;
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

        if ("STAFF".equalsIgnoreCase(request.getRole())) {
            Employee emp = new Employee();
            emp.setUser(saved);
            emp.setFullName(request.getUsername());
            emp.setPhone(request.getPhone());
            emp.setEmployeeType(Employee.EmployeeType.DISPATCHER);
            emp.setStatus(Employee.EmployeeStatus.ACTIVE);
            employeeRepository.save(emp);
        }

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

        Optional<Employee> empOpt = employeeRepository.findByUserId(id);
        if (empOpt.isPresent()) {
            Employee emp = empOpt.get();
            if (request.getFullName() != null) emp.setFullName(request.getFullName());
            if (request.getEmployeeType() != null) {
                try {
                    emp.setEmployeeType(Employee.EmployeeType.valueOf(request.getEmployeeType().toUpperCase()));
                } catch (IllegalArgumentException ignored) {}
            }
            employeeRepository.save(emp);
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

    // ==================== BUS MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<BusListResponse> getBuses(String keyword, String status) {
        List<Bus> buses;
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.toLowerCase();
            buses = busRepository.findAll().stream()
                    .filter(b -> b.getLicensePlate().toLowerCase().contains(kw))
                    .collect(Collectors.toList());
        } else {
            buses = busRepository.findAll();
        }

        LocalDate today = LocalDate.now();
        LocalDate thirtyDays = today.plusDays(30);

        return buses.stream()
                .filter(b -> {
                    if (status != null && !status.isBlank()) {
                        return b.getStatus().name().equalsIgnoreCase(status);
                    }
                    return true;
                })
                .map(b -> new BusListResponse(
                        b.getId(),
                        b.getLicensePlate(),
                        b.getBusType() != null ? b.getBusType().name() : "",
                        b.getTotalSeats(),
                        b.getStatus().name(),
                        b.getLastMaintenanceDate(),
                        b.getInsuranceExpiry(),
                        b.getInsuranceExpiry() != null && b.getInsuranceExpiry().isBefore(today),
                        b.getInsuranceExpiry() != null && !b.getInsuranceExpiry().isBefore(today) && b.getInsuranceExpiry().isBefore(thirtyDays)
                ))
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
        if (busRepository.findAll().stream()
                .anyMatch(b -> b.getLicensePlate().equalsIgnoreCase(request.getLicensePlate()))) {
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

    // ==================== ROUTE MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<RouteListResponse> getRoutes(String keyword, Boolean activeOnly) {
        List<Route> routes = routeRepository.findAll();

        return routes.stream()
                .filter(r -> {
                    if (keyword != null && !keyword.isBlank()) {
                        String kw = keyword.toLowerCase();
                        if (!r.getOrigin().toLowerCase().contains(kw)
                                && !r.getDestination().toLowerCase().contains(kw)) {
                            return false;
                        }
                    }
                    if (Boolean.TRUE.equals(activeOnly)) {
                        return Boolean.TRUE.equals(r.getIsActive());
                    }
                    return true;
                })
                .map(r -> new RouteListResponse(
                        r.getId(),
                        r.getOrigin(),
                        r.getDestination(),
                        r.getDistanceKm(),
                        r.getEstimatedDurationMin(),
                        r.getBasePrice(),
                        r.getIsActive()
                ))
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

        if (request.getOrigin() != null) route.setOrigin(request.getOrigin());
        if (request.getDestination() != null) route.setDestination(request.getDestination());
        if (request.getDistanceKm() != null) route.setDistanceKm(request.getDistanceKm());
        if (request.getEstimatedDurationMin() != null) route.setEstimatedDurationMin(request.getEstimatedDurationMin());
        if (request.getBasePrice() != null) route.setBasePrice(request.getBasePrice());
        if (request.getIsActive() != null) route.setIsActive(request.getIsActive());

        return toRouteDetailResponse(routeRepository.save(route));
    }

    // ==================== HELPERS ====================

    private UserListResponse toUserListResponse(User user) {
        UserListResponse r = new UserListResponse();
        r.setId(user.getId());
        r.setUsername(user.getUsername());
        r.setEmail(user.getEmail());
        r.setPhone(user.getPhone());
        r.setRole(RoleNormalizer.normalize(user.getRole().getName()));
        r.setStatus(user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
        r.setCreatedAt(user.getCreatedAt());

        Optional<Employee> emp = employeeRepository.findByUserId(user.getId());
        if (emp.isPresent()) {
            r.setFullName(emp.get().getFullName());
            r.setEmployeeType(emp.get().getEmployeeType().name());
        } else {
            Optional<Passenger> pass = passengerRepository.findByUserId(user.getId());
            if (pass.isPresent()) {
                r.setFullName(pass.get().getFullName());
                r.setEmployeeType("CUSTOMER");
            }
        }
        return r;
    }

    private UserDetailResponse toUserDetailResponse(User user) {
        UserDetailResponse r = new UserDetailResponse();
        r.setId(user.getId());
        r.setUsername(user.getUsername());
        r.setEmail(user.getEmail());
        r.setPhone(user.getPhone());
        r.setRole(RoleNormalizer.normalize(user.getRole().getName()));
        r.setStatus(user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
        r.setCreatedAt(user.getCreatedAt());
        r.setPermissions(List.of());

        Optional<Employee> emp = employeeRepository.findByUserId(user.getId());
        if (emp.isPresent()) {
            r.setFullName(emp.get().getFullName());
            r.setEmployeeType(emp.get().getEmployeeType().name());
        } else {
            Optional<Passenger> pass = passengerRepository.findByUserId(user.getId());
            if (pass.isPresent()) {
                r.setFullName(pass.get().getFullName());
                r.setEmployeeType("CUSTOMER");
            }
        }
        return r;
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
                tripCount
        );
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
                tripCount
        );
    }
}
