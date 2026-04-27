package com.business.busmanagement.config;

import com.business.busmanagement.model.*;
import com.business.busmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RouteRepository routeRepository;
    private final BusRepository busRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.default-password:ChangeMe@123}")
    private String defaultSeedPassword;

    @Override
    public void run(String... args) throws Exception {
        initializeRoles();
        initializeUsers();
        initializeRoutes();
        initializeBuses();

        log.info("Data initialization completed");
    }

    private void initializeRoles() {
        ensureRole("ADMIN", "Administrator with full access");
        ensureRole("STAFF", "Operational staff with dispatch, reporting, maintenance and ticket access");
        ensureRole("CUSTOMER", "Customer account");

        log.info("Roles initialization checked/completed");
    }

    private void ensureRole(String roleName, String description) {
        if (roleRepository.findByName(roleName).isPresent()) {
            return;
        }

        Role role = new Role();
        role.setName(roleName);
        role.setDescription(description);
        roleRepository.save(role);
    }

    private void initializeUsers() {
        Role adminRole = roleRepository.findByName("ADMIN").orElseThrow();
        Role staffRole = roleRepository.findByName("STAFF").orElseThrow();

        User admin = ensureUser("admin", "admin@bus.com", adminRole);
        User dispatcher = ensureUser("dispatcher", "dispatcher@bus.com", staffRole);
        User manager = ensureUser("manager", "manager@bus.com", staffRole);
        User driver = ensureUser("driver1", "driver1@bus.com", staffRole);
        User assistant = ensureUser("assistant1", "assistant1@bus.com", staffRole);

        ensureEmployee(dispatcher, "Lê Quốc Huy", Employee.EmployeeType.DISPATCHER);
        ensureEmployee(manager, "Phạm Minh Anh", Employee.EmployeeType.MANAGER);
        ensureEmployee(driver, "Nguyễn Văn Tài", Employee.EmployeeType.DRIVER);
        ensureEmployee(assistant, "Trần Thị Hương", Employee.EmployeeType.ASSISTANT);

        log.info("Users and employees initialized with configured seed password");
    }

    private User ensureUser(String username, String email, Role role) {
        return userRepository.findByUsername(username)
                .map(existingUser -> {
                    existingUser.setEmail(email);
                    existingUser.setRole(role);

                    if (existingUser.getStatus() == null) {
                        existingUser.setStatus(User.UserStatus.ACTIVE);
                    }

                    return userRepository.save(existingUser);
                })
                .orElseGet(() -> {
                    User user = new User();
                    user.setUsername(username);
                    user.setEmail(email);
                    user.setRole(role);
                    user.setStatus(User.UserStatus.ACTIVE);
                    user.setPasswordHash(passwordEncoder.encode(defaultSeedPassword));
                    return userRepository.save(user);
                });
    }

    private void ensureEmployee(User user, String fullName, Employee.EmployeeType employeeType) {
        Employee employee = employeeRepository.findByUserId(user.getId()).orElseGet(Employee::new);
        employee.setUser(user);
        employee.setFullName(fullName);
        employee.setEmployeeType(employeeType);
        employee.setStatus(Employee.EmployeeStatus.ACTIVE);
        employeeRepository.save(employee);
    }

    private void initializeRoutes() {
        if (routeRepository.count() == 0) {
            Route route1 = new Route();
            route1.setOrigin("Hà Nội");
            route1.setDestination("TP.HCM");
            route1.setDistanceKm(new BigDecimal("1700"));
            route1.setEstimatedDurationMin(2400);
            route1.setBasePrice(new BigDecimal("500000"));
            route1.setIsActive(true);

            Route route2 = new Route();
            route2.setOrigin("Hà Nội");
            route2.setDestination("Đà Nẵng");
            route2.setDistanceKm(new BigDecimal("800"));
            route2.setEstimatedDurationMin(1200);
            route2.setBasePrice(new BigDecimal("300000"));
            route2.setIsActive(true);

            Route route3 = new Route();
            route3.setOrigin("TP.HCM");
            route3.setDestination("Đà Nẵng");
            route3.setDistanceKm(new BigDecimal("900"));
            route3.setEstimatedDurationMin(1300);
            route3.setBasePrice(new BigDecimal("350000"));
            route3.setIsActive(true);

            Route route4 = new Route();
            route4.setOrigin("Hà Nội");
            route4.setDestination("Hải Phòng");
            route4.setDistanceKm(new BigDecimal("100"));
            route4.setEstimatedDurationMin(120);
            route4.setBasePrice(new BigDecimal("80000"));
            route4.setIsActive(true);

            Arrays.asList(route1, route2, route3, route4).forEach(routeRepository::save);

            log.info("Routes initialized");
        }
    }

    private void initializeBuses() {
        if (busRepository.count() == 0) {
            Bus bus1 = new Bus();
            bus1.setLicensePlate("29A-12345");
            bus1.setBusType(Bus.BusType.SLEEPER);
            bus1.setTotalSeats(40);
            bus1.setStatus(Bus.BusStatus.AVAILABLE);

            Bus bus2 = new Bus();
            bus2.setLicensePlate("30A-67890");
            bus2.setBusType(Bus.BusType.SEAT);
            bus2.setTotalSeats(45);
            bus2.setStatus(Bus.BusStatus.AVAILABLE);

            Bus bus3 = new Bus();
            bus3.setLicensePlate("51A-11111");
            bus3.setBusType(Bus.BusType.LIMOUSINE);
            bus3.setTotalSeats(30);
            bus3.setStatus(Bus.BusStatus.AVAILABLE);

            Arrays.asList(bus1, bus2, bus3).forEach(busRepository::save);

            log.info("Buses initialized");
        }
    }
}
