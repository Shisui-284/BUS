-- ============================================================
-- BUS MANAGEMENT SYSTEM - Full Database Schema & Seed Data
-- MySQL 8.0
-- Database: bus_management_db
-- Exported: 2026-06-29
-- ============================================================

DROP DATABASE IF EXISTS bus_management_db;
CREATE DATABASE bus_management_db
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bus_management_db;

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE roles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email         VARCHAR(255) UNIQUE,
    phone         VARCHAR(50),
    role_id       BIGINT,
    status        ENUM('ACTIVE', 'INACTIVE', 'LOCKED') DEFAULT 'ACTIVE',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES roles(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_users_role_id (role_id),
    INDEX idx_users_status  (status),
    INDEX idx_users_email   (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE audit_logs (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT,
    action     VARCHAR(20),
    table_name VARCHAR(50),
    record_id  BIGINT,
    old_values JSON,
    new_values JSON,
    timestamp  DATETIME DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_user_id   (user_id),
    INDEX idx_audit_table     (table_name),
    INDEX idx_audit_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: buses
-- ============================================================
CREATE TABLE buses (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    license_plate         VARCHAR(255) NOT NULL UNIQUE,
    bus_type              ENUM('LIMOUSINE', 'SLEEPER', 'SEAT'),
    total_seats           INT NOT NULL,
    status                ENUM('AVAILABLE', 'RUNNING', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    last_maintenance_date DATE,
    insurance_expiry      DATE,

    INDEX idx_buses_status    (status),
    INDEX idx_buses_type      (bus_type),
    INDEX idx_buses_insurance (insurance_expiry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: routes
-- ============================================================
CREATE TABLE routes (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    origin                 VARCHAR(255) NOT NULL,
    destination            VARCHAR(255) NOT NULL,
    distance_km            DECIMAL(10,2) NOT NULL,
    estimated_duration_min INT NOT NULL,
    base_price             DECIMAL(10,2) NOT NULL,
    is_active              BOOLEAN DEFAULT TRUE,

    INDEX idx_routes_origin      (origin),
    INDEX idx_routes_destination (destination),
    INDEX idx_routes_active     (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: seats
-- ============================================================
CREATE TABLE seats (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    bus_id      BIGINT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    position_x  INT,
    position_y  INT,

    CONSTRAINT fk_seats_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    UNIQUE KEY uk_seats_bus_seat (bus_id, seat_number),
    INDEX idx_seats_bus_id (bus_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: employees
-- ============================================================
CREATE TABLE employees (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT,
    full_name        VARCHAR(255) NOT NULL,
    phone            VARCHAR(50),
    hometown         VARCHAR(255),
    experience_years INT,
    join_date        DATE,
    employee_type    ENUM('DRIVER', 'ASSISTANT', 'TECHNICIAN', 'DISPATCHER', 'MANAGER') NOT NULL,
    status           ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',

    INDEX idx_emp_type  (employee_type),
    INDEX idx_emp_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: passengers
-- ============================================================
CREATE TABLE passengers (
    id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id   BIGINT,
    full_name VARCHAR(255) NOT NULL,
    phone     VARCHAR(50) NOT NULL,
    email     VARCHAR(255),
    id_card   VARCHAR(50),

    CONSTRAINT fk_passengers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_pass_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: trips
-- ============================================================
CREATE TABLE trips (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id         BIGINT,
    bus_id           BIGINT,
    departure_time   DATETIME NOT NULL,
    arrival_time     DATETIME,
    status           ENUM('SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'DELAYED')
                     DEFAULT 'SCHEDULED',
    actual_departure DATETIME,
    actual_arrival   DATETIME,

    CONSTRAINT fk_trips_route
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_trips_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_trips_route_id     (route_id),
    INDEX idx_trips_bus_id       (bus_id),
    INDEX idx_trips_departure   (departure_time),
    INDEX idx_trips_status      (status),
    INDEX idx_trips_route_status(route_id, status, departure_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: trip_assignments
-- ============================================================
CREATE TABLE trip_assignments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id         BIGINT NOT NULL,
    employee_id     BIGINT NOT NULL,
    assignment_role ENUM('DRIVER', 'ASSISTANT') NOT NULL,

    INDEX idx_ta_trip_id     (trip_id),
    INDEX idx_ta_employee_id (employee_id),
    UNIQUE KEY uk_ta_trip_employee_role (trip_id, employee_id, assignment_role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: tickets
-- ============================================================
CREATE TABLE tickets (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id       BIGINT,
    seat_id       BIGINT,
    passenger_id  BIGINT,
    price         DECIMAL(10,2) NOT NULL,
    status        ENUM('BOOKED', 'HOLD', 'CONFIRMED', 'EXPIRED', 'PAID', 'CANCELLED', 'REFUNDED')
                  NOT NULL DEFAULT 'BOOKED',
    booked_by     BIGINT,
    booked_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at       DATETIME,
    pickup_point  VARCHAR(500),
    dropoff_point VARCHAR(500),

    CONSTRAINT fk_tickets_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_tickets_seat
        FOREIGN KEY (seat_id) REFERENCES seats(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_tickets_passenger
        FOREIGN KEY (passenger_id) REFERENCES passengers(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_tickets_booked_by
        FOREIGN KEY (booked_by) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    UNIQUE KEY uk_tickets_trip_seat (trip_id, seat_id),
    INDEX idx_tickets_trip_id   (trip_id),
    INDEX idx_tickets_seat_id    (seat_id),
    INDEX idx_tickets_status    (status),
    INDEX idx_tickets_booked_by (booked_by),
    INDEX idx_tickets_paid      (paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: payments
-- ============================================================
CREATE TABLE payments (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id          BIGINT UNIQUE,
    amount             DECIMAL(10,2) NOT NULL,
    payment_method     ENUM('CASH', 'CARD', 'MOMO', 'BANK', 'VNPAY') NOT NULL,
    status             ENUM('PENDING', 'SUCCESS', 'FAILED') NOT NULL DEFAULT 'PENDING',
    transaction_code   VARCHAR(100),
    paid_at            DATETIME,
    vnp_txn_ref        VARCHAR(100),
    vnp_transaction_no VARCHAR(50),
    vnp_bank_code      VARCHAR(20),
    vnp_card_type      VARCHAR(20),
    vnp_response_code  VARCHAR(10),

    CONSTRAINT fk_payments_ticket
        FOREIGN KEY (ticket_id) REFERENCES tickets(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_payments_status  (status),
    INDEX idx_payments_method  (payment_method),
    INDEX idx_payments_vnp_ref (vnp_txn_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: feedbacks
-- ============================================================
CREATE TABLE feedbacks (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    category        ENUM('COMPLAINT', 'SUGGESTION', 'PRAISE', 'QUESTION', 'OTHER') NOT NULL,
    subject         VARCHAR(150) NOT NULL,
    content         TEXT NOT NULL,
    related_trip_id BIGINT,
    rating          INT,
    status          ENUM('NEW', 'READ', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')
                    NOT NULL DEFAULT 'NEW',
    priority        ENUM('LOW', 'MEDIUM', 'HIGH') DEFAULT 'MEDIUM',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME,

    CONSTRAINT fk_feedbacks_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_fb_user_id     (user_id),
    INDEX idx_fb_status      (status),
    INDEX idx_fb_priority   (priority),
    INDEX idx_fb_created_at (created_at),
    INDEX idx_fb_deleted    (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: feedback_replies
-- ============================================================
CREATE TABLE feedback_replies (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    feedback_id BIGINT NOT NULL,
    author_id   BIGINT NOT NULL,
    author_role ENUM('CUSTOMER', 'ADMIN') NOT NULL,
    content     TEXT NOT NULL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_fr_feedback
        FOREIGN KEY (feedback_id) REFERENCES feedbacks(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    CONSTRAINT fk_fr_author
        FOREIGN KEY (author_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_fr_feedback_id (feedback_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: maintenance
-- ============================================================
CREATE TABLE maintenance (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    bus_id           BIGINT,
    description      TEXT,
    cost             DECIMAL(12,2),
    maintenance_date DATE,
    status           ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED'),

    CONSTRAINT fk_maintenance_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_maint_bus_id  (bus_id),
    INDEX idx_maint_status (status),
    INDEX idx_maint_date   (maintenance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: cargos
-- ============================================================
CREATE TABLE cargos (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id        BIGINT NOT NULL,
    sender_name    VARCHAR(255) NOT NULL,
    receiver_name  VARCHAR(255) NOT NULL,
    receiver_phone VARCHAR(50) NOT NULL,
    cargo_type     VARCHAR(255),
    weight         DECIMAL(10,2),
    fee            DECIMAL(10,2) NOT NULL,
    status         ENUM('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')
                   DEFAULT 'PENDING',
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cargo_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_cargo_trip_id (trip_id),
    INDEX idx_cargo_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ============================================================
-- SEED DATA - Tuân theo thứ tự bảng (không có FK trước)
-- ============================================================

-- 1. ROLES (2 rows)
INSERT INTO roles (id, name, description) VALUES
    (1, 'ADMIN',   'Administrator with full access'),
    (3, 'CUSTOMER', 'Customer account');

-- 2. USERS (29 rows)
-- Password cho tat ca user: ChangeMe@123 (BCrypt hash)
-- Admin: admin@bus.com / ChangeMe@123
INSERT INTO users (id, username, password_hash, email, phone, role_id, status, created_at) VALUES
    (1,  'admin',                     '$2a$10$3Xfc64b2LiWtHPA.Y/eroudxlJ9fHLQR20ysOOc09iHSPhI9noDdK', 'admin@bus.com',                  NULL, 1, 'ACTIVE', '2026-05-04 07:02:28.707630'),
    (6,  'levuhao10jq@gmail.com',    '$2a$10$R.V8LjVTg7k6NuReyxBGYONOxWBuK2xaS6cXSQ9OSVxaWJCmR1O0m', 'levuhao10jq@gmail.com',         NULL, 3, 'ACTIVE', '2026-05-04 16:31:19.539949'),
    (7,  'levuhao',                  '$2a$10$bh.z8jtPIBoiUg/fBlZQMOWZmy/mUS7Nvlk1OYm4xlc0ICjGRngkW', 'levuhao0jq@gmail.com',          NULL, 3, 'ACTIVE', '2026-05-19 16:01:10.560961'),
    (8,  'testuser1',                '$2a$10$x/HtBJ0trE77GenFKBHATuQJJcZX9BlO9MggJ3jCx4bLV1eOu6HCK', 'test1@test.com',                NULL, 3, 'ACTIVE', '2026-05-21 08:41:50.996115'),
    (10, 'vnpaytest',                '$2a$10$3gY6Y2Ttr9Kn0LoA4iGCH.CpuAtEthhcrMNaPeKxcuAwT0SGp/aBm', 'vnpaytest@test.com',            NULL, 3, 'ACTIVE', '2026-06-25 17:33:04.631918'),
    (11, 'vnpaytest2',               '$2a$10$CXzho5uC7d/IPQXgBgGFA.ZH6Q9Ed.MpCsaHA9XCX7Htig.Ji9fyO', 'vnpaytest2@test.com',           NULL, 3, 'ACTIVE', '2026-06-25 17:33:15.928412'),
    (12, 'testvnpay',                '$2a$10$wxDzDcBzIP2mzBCUZp.Xy.TAC8dzmuzcoTH0EhdCI2zGmtjsB7TnO', 'testvnpay@test.com',            NULL, 3, 'ACTIVE', '2026-06-25 17:36:38.970219'),
    (13, 'vnpaytest1307403650',      '$2a$10$xkthvmSgmlUGlbzT9b.K1eBo92dM/j/k4RsxVEHaiDBh4mZYyjkIu', 'vnpaytest713755559@test.com',   NULL, 3, 'ACTIVE', '2026-06-25 17:36:51.581604'),
    (14, 'vnpayfinal1326988457',     '$2a$10$qEhSiHFa9f69yjP8KeKCCOZ/UzkAFvA4GPxuP9r63ZgAGPYeIy6F.', 'vnpayfinal1119316318@test.com', NULL, 3, 'ACTIVE', '2026-06-25 17:37:03.331784'),
    (15, 'debugticket1413512757',    '$2a$10$i2lEcmx1Ix3/Bx4WJp4nT.b8EY1gTPk9TES4G4hzJ85hcdKaIWNKi', 'debugticket128194293@test.com', NULL, 3, 'ACTIVE', '2026-06-25 17:37:14.549171'),
    (16, 'vnpaytest_824290894',      '$2a$10$l8JE1CoVtX/XQRFmO5KdVOzuwaZpdOAcW.tpIXODyvTYkBc5nl4da', 'vnpaytest_991222128@test.com',  NULL, 3, 'ACTIVE', '2026-06-26 08:11:37.619016'),
    (17, 'vnpaytest_244666857',      '$2a$10$ZXFcrPp9PmNSZhe7mQ2LPuri1G2ALH70ZPcNzO4l0Kruu2ev.FOKy', 'vnpaytest_17051660@test.com',   NULL, 3, 'ACTIVE', '2026-06-26 08:14:19.194678'),
    (18, 'e2e_test_1743746485',      '$2a$10$M6BiHewB.YDpx4QQ/bpwF.kolqb4qyqpW1je.VzxueUTxIsrKCHLi', 'e2e_test_792319231@test.com',   NULL, 3, 'ACTIVE', '2026-06-26 08:15:11.247700'),
    (19, 'e2e_test_379217453',       '$2a$10$9vzFtOnNTy896Ipu1AdPcORs4lVkvfOUo0KW.2wdDBr5yLrwsfl3e', 'e2e_test_30855355@test.com',    NULL, 3, 'ACTIVE', '2026-06-26 08:16:25.586369'),
    (20, 'vnpay_e2e_1355490069',     '$2a$10$yiVSdJlBREcWIRaDcOir5.p2dsiHnwavYPCZKNjSjwAWdro9mZ5de', 'vnpay_e2e_1355490069@test.com', NULL, 3, 'ACTIVE', '2026-06-26 08:38:32.029794'),
    (21, 'vnpay_e2e_1677537548',     '$2a$10$ITNPH3YoNW8i2AAL9qD2iuNeKe.9oMhUcskTlwI8UIXz2v3pdqFdO', 'vnpay_e2e_1677537548@test.com', NULL, 3, 'ACTIVE', '2026-06-26 08:39:23.868210'),
    (22, 'vnpay_e2e_1710267283',     '$2a$10$RfERGCyP6Y29FuUWlFYQze4gKQqtHKCZB45JUzb1jijzD3rveY2au', 'vnpay_e2e_1710267283@test.com', NULL, 3, 'ACTIVE', '2026-06-26 08:45:34.294012'),
    (23, 'vnpay_e2e_1331741931',     '$2a$10$Ne68xglYnHaEHNmhP/wqc.T0zMyICiU6ErqW5Tob3CplMA6K/skIi', 'vnpay_e2e_1331741931@test.com', NULL, 3, 'ACTIVE', '2026-06-26 08:50:38.016160'),
    (24, 'vnpay_e2e_83775238',       '$2a$10$c9qGuzFMzkwsx03JVHqoouHcYceIoB7PgAo/ZpNUZ7QWa3vaKphHW', 'vnpay_e2e_83775238@test.com',   NULL, 3, 'ACTIVE', '2026-06-26 09:26:26.643425'),
    (25, 'e2e_test_1202842682',      '$2a$10$VajtNzpq8GheCSgLUhUM3eH7rFd1DuFi4PUPTHBYgDzUYJQmWi.BC', 'e2e_test_917587249@test.com',   NULL, 3, 'ACTIVE', '2026-06-27 08:26:34.526460'),
    (26, 'e2e_v7_242206309',         '$2a$10$/6MZK.S5DaJBxA0UhbMLAe7sTrw4V32BYt1csefiYMr1ATk1Wih9C', 'e2e_v7_1847038755@test.com',    NULL, 3, 'ACTIVE', '2026-06-27 08:30:19.575981'),
    (27, 'testfeedback1',            '$2a$10$JHz3IouiO/wyZdX2hQNDsu14D46OgoPgqLfSevuFLmx85P0lCZ/wW', 'testfb1@x.com',                 NULL, 3, 'ACTIVE', '2026-06-27 13:53:11.438356'),
    (28, 'ewffefer',                 '$2a$10$hxazY1qLzyvsRweluf.LMeCPlVQGVxmNzBblHNzd0BQgSH2nqlUdG', 'fseefw@gmail.com',               NULL, 3, 'ACTIVE', '2026-06-27 14:52:49.850599'),
    (29, 'demo',                     '$2a$10$RM8nTVS63KeHOackwwLGyeLlDlwZPwZ1LtlukScXDJxyAoNwLjR3i', 'demo@example.com',               NULL, 3, 'ACTIVE', '2026-06-27 15:33:58.910362');

-- 3. BUSES (21 rows)
INSERT INTO buses (id, license_plate, bus_type, total_seats, status, last_maintenance_date, insurance_expiry) VALUES
    (4,  '29B-111.11', 'LIMOUSINE', 28, 'AVAILABLE', NULL, NULL),
    (5,  '30B-222.22', 'LIMOUSINE', 28, 'AVAILABLE', NULL, NULL),
    (6,  '51B-333.33', 'LIMOUSINE', 28, 'AVAILABLE', NULL, NULL),
    (7,  '43B-444.44', 'LIMOUSINE', 28, 'AVAILABLE', NULL, NULL),
    (8,  '88B-555.55', 'LIMOUSINE', 28, 'AVAILABLE', NULL, NULL),
    (9,  '29A-100.01', 'SLEEPER',   34, 'AVAILABLE', NULL, NULL),
    (10, '30A-200.02', 'SLEEPER',   34, 'AVAILABLE', NULL, NULL),
    (11, '51A-300.03', 'SLEEPER',   34, 'AVAILABLE', NULL, NULL),
    (12, '43A-400.04', 'SLEEPER',   34, 'AVAILABLE', NULL, NULL),
    (13, '17A-500.05', 'SLEEPER',   34, 'AVAILABLE', NULL, NULL),
    (14, '29C-1111.1', 'SLEEPER',   40, 'AVAILABLE', NULL, NULL),
    (15, '30C-2222.2', 'SLEEPER',   40, 'AVAILABLE', NULL, NULL),
    (16, '51C-3333.3', 'SLEEPER',   40, 'AVAILABLE', NULL, NULL),
    (17, '72C-4444.4', 'SLEEPER',   40, 'AVAILABLE', NULL, NULL),
    (18, '15C-5555.5', 'SLEEPER',   40, 'AVAILABLE', NULL, NULL),
    (19, '29D-777.77', 'SEAT',      45, 'AVAILABLE', NULL, NULL),
    (20, '30D-888.88', 'SEAT',      45, 'AVAILABLE', NULL, NULL),
    (21, '51D-999.99', 'SEAT',      45, 'AVAILABLE', NULL, NULL),
    (22, '18D-101.10', 'SEAT',      45, 'AVAILABLE', NULL, NULL),
    (23, '16D-202.20', 'SEAT',      45, 'AVAILABLE', NULL, NULL),
    (24, '29E-303.30', 'SEAT',      50, 'AVAILABLE', NULL, NULL);

-- 4. ROUTES (6 rows)
INSERT INTO routes (id, origin, destination, distance_km, estimated_duration_min, base_price, is_active) VALUES
    (1, 'Hà Nội',     'TP.HCM',   1700.00, 2400,  500000.00, TRUE),
    (2, 'Hà Nội',     'Đà Nẵng',   800.00, 1200,  300000.00, TRUE),
    (3, 'TP.HCM',     'Đà Nẵng',   900.00, 1300,  350000.00, TRUE),
    (5, 'Ha Noi',     'Da Nang',   766.00,   720,  450000.00, TRUE),
    (6, 'TP.HCM',     'Hà Nội',   1000.00, 1000, 1000000.00, TRUE),
    (7, '',           '',            0.00,   60,  300000.00, TRUE);

-- 5. EMPLOYEES (20 rows)
INSERT INTO employees (id, user_id, full_name, phone, hometown, experience_years, join_date, employee_type, status) VALUES
    (1,  NULL, 'Nguyễn Văn An',     '0904979696', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (2,  NULL, 'Trần Văn Bình',     '0900733480', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (3,  NULL, 'Lê Đình Cường',     '0906512597', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (4,  NULL, 'Phạm Văn Dũng',    '0901127348', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (5,  NULL, 'Hoàng Văn Em',      '0901579678', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (6,  NULL, 'Đặng Văn Phong',   '0900128162', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (7,  NULL, 'Bùi Văn Quang',    '0904824192', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (8,  NULL, 'Đỗ Văn Sơn',       '0905921545', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (9,  NULL, 'Ngô Văn Tài',      '0901213957', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (10, NULL, 'Vũ Văn Thành',     '0907968456', NULL, NULL, NULL, 'DRIVER',     'ACTIVE'),
    (11, NULL, 'Lý Thị Hương',     '0916656673', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (12, NULL, 'Trương Thị Lan',   '0911886604', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (13, NULL, 'Phan Thị Mai',     '0918102206', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (14, NULL, 'Cao Thị Ngọc',     '0913028135', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (15, NULL, 'Đinh Thị Oanh',    '0912689936', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (16, NULL, 'Hứa Thị Phương',   '0916111049', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (17, NULL, 'Châu Thị Quỳnh',   '0918487006', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (18, NULL, 'Thái Thị Thu',     '0910506362', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (19, NULL, 'Phùng Thị Vy',     '0911238307', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE'),
    (20, NULL, 'Đoàn Thị Xinh',    '0917759707', NULL, NULL, NULL, 'ASSISTANT',  'ACTIVE');

-- 6. PASSENGERS (24 rows)
INSERT INTO passengers (id, user_id, full_name, phone, email, id_card) VALUES
    (1,  6,  'Lê Vũ Hảo',        '012122199',  'levuhao10jq@gmail.com',           NULL),
    (2,  7,  'Lê Vũ Hảo',        '0901234567', 'levuhao0jq@gmail.com',            NULL),
    (3,  8,  'Test Customer',    '0909123456', 'test1@test.com',                  NULL),
    (5,  10, 'Test VNPay',       '',           'vnpaytest@test.com',               NULL),
    (6,  11, 'Test VNPay 2',     '',           'vnpaytest2@test.com',              NULL),
    (7,  12, 'Test VNPay',       '0909123456', 'testvnpay@test.com',              NULL),
    (8,  13, 'Test VNPay',       '',           'vnpaytest713755559@test.com',       NULL),
    (9,  14, 'Test VNPay Final', '',           'vnpayfinal1119316318@test.com',    NULL),
    (10, 15, 'Debug Ticket',     '0909123456', 'debugticket128194293@test.com',    NULL),
    (11, 16, 'VNPay Test User',  '',           'vnpaytest_991222128@test.com',      NULL),
    (12, 17, 'VNPay Test User',  '',           'vnpaytest_17051660@test.com',       NULL),
    (13, 18, 'E2E Test User',    '',           'e2e_test_792319231@test.com',        NULL),
    (14, 19, 'E2E Test User',    '0909123456', 'e2e_test_30855355@test.com',       NULL),
    (15, 20, 'VNPay E2E Test',   '0909123456', 'vnpay_e2e_1355490069@test.com',     NULL),
    (16, 21, 'VNPay E2E Test',   '0909123456', 'vnpay_e2e_1677537548@test.com',    NULL),
    (17, 22, 'VNPay E2E Test',   '0909123456', 'vnpay_e2e_1710267283@test.com',    NULL),
    (18, 23, 'VNPay E2E Test',   '0909123456', 'vnpay_e2e_1331741931@test.com',    NULL),
    (19, 24, 'VNPay E2E Test',   '0909123456', 'vnpay_e2e_83775238@test.com',      NULL),
    (20, 25, 'E2E Test User',     '0909123456', 'e2e_test_917587249@test.com',      NULL),
    (21, 26, 'E2E Trip7',        '0909123456', 'e2e_v7_1847038755@test.com',        NULL),
    (22, 27, 'Nguyễn Văn A',     '',           'testfb1@x.com',                     NULL),
    (23, 28, 'nguyn an a',       '',           'fseefw@gmail.com',                  NULL),
    (24, 29, 'Demo Customer',    '',           'demo@example.com',                  NULL);

-- 7. TRIPS (8 rows)
INSERT INTO trips (id, route_id, bus_id, departure_time, arrival_time, status, actual_departure, actual_arrival) VALUES
    (1, 1, 15, '2026-05-10 01:00:00', '2026-05-10 13:00:00', 'SCHEDULED', NULL, NULL),
    (2, 1,  4, '2026-05-05 16:32:00', '2026-05-06 16:32:00', 'SCHEDULED', NULL, NULL),
    (3, 5,  4, '2026-05-20 01:00:00', '2026-05-20 13:00:00', 'SCHEDULED', NULL, NULL),
    (4, 6,  8, '2026-05-30 15:41:00', '2026-06-01 15:41:00', 'SCHEDULED', NULL, NULL),
    (5, 2, 18, '2026-06-01 08:54:00', '2026-06-02 08:54:00', 'SCHEDULED', NULL, NULL),
    (6, 6,  4, '2026-06-30 08:32:00', '2026-07-02 08:32:00', 'SCHEDULED', NULL, NULL),
    (7, 6,  8, '2026-07-02 08:16:00', '2026-07-04 08:16:00', 'SCHEDULED', NULL, NULL),
    (8, 7, 17, '2026-06-28 15:08:00', '2026-06-30 15:08:00', 'SCHEDULED', NULL, NULL);

-- 8. TRIP_ASSIGNMENTS (16 rows)
INSERT INTO trip_assignments (id, trip_id, employee_id, assignment_role) VALUES
    (5,  4, 4,  'DRIVER'),
    (6,  4, 17, 'ASSISTANT'),
    (7,  5, 8,  'DRIVER'),
    (8,  5, 19, 'ASSISTANT'),
    (9,  2, 1,  'DRIVER'),
    (10, 2, 11, 'ASSISTANT'),
    (11, 1, 6,  'DRIVER'),
    (12, 1, 18, 'ASSISTANT'),
    (13, 3, 7,  'DRIVER'),
    (14, 3, 18, 'ASSISTANT'),
    (15, 6, 8,  'DRIVER'),
    (16, 6, 16, 'ASSISTANT'),
    (17, 7, 6,  'DRIVER'),
    (18, 7, 19, 'ASSISTANT'),
    (19, 8, 8,  'DRIVER'),
    (20, 8, 20, 'ASSISTANT');

-- 9. FEEDBACKS (7 rows)
INSERT INTO feedbacks (id, user_id, category, subject, content, related_trip_id, rating, status, priority, created_at, updated_at, deleted_at) VALUES
    (1, 27, 'SUGGESTION', 'test',                   'abc',                                             NULL,     5, 'IN_PROGRESS', 'MEDIUM', '2026-06-27 13:53:43.686487', '2026-06-27 13:54:09.949378', NULL),
    (2, 27, 'PRAISE',     'Test SSE broadcast',     'Driver rat nhiet tinh, xe sach se',               NULL,     5, 'NEW',         'MEDIUM', '2026-06-27 14:19:52.913103', '2026-06-27 14:19:52.913103', NULL),
    (3, 27, 'SUGGESTION', 'SSE real test',         'Xin chao admin, xin test SSE',                    NULL,     4, 'NEW',         'MEDIUM', '2026-06-27 14:20:43.463866', '2026-06-27 14:20:43.463866', NULL),
    (4, 27, 'QUESTION',   'Test SSE event broadcast', 'Toi muon hoi ve gio giac xe',                  NULL,     NULL, 'NEW',         'MEDIUM', '2026-06-27 14:21:04.297166', '2026-06-27 14:21:04.297166', NULL),
    (5, 27, 'COMPLAINT',  'Real-time test',         'Di mua 1 tiet bi tre ghe',                        NULL,     3, 'NEW',         'MEDIUM', '2026-06-27 14:21:50.012464', '2026-06-27 14:21:50.012464', NULL),
    (6, 27, 'PRAISE',     'Filter test with tripId', 'Test filter by trip',                             1,        5, 'RESOLVED',    'HIGH',   '2026-06-27 14:22:31.375802', '2026-06-27 14:22:41.678471', NULL),
    (7,  6, 'SUGGESTION', 'tài xế hài hước',       'tôi rất thích anh tài xế này vì tính ảnh hài hước', NULL,   5, 'IN_PROGRESS', 'MEDIUM', '2026-06-27 14:26:51.792862', '2026-06-27 14:32:59.543943', NULL);

-- 10. FEEDBACK_REPLIES (5 rows)
INSERT INTO feedback_replies (id, feedback_id, author_id, author_role, content, created_at) VALUES
    (1, 1, 27, 'CUSTOMER', 'Cam on ban da gop y!',                  '2026-06-27 13:53:56.248956'),
    (2, 1,  1, 'ADMIN',    'Cam on quy khach, chung toi se xem xet.', '2026-06-27 13:54:09.945202'),
    (3, 6,  1, 'ADMIN',    'Cam on quy khach da gop y!',             '2026-06-27 14:22:41.613386'),
    (4, 1,  1, 'ADMIN',    'Test reply after restart',               '2026-06-27 14:24:43.924581'),
    (5, 7,  1, 'ADMIN',    'ok cảm ơn bạn',                          '2026-06-27 14:32:59.536727');

-- 11. TICKETS (49 rows)
INSERT INTO tickets (id, trip_id, seat_id, passenger_id, price, status, booked_by, booked_at, paid_at, pickup_point, dropoff_point) VALUES
    (1,  2,  128, 1, 500000.00,  'CONFIRMED', 6,  '2026-05-04 17:06:10.367700', '2026-05-19 15:35:40.733583', NULL, NULL),
    (5,  5,  166, 1, 300000.00,  'HOLD',      6,  '2026-05-21 08:55:56.121583', NULL,                          NULL, NULL),
    (6,  5,  167, 1, 300000.00,  'CONFIRMED', 6,  '2026-05-21 09:11:10.157858', '2026-05-23 09:17:34.754972', NULL, NULL),
    (7,  5,  168, 1, 300000.00,  'HOLD',      6,  '2026-05-28 06:59:08.520241', NULL,                          NULL, NULL),
    (8,  6,  206, 20,1000000.00, 'HOLD',      25, '2026-06-27 08:26:34.823153', NULL,
        'Ben xe Mien Dong - 05 Dien Bien Phu',
        'Ben xe Trung tam Da Nang - 201 Tran Phu'),
    (9,  6,  207, 1, 1000000.00, 'HOLD',      6,  '2026-06-20 06:54:03.994187', NULL,
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (10, 6,  208, 1, 1000000.00, 'HOLD',     6,  '2026-06-23 15:54:38.579317', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Ga tàu Hà Nội - Quận Hoàn Kiếm, Hà Nội'),
    (11, 6,  209, 1, 1000000.00, 'HOLD',      6,  '2026-06-23 15:58:59.499470', NULL,
        'Siêu thị coopmart Lý Thường Kiệt - Số 121 Lý Thường Kiệt, Quận 11, TP.HCM',
        'Đại học Bách Khoa Hà Nội - Số 1 Đại Cồ Việt, Quận Hai Bà Trưng, Hà Nội'),
    (12, 6,  210, 1, 1000000.00, 'HOLD',      6,  '2026-06-23 16:20:26.078574', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (13, 6,  211, 1, 1000000.00, 'HOLD',      6,  '2026-06-25 15:26:16.795213', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Bến xe Mỹ Đình 2 - Phạm Hùng, Nam Từ Liêm, Hà Nội'),
    (14, 6,  212, 1, 1000000.00, 'HOLD',      6,  '2026-06-25 15:37:59.887214', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (15, 6,  213, 1, 1000000.00, 'HOLD',      6,  '2026-06-25 16:20:47.646333', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (16, 6,  214, 1, 1000000.00, 'HOLD',      6,  '2026-06-26 02:48:37.825988', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (17, 6,  215, 1, 1000000.00, 'HOLD',      6,  '2026-06-26 03:32:12.756369', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Ga tàu Hà Nội - Quận Hoàn Kiếm, Hà Nội'),
    (18, 6,  216, 1, 1000000.00, 'HOLD',      6,  '2026-06-26 03:40:27.537638', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (19, 6,  217, 14,1000000.00, 'HOLD',      19, '2026-06-26 08:16:25.746537', NULL,
        'Ben xe Mien Dong - 05 Dien Bien Phu',
        'Ben xe Trung tam Da Nang - 201 Tran Phu'),
    (20, 6,  218, 1, 1000000.00, 'HOLD',      6,  '2026-06-26 08:33:13.033756', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Công viên Thống Nhất - Đường Trần Nhân Tông, Quận Hai Bà Trưng, Hà Nội'),
    (21, 6,  219, 15,1000000.00, 'HOLD',      20, '2026-06-26 08:38:32.166695', NULL,
        'Ben xe Mien Dong',
        'Ben xe Da Nang'),
    (22, 6,  220, 16,1000000.00, 'HOLD',      21, '2026-06-26 08:39:23.981181', NULL,
        'Ben xe Mien Dong',
        'Ben xe Da Nang'),
    (23, 6,  221, 17,1000000.00, 'HOLD',      22, '2026-06-26 08:45:34.628627', NULL,
        'Ben xe Mien Dong',
        'Ben xe Da Nang'),
    (24, 6,  222, 18,1000000.00, 'PAID',      23, '2026-06-26 08:50:38.290210', '2026-06-26 08:50:38.489450',
        'Ben xe Mien Dong',
        'Ben xe Da Nang'),
    (25, 6,  223, 19,1000000.00, 'PAID',      24, '2026-06-26 09:26:26.777366', '2026-06-26 09:26:26.925826',
        'Ben xe Mien Dong',
        'Ben xe Da Nang'),
    (26, 6,  224, 1, 1000000.00, 'HOLD',      6,  '2026-06-26 09:30:16.818874', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (27, 6,  225, 1, 1000000.00, 'HOLD',      6,  '2026-06-26 10:08:48.916558', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (28, 6,  226, 1, 1000000.00, 'HOLD',      6,  '2026-06-26 14:59:28.129545', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (29, 6,  227, 1, 1000000.00, 'HOLD',      6,  '2026-06-27 00:39:25.082423', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (30, 6,  228, 1, 1000000.00, 'PAID',      6,  '2026-06-27 01:11:33.965702', '2026-06-27 01:12:16.944597',
        'Ben xe Mien Dong',
        'Ben xe My Dinh'),
    (31, 6,  229, 1, 1000000.00, 'CONFIRMED', 6,  '2026-06-27 01:16:16.104484', '2026-06-27 02:04:43.181902',
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (32, 6,  230, 1, 1000000.00, 'CONFIRMED', 6,  '2026-06-27 01:26:07.462879', '2026-06-27 02:03:06.623222',
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (33, 6,  231, 2, 1000000.00, 'CONFIRMED', 7,  '2026-06-27 01:40:56.649912', '2026-06-27 01:40:56.786294',
        NULL, NULL),
    (34, 6,  232, 2, 1000000.00, 'CONFIRMED', 7,  '2026-06-27 01:41:27.702963', '2026-06-27 01:41:27.746638',
        NULL, NULL),
    (35, 6,  233, 1, 1000000.00, 'CONFIRMED', 6,  '2026-06-27 07:54:23.449964', '2026-06-27 08:15:42.331316',
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (36, 7,  318, 1, 1000000.00, 'HOLD',      6,  '2026-06-27 08:19:41.645304', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (37, 7,  319, 1, 1000000.00, 'HOLD',      6,  '2026-06-27 08:35:49.558783', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (38, 7,  320, 1, 1000000.00, 'HOLD',      6,  '2026-06-27 08:36:44.802521', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Bến xe Mỹ Đình 2 - Phạm Hùng, Nam Từ Liêm, Hà Nội'),
    (39, 7,  321, 1, 1000000.00, 'CONFIRMED', 6,  '2026-06-27 08:54:52.143070', '2026-06-27 15:11:56.897059',
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Bến xe Mỹ Đình 2 - Phạm Hùng, Nam Từ Liêm, Hà Nội'),
    (40, 7,  322, 1, 1000000.00, 'CONFIRMED', 6,  '2026-06-27 09:10:36.976811', '2026-06-27 14:25:00.856056',
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Bến xe Giáp Bát - Giáp Bát, Quận Hoàng Mai, Hà Nội'),
    (41, 7,  323, 1, 1000000.00, 'CONFIRMED', 6,  '2026-06-27 13:07:34.647171', '2026-06-27 13:09:00.384051',
        'Nhà hàng Bạch Kỳ - Lăng Cả - Số 58bis Lê Thánh Tôn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (42, 7,  324, 1, 1000000.00, 'CONFIRMED', 6,  '2026-06-27 13:58:23.646916', '2026-06-27 14:24:49.987782',
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (43, 8,  636, 1, 300000.00,  'CONFIRMED', 6,  '2026-06-27 17:01:57.776433', '2026-06-27 17:03:03.038997',
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (44, 8,  637, 1, 300000.00,  'HOLD',      6,  '2026-06-28 07:31:24.921589', NULL,
        'Siêu thị coopmart Lý Thường Kiệt - Số 121 Lý Thường Kiệt, Quận 11, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (45, 8,  638, 1, 300000.00,  'HOLD',      6,  '2026-06-28 07:33:08.693984', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (46, 8,  639, 1, 300000.00,  'HOLD',      6,  '2026-06-28 07:50:49.348700', NULL,
        'Văn phòng xe Bến Thành - Số 5 Đường Lê Thánh Hoàn, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (47, 8,  640, 1, 300000.00,  'HOLD',      6,  '2026-06-28 08:04:57.278421', NULL,
        'Siêu thị coopmart Lý Thường Kiệt - Số 121 Lý Thường Kiệt, Quận 11, TP.HCM',
        'Bến xe Mỹ Đình 2 - Phạm Hùng, Nam Từ Liêm, Hà Nội'),
    (48, 8,  641, 1, 300000.00,  'HOLD',      6,  '2026-06-28 08:07:07.124813', NULL,
        'Trạm xăng Petro Đinh Tiên Hoàng - Đinh Tiên Hoàng, Quận 1, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội'),
    (49, 8,  648, 1, 300000.00,  'PAID',      6,  '2026-06-28 08:11:31.993473', '2026-06-28 08:12:00.659784',
        'Siêu thị coopmart Lý Thường Kiệt - Số 121 Lý Thường Kiệt, Quận 11, TP.HCM',
        'Văn phòng xe Mỹ Đình - Cạnh Sân vận động Mỹ Đình, Nam Từ Liêm, Hà Nội');

-- 12. PAYMENTS (47 rows)
INSERT INTO payments (id, ticket_id, amount, payment_method, status, transaction_code, paid_at,
                      vnp_txn_ref, vnp_transaction_no, vnp_bank_code, vnp_card_type, vnp_response_code) VALUES
    (2,  1,  500000.00, 'CASH',   'SUCCESS', 'CASH-1779204940733',  '2026-05-19 15:35:40.733583', NULL,               NULL,               NULL,      NULL,       NULL),
    (4,  6,  300000.00, 'CASH',   'SUCCESS', 'CASH-1779527854754',  '2026-05-23 09:17:34.754972', NULL,               NULL,               NULL,      NULL,       NULL),
    (5,  8, 1000000.00, 'CASH',   'SUCCESS', 'CASH-1781936173786',  '2026-06-20 06:16:13.787933', NULL,               NULL,               NULL,      NULL,       NULL),
    (6,  11,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET11_1782230339544',  NULL,               NULL,      NULL,       NULL),
    (7,  12,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET12_1782231626119',  NULL,               NULL,      NULL,       NULL),
    (8,  13,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET13_1782401176869',  NULL,               NULL,      NULL,       NULL),
    (9,  14,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET14_1782401879938',  NULL,               NULL,      NULL,       NULL),
    (10, 15,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET15_1782404447756',  NULL,               NULL,      NULL,       NULL),
    (11, 16,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET16_1782442117898',  NULL,               NULL,      NULL,       NULL),
    (12, 17,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET17_1782444732808',  NULL,               NULL,      NULL,       NULL),
    (13, 18,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET18_1782445227588',  NULL,               NULL,      NULL,       NULL),
    (14, 19,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET19_1782461785792',  NULL,               NULL,      NULL,       NULL),
    (15, 20,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET20_1782462793070',  NULL,               NULL,      NULL,       NULL),
    (16, 21,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET21_1782463112206',  NULL,               NULL,      NULL,       NULL),
    (17, 22,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET22_1782463164021',  NULL,               NULL,      NULL,       NULL),
    (18, 23,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET23_1782463534692',  NULL,               NULL,      NULL,       NULL),
    (19, 24,1000000.00, 'VNPAY',  'SUCCESS', 'VNP88888888',         '2026-06-26 08:50:38.489450', 'TICKET24_1782463838361', '88888888',          'NCB',     'ATM',      '00'),
    (20, 25,1000000.00, 'VNPAY',  'SUCCESS', 'VNP88888888',         '2026-06-26 09:26:26.925826', 'TICKET25_1782465986821', '88888888',          'NCB',     'ATM',      '00'),
    (21, 26,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET26_1782466216897',  NULL,               NULL,      NULL,       NULL),
    (22, 27,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET27_1782468529000',  NULL,               NULL,      NULL,       NULL),
    (23, 28,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET28_1782485968224',  NULL,               NULL,      NULL,       NULL),
    (24, 29,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET29_1782520765148',  NULL,               NULL,      NULL,       NULL),
    (25, 30,1000000.00, 'VNPAY',  'SUCCESS', 'VNP87654321',         '2026-06-27 01:12:16.944597', 'TICKET30_1782522717324', '87654321',          'NCB',     'ATM',      '00'),
    (26, 31,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET31_1782522976142',  NULL,               NULL,      NULL,       NULL),
    (27, 32,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET32_1782523567596',  NULL,               NULL,      NULL,       NULL),
    (31, 33,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET33_1782524456724',  NULL,               NULL,      NULL,       NULL),
    (32, 34,1000000.00, 'CASH',   'SUCCESS', 'CASH-1782524487746',  '2026-06-27 01:41:27.746638', NULL,               NULL,               NULL,      NULL,       NULL),
    (33, 35,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET35_1782546863527',  NULL,               NULL,      NULL,       NULL),
    (34, 36,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET36_1782548381713',  NULL,               NULL,      NULL,       NULL),
    (35, 37,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET37_1782549349599',  NULL,               NULL,      NULL,       NULL),
    (36, 38,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET38_1782549404846',  NULL,               NULL,      NULL,       NULL),
    (37, 39,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET39_1782550492612',  NULL,               NULL,      NULL,       NULL),
    (38, 40,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET40_1782551437068',  NULL,               NULL,      NULL,       NULL),
    (39, 41,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET41_1782565654697',  NULL,               NULL,      NULL,       NULL),
    (40, 42,1000000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET42_1782568703766',  NULL,               NULL,      NULL,       NULL),
    (41, 43, 300000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET43_1782579717901',  NULL,               NULL,      NULL,       NULL),
    (42, 44, 300000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET44_1782631885002',  NULL,               NULL,      NULL,       NULL),
    (43, 45, 300000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET45_1782631988732',  NULL,               NULL,      NULL,       NULL),
    (44, 46, 300000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET46_1782633049387',  NULL,               NULL,      NULL,       NULL),
    (45, 47, 300000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET47_1782633897311',  NULL,               NULL,      NULL,       NULL),
    (46, 48, 300000.00, 'VNPAY',  'PENDING', NULL,                  NULL,                          'TICKET48_1782634027156',  NULL,               NULL,      NULL,       NULL),
    (47, 49, 300000.00, 'VNPAY',  'SUCCESS', 'VNP15601903',         '2026-06-28 08:12:00.659784', 'TICKET49_1782634292055', '15601903',          'NCB',     'ATM',      '00');

-- ============================================================
-- 13. SEATS (785 rows - tu dong sinh cho 21 xe)
-- LIMOUSINE (5 xe x 28 cho = 140 cho), SLEEPER 34-cho (5 xe = 170), SLEEPER 40-cho (5 xe = 200), SEAT 45-cho (5 xe = 225), SEAT 50-cho (1 xe = 50)
-- Pattern: A1..L2 (12 hang x 2 cho + A1..D2 cho nua = 28)
-- ============================================================

-- Seats cho bus_id 4 (LIMOUSINE, 28 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 4, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 5 (LIMOUSINE, 28 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 5, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 6 (LIMOUSINE, 28 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 6, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 7 (LIMOUSINE, 28 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 7, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 8 (LIMOUSINE, 28 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 8, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 9 (SLEEPER, 34 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 9, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 10 (SLEEPER, 34 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 10, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 11 (SLEEPER, 34 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 11, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 12 (SLEEPER, 34 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 12, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 13 (SLEEPER, 34 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 13, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 14 (SLEEPER, 40 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 14, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R' UNION SELECT 'S' UNION SELECT 'T') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 15 (SLEEPER, 40 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 15, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R' UNION SELECT 'S' UNION SELECT 'T') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 16 (SLEEPER, 40 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 16, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R' UNION SELECT 'S' UNION SELECT 'T') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 17 (SLEEPER, 40 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 17, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R' UNION SELECT 'S' UNION SELECT 'T') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 18 (SLEEPER, 40 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 18, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P' UNION SELECT 'Q' UNION SELECT 'R' UNION SELECT 'S' UNION SELECT 'T') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0) cols;

-- Seats cho bus_id 19 (SEAT, 45 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 19, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0 UNION SELECT '3', 2, 0) cols;

-- Seats cho bus_id 20 (SEAT, 45 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 20, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0 UNION SELECT '3', 2, 0) cols;

-- Seats cho bus_id 21 (SEAT, 45 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 21, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0 UNION SELECT '3', 2, 0) cols;

-- Seats cho bus_id 22 (SEAT, 45 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 22, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0 UNION SELECT '3', 2, 0) cols;

-- Seats cho bus_id 23 (SEAT, 45 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 23, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0 UNION SELECT '3', 2, 0) cols;

-- Seats cho bus_id 24 (SEAT, 50 cho)
INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT 24, CONCAT(row_n, seat_n), x, y FROM
(SELECT 'A' row_n UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L' UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O' UNION SELECT 'P') rows
CROSS JOIN (SELECT '1' seat_n, 0 x, 0 y UNION SELECT '2', 1, 0 UNION SELECT '3', 2, 0) cols;
