package com.business.busmanagement.config;

import com.business.busmanagement.model.Bus;
import com.business.busmanagement.model.Employee;
import com.business.busmanagement.model.Role;
import com.business.busmanagement.model.Route;
import com.business.busmanagement.model.User;
import com.business.busmanagement.repository.BusRepository;
import com.business.busmanagement.repository.EmployeeRepository;
import com.business.busmanagement.repository.RoleRepository;
import com.business.busmanagement.repository.RouteRepository;
import com.business.busmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
@Slf4j
@Order(1)
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final BusRepository busRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.default-password:ChangeMe@123}")
    private String defaultSeedPassword;

    @Override
    public void run(String... args) {
        initializeRoles();
        initializeUsers();
        initializeRoutes();
        initializeBuses();
        initializeEmployees();

        log.info("Data initialization completed");
    }

    private void initializeRoles() {
        ensureRole("ADMIN", "Administrator with full access");
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

        ensureUser("admin", "admin@bus.com", adminRole);

        log.info("Users initialized");
    }

   private User ensureUser(String username, String email, Role role) {
        return userRepository.findByUsername(username)
                .map(existingUser -> {
                    // Cập nhật các thông tin cơ bản
                    existingUser.setEmail(email);
                    existingUser.setRole(role);
                    
                    // THÊM DÒNG NÀY: Luôn ép mã hóa và cập nhật lại mật khẩu thành ChangeMe@123
                    existingUser.setPasswordHash(passwordEncoder.encode(defaultSeedPassword));

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

    private void initializeEmployees() {
        if (employeeRepository.count() == 0) {
            // 5 Tài xế kinh nghiệm cao (VIP)
            Object[][] experiencedDrivers = {
                {"Nguyễn Văn Minh", "Hà Nội", 15, LocalDate.of(2008, 3, 15)},
                {"Trần Đình Cường", "TP.HCM", 14, LocalDate.of(2009, 6, 20)},
                {"Lê Hồng Sơn", "Đà Nẵng", 13, LocalDate.of(2010, 1, 10)},
                {"Phạm Quốc Việt", "Hải Phòng", 12, LocalDate.of(2011, 9, 5)},
                {"Hoàng Minh Tuấn", "Cần Thơ", 11, LocalDate.of(2012, 4, 25)}
            };

            // Các tài xế khác
            String[] otherDrivers = {
                "Đặng Văn Phong", "Vũ Văn Thành", "Bùi Văn Quang",
                "Đỗ Văn Sơn", "Ngô Văn Tài"
            };
            String[] driverHometowns = {
                "Thanh Hóa", "Nghệ An", "Hà Tĩnh", "Quảng Bình", "Huế"
            };

            // Tài xế kinh nghiệm cao
            for (Object[] driver : experiencedDrivers) {
                Employee emp = new Employee();
                emp.setFullName((String) driver[0]);
                emp.setHometown((String) driver[1]);
                emp.setExperienceYears((Integer) driver[2]);
                emp.setJoinDate((LocalDate) driver[3]);
                emp.setPhone("090" + String.format("%07d", (int)(Math.random() * 10000000)));
                emp.setEmployeeType(Employee.EmployeeType.DRIVER);
                emp.setStatus(Employee.Status.ACTIVE);
                employeeRepository.save(emp);
            }

            // Các tài xế khác
            for (int i = 0; i < otherDrivers.length; i++) {
                Employee emp = new Employee();
                emp.setFullName(otherDrivers[i]);
                emp.setHometown(driverHometowns[i]);
                emp.setExperienceYears(3 + (int)(Math.random() * 5));
                emp.setJoinDate(LocalDate.of(2018 + (int)(Math.random() * 5), 1 + (int)(Math.random() * 12), 1 + (int)(Math.random() * 28)));
                emp.setPhone("090" + String.format("%07d", (int)(Math.random() * 10000000)));
                emp.setEmployeeType(Employee.EmployeeType.DRIVER);
                emp.setStatus(Employee.Status.ACTIVE);
                employeeRepository.save(emp);
            }

            // Phụ xe
            String[] assistants = {
                "Lý Thị Hương", "Trương Thị Lan", "Phan Thị Mai",
                "Cao Thị Ngọc", "Đinh Thị Oanh", "Hứa Thị Phương",
                "Châu Thị Quỳnh", "Thái Thị Thu", "Phùng Thị Vy", "Đoàn Thị Xinh"
            };
            String[] assistantHometowns = {
                "Nam Định", "Thái Bình", "Hưng Yên", "Bắc Ninh", "Vĩnh Phúc",
                "Bắc Giang", "Hải Dương", "Ninh Bình", "Hà Nam", "Sơn La"
            };

            for (int i = 0; i < assistants.length; i++) {
                Employee emp = new Employee();
                emp.setFullName(assistants[i]);
                emp.setHometown(assistantHometowns[i]);
                emp.setExperienceYears(1 + (int)(Math.random() * 6));
                emp.setJoinDate(LocalDate.of(2019 + (int)(Math.random() * 5), 1 + (int)(Math.random() * 12), 1 + (int)(Math.random() * 28)));
                emp.setPhone("091" + String.format("%07d", (int)(Math.random() * 10000000)));
                emp.setEmployeeType(Employee.EmployeeType.ASSISTANT);
                emp.setStatus(Employee.Status.ACTIVE);
                employeeRepository.save(emp);
            }

            log.info("Employees initialized: {} drivers (including {} experienced), {} assistants",
                experiencedDrivers.length + otherDrivers.length, experiencedDrivers.length, assistants.length);
        }
    }
}