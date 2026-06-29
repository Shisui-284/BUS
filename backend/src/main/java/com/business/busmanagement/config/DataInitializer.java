package com.business.busmanagement.config;

/* ============================================================
 * Chạy khi app start (CommandLineRunner):
 *   - Tạo roles (ADMIN, CUSTOMER, DISPATCHER)
 *   - Tạo user mặc định (admin/admin123, dispatcher/ChangeMe@123)
 *   - Seed Bus + Route mẫu để demo
 * ============================================================ */

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
            // ============== 20 XE KHÁCH THỰC TẾ ==============
            
            // === LIMOUSINE (28 chỗ cao cấp) ===
            Bus limo1 = createBus("29B-111.11", Bus.BusType.LIMOUSINE, 28, Bus.BusStatus.AVAILABLE);
            Bus limo2 = createBus("30B-222.22", Bus.BusType.LIMOUSINE, 28, Bus.BusStatus.AVAILABLE);
            Bus limo3 = createBus("51B-333.33", Bus.BusType.LIMOUSINE, 28, Bus.BusStatus.AVAILABLE);
            Bus limo4 = createBus("43B-444.44", Bus.BusType.LIMOUSINE, 28, Bus.BusStatus.AVAILABLE);
            Bus limo5 = createBus("88B-555.55", Bus.BusType.LIMOUSINE, 28, Bus.BusStatus.AVAILABLE);
            
            // === GIƯỜNG NẰM CAO CẤP (34 chỗ) ===
            Bus sleeper1 = createBus("29A-100.01", Bus.BusType.SLEEPER, 34, Bus.BusStatus.AVAILABLE);
            Bus sleeper2 = createBus("30A-200.02", Bus.BusType.SLEEPER, 34, Bus.BusStatus.AVAILABLE);
            Bus sleeper3 = createBus("51A-300.03", Bus.BusType.SLEEPER, 34, Bus.BusStatus.AVAILABLE);
            Bus sleeper4 = createBus("43A-400.04", Bus.BusType.SLEEPER, 34, Bus.BusStatus.MAINTENANCE);
            Bus sleeper5 = createBus("17A-500.05", Bus.BusType.SLEEPER, 34, Bus.BusStatus.AVAILABLE);
            
            // === GIƯỜNG NẰM THƯỜNG (40 chỗ) ===
            Bus bed40_1 = createBus("29C-1111.1", Bus.BusType.SLEEPER, 40, Bus.BusStatus.AVAILABLE);
            Bus bed40_2 = createBus("30C-2222.2", Bus.BusType.SLEEPER, 40, Bus.BusStatus.AVAILABLE);
            Bus bed40_3 = createBus("51C-3333.3", Bus.BusType.SLEEPER, 40, Bus.BusStatus.AVAILABLE);
            Bus bed40_4 = createBus("72C-4444.4", Bus.BusType.SLEEPER, 40, Bus.BusStatus.AVAILABLE);
            Bus bed40_5 = createBus("15C-5555.5", Bus.BusType.SLEEPER, 40, Bus.BusStatus.RUNNING);
            
            // === GHẾ NGỒI CAO CẤP (45 chỗ) ===
            Bus seat1 = createBus("29D-777.77", Bus.BusType.SEAT, 45, Bus.BusStatus.AVAILABLE);
            Bus seat2 = createBus("30D-888.88", Bus.BusType.SEAT, 45, Bus.BusStatus.AVAILABLE);
            Bus seat3 = createBus("51D-999.99", Bus.BusType.SEAT, 45, Bus.BusStatus.AVAILABLE);
            Bus seat4 = createBus("18D-101.10", Bus.BusType.SEAT, 45, Bus.BusStatus.AVAILABLE);
            Bus seat5 = createBus("16D-202.20", Bus.BusType.SEAT, 45, Bus.BusStatus.MAINTENANCE);
            
            // === GHẾ NGỒI THƯỜNG (50 chỗ) ===
            Bus seat50_1 = createBus("29E-303.30", Bus.BusType.SEAT, 50, Bus.BusStatus.AVAILABLE);
            
            Arrays.asList(
                limo1, limo2, limo3, limo4, limo5,
                sleeper1, sleeper2, sleeper3, sleeper4, sleeper5,
                bed40_1, bed40_2, bed40_3, bed40_4, bed40_5,
                seat1, seat2, seat3, seat4, seat5,
                seat50_1
            ).forEach(busRepository::save);

            log.info("Buses initialized: 5 Limousine, 5 Giường nằm cao cấp, 5 Giường nằm thường, 4 Ghế ngồi cao cấp, 1 Ghế ngồi thường = 20 xe");
        }
    }
    
    private Bus createBus(String licensePlate, Bus.BusType type, int seats, Bus.BusStatus status) {
        Bus bus = new Bus();
        bus.setLicensePlate(licensePlate);
        bus.setBusType(type);
        bus.setTotalSeats(seats);
        bus.setStatus(status);
        return bus;
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