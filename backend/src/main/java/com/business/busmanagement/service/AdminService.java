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

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboard() {
        long totalUsers = userRepository.count();
        long totalBuses = busRepository.count();
        long totalRoutes = routeRepository.count();

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        long todayTrips = tripRepository.searchTrips(startOfDay, endOfDay, null, null).size();

        List<Role> roles = roleRepository.findAll();
        List<AdminDashboardResponse.RoleCount> roleDistribution = roles.stream()
                .map(role -> new AdminDashboardResponse.RoleCount(
                        RoleNormalizer.normalize(role.getName()),
                        userRepository.countByRoleId(role.getId())))
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

        if ("STAFF".equalsIgnoreCase(request.getRole())) {
            Employee employee = new Employee();
            employee.setUser(saved);
            employee.setFullName(request.getUsername());
            employee.setPhone(request.getPhone());
            employee.setEmployeeType(Employee.EmployeeType.DISPATCHER);
            employee.setStatus(Employee.EmployeeStatus.ACTIVE);
            employeeRepository.save(employee);
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

        Optional<Employee> employeeOptional = employeeRepository.findByUserId(id);

        if (employeeOptional.isPresent()) {
            Employee employee = employeeOptional.get();

            if (request.getFullName() != null) {
                employee.setFullName(request.getFullName());
            }

            if (request.getEmployeeType() != null) {
                try {
                    employee.setEmployeeType(Employee.EmployeeType.valueOf(request.getEmployeeType().toUpperCase()));
                } catch (IllegalArgumentException ignored) {
                    // Ignore invalid employee type.
                }
            }

            employeeRepository.save(employee);
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

    // ==================== HELPERS ====================

    private UserListResponse toUserListResponse(User user) {
        UserListResponse response = new UserListResponse();

        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setPhone(user.getPhone());
        response.setRole(RoleNormalizer.normalize(user.getRole().getName()));
        response.setStatus(user.getStatus() != null ? user.getStatus().name() : "ACTIVE");
        response.setCreatedAt(user.getCreatedAt());

        Optional<Employee> employee = employeeRepository.findByUserId(user.getId());

        if (employee.isPresent()) {
            response.setFullName(employee.get().getFullName());
            response.setEmployeeType(employee.get().getEmployeeType().name());
        } else {
            Optional<Passenger> passenger = passengerRepository.findByUserId(user.getId());

            if (passenger.isPresent()) {
                response.setFullName(passenger.get().getFullName());
                response.setEmployeeType("CUSTOMER");
            }
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

        Optional<Employee> employee = employeeRepository.findByUserId(user.getId());

        if (employee.isPresent()) {
            response.setFullName(employee.get().getFullName());
            response.setEmployeeType(employee.get().getEmployeeType().name());
        } else {
            Optional<Passenger> passenger = passengerRepository.findByUserId(user.getId());

            if (passenger.isPresent()) {
                response.setFullName(passenger.get().getFullName());
                response.setEmployeeType("CUSTOMER");
            }
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