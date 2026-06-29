-- ============================================================
-- BUS MANAGEMENT SYSTEM — MySQL 8.0 Schema
-- ============================================================

-- Xóa database cũ nếu đã tồn tại để làm sạch hoàn toàn dữ liệu
DROP DATABASE IF EXISTS bus_management_db;

-- Tạo lại database mới
CREATE DATABASE bus_management_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bus_management_db;

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE roles (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255)  NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE users (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    username     VARCHAR(255)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    email        VARCHAR(255)  UNIQUE,
    phone        VARCHAR(50),
    role_id      BIGINT,
    status       ENUM('ACTIVE', 'INACTIVE', 'LOCKED') DEFAULT 'ACTIVE',
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,

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
-- TABLE: buses (Đã xóa các ký tự lỗi ở đây)
-- ============================================================
CREATE TABLE buses (
    id                    BIGINT AUTO_INCREMENT PRIMARY KEY,
    license_plate         VARCHAR(255) NOT NULL UNIQUE,
    bus_type              ENUM('LIMOUSINE', 'SLEEPER', 'SEAT'),
    total_seats           INT          NOT NULL,
    status                ENUM('AVAILABLE', 'RUNNING', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    last_maintenance_date DATE,
    insurance_expiry      DATE,

    INDEX idx_buses_status     (status),
    INDEX idx_buses_type       (bus_type),
    INDEX idx_buses_insurance  (insurance_expiry)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: routes
-- ============================================================
CREATE TABLE routes (
    id                     BIGINT AUTO_INCREMENT PRIMARY KEY,
    origin                 VARCHAR(255)           NOT NULL,
    destination            VARCHAR(255)           NOT NULL,
    distance_km            DECIMAL(10,2)          NOT NULL,
    estimated_duration_min INT                    NOT NULL,
    base_price             DECIMAL(10,2)          NOT NULL,
    is_active              BOOLEAN DEFAULT TRUE,

    INDEX idx_routes_origin      (origin),
    INDEX idx_routes_destination (destination),
    INDEX idx_routes_active      (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: seats
-- ============================================================
CREATE TABLE seats (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    bus_id      BIGINT      NOT NULL,
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
    full_name        VARCHAR(255)                              NOT NULL,
    phone            VARCHAR(50),
    hometown         VARCHAR(255),
    experience_years INT,
    join_date        DATE,
    employee_type    ENUM('DRIVER','ASSISTANT','TECHNICIAN',
                          'DISPATCHER','MANAGER')             NOT NULL,
    status           ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',

    INDEX idx_emp_type  (employee_type),
    INDEX idx_emp_status(status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: passengers
-- ============================================================
CREATE TABLE passengers (
    id       BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id  BIGINT,
    full_name VARCHAR(255) NOT NULL,
    phone    VARCHAR(50)   NOT NULL,
    email    VARCHAR(255),
    id_card  VARCHAR(50),

    CONSTRAINT fk_passengers_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_pass_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: trips
-- ============================================================
CREATE TABLE trips (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id           BIGINT,
    bus_id             BIGINT,
    departure_time     DATETIME NOT NULL,
    arrival_time       DATETIME,
    status             ENUM('SCHEDULED','RUNNING','COMPLETED',
                           'CANCELLED','DELAYED') DEFAULT 'SCHEDULED',
    actual_departure   DATETIME,
    actual_arrival     DATETIME,

    CONSTRAINT fk_trips_route
        FOREIGN KEY (route_id) REFERENCES routes(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    CONSTRAINT fk_trips_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_trips_route_id      (route_id),
    INDEX idx_trips_bus_id        (bus_id),
    INDEX idx_trips_departure     (departure_time),
    INDEX idx_trips_status        (status),
    INDEX idx_trips_route_status  (route_id, status, departure_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: tickets
-- ============================================================
CREATE TABLE tickets (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id       BIGINT,
    seat_id       BIGINT,
    passenger_id  BIGINT,
    price         DECIMAL(10,2)               NOT NULL,
    status        ENUM('BOOKED','HOLD','CONFIRMED',
                       'EXPIRED','PAID','CANCELLED',
                       'REFUNDED')             NOT NULL DEFAULT 'BOOKED',
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
    INDEX idx_tickets_trip_id    (trip_id),
    INDEX idx_tickets_seat_id    (seat_id),
    INDEX idx_tickets_status     (status),
    INDEX idx_tickets_booked_by  (booked_by),
    INDEX idx_tickets_paid       (paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: payments
-- ============================================================
CREATE TABLE payments (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id          BIGINT UNIQUE,
    amount             DECIMAL(10,2)          NOT NULL,
    payment_method     ENUM('CASH','CARD','MOMO',
                            'BANK','VNPAY')    NOT NULL,
    status             ENUM('PENDING','SUCCESS','FAILED')
                                             NOT NULL DEFAULT 'PENDING',
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

    INDEX idx_payments_status        (status),
    INDEX idx_payments_method        (payment_method),
    INDEX idx_payments_vnp_ref       (vnp_txn_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: trip_assignments
-- ============================================================
CREATE TABLE trip_assignments (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id          BIGINT      NOT NULL,
    employee_id      BIGINT      NOT NULL,
    assignment_role  ENUM('DRIVER','ASSISTANT') NOT NULL,

    INDEX idx_ta_trip_id     (trip_id),
    INDEX idx_ta_employee_id (employee_id),
    UNIQUE KEY uk_ta_trip_employee_role
        (trip_id, employee_id, assignment_role)
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
    status           ENUM('SCHEDULED','IN_PROGRESS','COMPLETED'),

    CONSTRAINT fk_maintenance_bus
        FOREIGN KEY (bus_id) REFERENCES buses(id)
        ON DELETE SET NULL ON UPDATE CASCADE,

    INDEX idx_maint_bus_id  (bus_id),
    INDEX idx_maint_status  (status),
    INDEX idx_maint_date    (maintenance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: feedbacks
-- ============================================================
CREATE TABLE feedbacks (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT      NOT NULL,
    category       ENUM('COMPLAINT','SUGGESTION','PRAISE',
                        'QUESTION','OTHER')  NOT NULL,
    subject        VARCHAR(150) NOT NULL,
    content        TEXT         NOT NULL,
    related_trip_id BIGINT,
    rating         INT,
    status         ENUM('NEW','READ','IN_PROGRESS',
                        'RESOLVED','CLOSED')  NOT NULL DEFAULT 'NEW',
    priority       ENUM('LOW','MEDIUM','HIGH') DEFAULT 'MEDIUM',
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME ON UPDATE CURRENT_TIMESTAMP,
    deleted_at     DATETIME,

    CONSTRAINT fk_feedbacks_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_fb_user_id       (user_id),
    INDEX idx_fb_status        (status),
    INDEX idx_fb_priority      (priority),
    INDEX idx_fb_created_at    (created_at),
    INDEX idx_fb_deleted       (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TABLE: feedback_replies
-- ============================================================
CREATE TABLE feedback_replies (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    feedback_id BIGINT       NOT NULL,
    author_id   BIGINT       NOT NULL,
    author_role ENUM('CUSTOMER','ADMIN') NOT NULL,
    content     TEXT         NOT NULL,
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
-- TABLE: cargos
-- ============================================================
CREATE TABLE cargos (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id        BIGINT      NOT NULL,
    sender_name    VARCHAR(255) NOT NULL,
    receiver_name  VARCHAR(255) NOT NULL,
    receiver_phone VARCHAR(50)  NOT NULL,
    cargo_type     VARCHAR(255),
    weight         DECIMAL(10,2),
    fee            DECIMAL(10,2) NOT NULL,
    status         ENUM('PENDING','IN_TRANSIT',
                        'DELIVERED','CANCELLED') DEFAULT 'PENDING',
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_cargo_trip
        FOREIGN KEY (trip_id) REFERENCES trips(id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    INDEX idx_cargo_trip_id (trip_id),
    INDEX idx_cargo_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO roles (name, description) VALUES
    ('ADMIN',   'System administrator with full access'),
    ('CUSTOMER','Registered customer / passenger')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO users (username, password_hash, email, phone, role_id, status)
SELECT 'admin', '$2a$10$...', 'admin@bus.com', '0900000000', r.id, 'ACTIVE'
FROM roles r WHERE r.name = 'ADMIN'
ON DUPLICATE KEY UPDATE updated_at = NOW();

INSERT INTO routes (origin, destination, distance_km, estimated_duration_min, base_price, is_active) VALUES
    ('Ha Noi',     'Ho Chi Minh', 1700, 1500, 500000.00, TRUE),
    ('Ha Noi',     'Da Nang',     800,   720, 300000.00, TRUE),
    ('Ho Chi Minh','Da Nang',     900,   800, 350000.00, TRUE),
    ('Ha Noi',     'Hai Phong',   100,    90,  80000.00, TRUE);

INSERT INTO buses (license_plate, bus_type, total_seats, status) VALUES
    ('HN-001', 'LIMOUSINE', 28, 'AVAILABLE'),
    ('HN-002', 'LIMOUSINE', 28, 'AVAILABLE'),
    ('HN-003', 'LIMOUSINE', 28, 'AVAILABLE'),
    ('HN-004', 'LIMOUSINE', 28, 'AVAILABLE'),
    ('HN-005', 'LIMOUSINE', 28, 'AVAILABLE'),
    ('HN-006', 'SLEEPER',   34, 'AVAILABLE'),
    ('HN-007', 'SLEEPER',   34, 'AVAILABLE'),
    ('HN-008', 'SLEEPER',   34, 'AVAILABLE'),
    ('HN-009', 'SLEEPER',   34, 'AVAILABLE'),
    ('HN-010', 'SLEEPER',   34, 'AVAILABLE'),
    ('HCM-001','SLEEPER',   40, 'AVAILABLE'),
    ('HCM-002','SLEEPER',   40, 'AVAILABLE'),
    ('HCM-003','SLEEPER',   40, 'AVAILABLE'),
    ('HCM-004','SLEEPER',   40, 'AVAILABLE'),
    ('HCM-005','SLEEPER',   40, 'AVAILABLE'),
    ('HCM-006','SEAT',      45, 'AVAILABLE'),
    ('HCM-007','SEAT',      45, 'AVAILABLE'),
    ('HCM-008','SEAT',      45, 'AVAILABLE'),
    ('HCM-009','SEAT',      45, 'AVAILABLE'),
    ('HCM-010','SEAT',      50, 'AVAILABLE');

INSERT INTO seats (bus_id, seat_number, position_x, position_y)
SELECT b.id, CONCAT(row_letter, seat_num), x, y
FROM buses b
CROSS JOIN (
    SELECT 'A' AS row_letter UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D'
    UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H'
    UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L'
) rows
CROSS JOIN (
    SELECT 1 AS seat_num, 0 AS x UNION SELECT 2, 1
) cols
WHERE b.total_seats >= (SELECT COUNT(*) FROM seats) + 1;

INSERT INTO employees (user_id, full_name, phone, hometown, experience_years, join_date, employee_type, status) VALUES
    (NULL, 'Nguyen Van A', '0911111111', 'Ha Noi',     15, '2015-03-01', 'DRIVER',     'ACTIVE'),
    (NULL, 'Tran Van B',  '0911111112', 'Ha Noi',     12, '2018-06-15', 'DRIVER',     'ACTIVE'),
    (NULL, 'Le Van C',   '0911111113', 'Ha Noi',     11, '2019-01-10', 'DRIVER',     'ACTIVE'),
    (NULL, 'Pham Van D', '0911111114', 'Hai Phong',  10, '2020-04-20', 'DRIVER',     'ACTIVE'),
    (NULL, 'Hoang Van E', '0911111115','Hai Phong',   8, '2021-07-01', 'DRIVER',     'ACTIVE'),
    (NULL, 'Dinh Van F', '0911111116', 'Hue',         0, '2025-01-15', 'DRIVER',     'ACTIVE'),
    (NULL, 'Bui Van G',  '0911111117', 'Hue',         0, '2025-03-01', 'DRIVER',     'ACTIVE'),
    (NULL, 'Truong Van H','0911111118','Da Nang',     0, '2025-04-01', 'DRIVER',     'ACTIVE'),
    (NULL, 'Do Van I',   '0911111119', 'Da Nang',     0, '2025-05-01', 'DRIVER',     'ACTIVE'),
    (NULL, 'Vu Van J',   '0911111120', 'Can Tho',     0, '2025-06-01', 'DRIVER',     'ACTIVE'),
    (NULL, 'Phan Thi K', '0922222221', 'Ha Noi',      5, '2020-01-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'Trinh Thi L','0922222222', 'Ha Noi',      4, '2021-01-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'Ngo Thi M',  '0922222223', 'HCM',         3, '2022-01-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'Cao Thi N',  '0922222224', 'HCM',         2, '2023-01-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'Dang Thi O', '0922222225', 'Da Nang',     1, '2024-01-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'Luong Thi P', '0922222226','Da Nang',     1, '2024-03-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'Bach Thi Q', '0922222227', 'Hue',         0, '2025-01-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'Lam Thi R',  '0922222228', 'Hue',         0, '2025-03-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'Mai Thi S',  '0922222229', 'Can Tho',     0, '2025-05-01', 'ASSISTANT',  'ACTIVE'),
    (NULL, 'To Thi T',   '0922222230', 'Can Tho',     0, '2025-07-01', 'ASSISTANT',  'ACTIVE');