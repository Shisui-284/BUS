-- Bus Management Database Schema and Seed Data
-- This script is intended as project documentation and optional database bootstrap.
DROP DATABASE IF EXISTS bus_management_db;

CREATE DATABASE IF NOT EXISTS bus_management_db;
USE bus_management_db;

-- 1. Roles
CREATE TABLE IF NOT EXISTS roles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
) ENGINE=InnoDB;

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    role_id BIGINT,
    status ENUM('ACTIVE', 'INACTIVE', 'LOCKED') DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

-- 3. Employees
CREATE TABLE IF NOT EXISTS employees (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    employee_type ENUM('DRIVER', 'ASSISTANT', 'TECHNICIAN', 'DISPATCHER', 'MANAGER') NOT NULL,
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- 4. Routes
CREATE TABLE IF NOT EXISTS routes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL CHECK (distance_km > 0),
    estimated_duration_min INT NOT NULL CHECK (estimated_duration_min > 0),
    base_price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
) ENGINE=InnoDB;

-- 5. Buses
CREATE TABLE IF NOT EXISTS buses (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    bus_type ENUM('LIMOUSINE', 'SLEEPER', 'SEAT'),
    total_seats INT NOT NULL,
    status ENUM('AVAILABLE', 'RUNNING', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    last_maintenance_date DATE,
    insurance_expiry DATE
) ENGINE=InnoDB;

-- 6. Seats
CREATE TABLE IF NOT EXISTS seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bus_id BIGINT,
    seat_number VARCHAR(10) NOT NULL,
    position_x INT,
    position_y INT,
    CONSTRAINT fk_seat_bus FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
    UNIQUE(bus_id, seat_number)
) ENGINE=InnoDB;

-- 7. Trips
CREATE TABLE IF NOT EXISTS trips (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    route_id BIGINT,
    bus_id BIGINT,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME,
    status ENUM('SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'DELAYED') DEFAULT 'SCHEDULED',
    actual_departure DATETIME,
    actual_arrival DATETIME,
    CONSTRAINT fk_trip_route FOREIGN KEY (route_id) REFERENCES routes(id),
    CONSTRAINT fk_trip_bus FOREIGN KEY (bus_id) REFERENCES buses(id)
) ENGINE=InnoDB;

-- 8. Trip assignments
CREATE TABLE IF NOT EXISTS trip_assignments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id BIGINT,
    employee_id BIGINT,
    assignment_role ENUM('DRIVER', 'ASSISTANT'),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_assign_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_emp FOREIGN KEY (employee_id) REFERENCES employees(id),
    UNIQUE(trip_id, employee_id),
    UNIQUE(trip_id, assignment_role)
) ENGINE=InnoDB;

-- 9. Passengers
CREATE TABLE IF NOT EXISTS passengers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    id_card VARCHAR(20),
    CONSTRAINT fk_passenger_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- 10. Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id BIGINT,
    seat_id BIGINT,
    passenger_id BIGINT,
    price DECIMAL(10,2) NOT NULL,
    status ENUM('BOOKED', 'HOLD', 'CONFIRMED', 'EXPIRED', 'PAID', 'CANCELLED', 'REFUNDED') DEFAULT 'BOOKED',
    booked_by BIGINT,
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    CONSTRAINT fk_ticket_trip FOREIGN KEY (trip_id) REFERENCES trips(id),
    CONSTRAINT fk_ticket_seat FOREIGN KEY (seat_id) REFERENCES seats(id),
    CONSTRAINT fk_ticket_pass FOREIGN KEY (passenger_id) REFERENCES passengers(id),
    UNIQUE(trip_id, seat_id)
) ENGINE=InnoDB;

-- 11. Payments
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id BIGINT UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('CASH', 'CARD', 'MOMO', 'BANK'),
    status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'PENDING',
    transaction_code VARCHAR(100),
    paid_at DATETIME,
    CONSTRAINT fk_payment_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 12. Cargo
CREATE TABLE IF NOT EXISTS cargos (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    cargo_type VARCHAR(100),
    weight DECIMAL(10,2),
    fee DECIMAL(10,2) NOT NULL,
    status ENUM('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cargo_trip FOREIGN KEY (trip_id) REFERENCES trips(id)
) ENGINE=InnoDB;

-- 13. Maintenance
CREATE TABLE IF NOT EXISTS maintenance (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    bus_id BIGINT,
    description TEXT,
    cost DECIMAL(12,2),
    maintenance_date DATE,
    status ENUM('SCHEDULED', 'IN_PROGRESS', 'COMPLETED'),
    CONSTRAINT fk_maint_bus FOREIGN KEY (bus_id) REFERENCES buses(id)
) ENGINE=InnoDB;

-- 14. Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(20),
    table_name VARCHAR(50),
    record_id BIGINT,
    old_values JSON,
    new_values JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Sample seed data for roles, users, employees, routes, buses, trips, and assignments.
INSERT IGNORE INTO roles (name, description) VALUES
    ('ADMIN', 'Administrator with full access'),
    ('STAFF', 'Operational staff with dispatch, reporting, maintenance and ticket access'),
    ('CUSTOMER', 'Customer account');

INSERT IGNORE INTO users (username, password_hash, email, phone, role_id, status) VALUES
    ('admin', '$2a$10$examplehashedpasswordadmin', 'admin@bus.com', '0123456789', (SELECT id FROM roles WHERE name = 'ADMIN'), 'ACTIVE'),
    ('dispatcher', '$2a$10$examplehashedpassworddisp', 'dispatcher@bus.com', '0123456789', (SELECT id FROM roles WHERE name = 'STAFF'), 'ACTIVE'),
    ('manager', '$2a$10$examplehashedpasswordmgr', 'manager@bus.com', '0123456789', (SELECT id FROM roles WHERE name = 'STAFF'), 'ACTIVE'),
    ('driver1', '$2a$10$examplehashedpassworddrv', 'driver1@bus.com', '0123456789', (SELECT id FROM roles WHERE name = 'STAFF'), 'ACTIVE'),
    ('assistant1', '$2a$10$examplehashedpasswordast', 'assistant1@bus.com', '0123456789', (SELECT id FROM roles WHERE name = 'STAFF'), 'ACTIVE');

INSERT IGNORE INTO employees (user_id, full_name, phone, employee_type, status) VALUES
    ((SELECT id FROM users WHERE username = 'dispatcher'), 'Le Quoc Huy', '0123456789', 'DISPATCHER', 'ACTIVE'),
    ((SELECT id FROM users WHERE username = 'manager'), 'Pham Minh Anh', '0123456789', 'MANAGER', 'ACTIVE'),
    ((SELECT id FROM users WHERE username = 'driver1'), 'Nguyen Van Tai', '0123456789', 'DRIVER', 'ACTIVE'),
    ((SELECT id FROM users WHERE username = 'assistant1'), 'Tran Thi Huong', '0123456789', 'ASSISTANT', 'ACTIVE');

INSERT IGNORE INTO routes (origin, destination, distance_km, estimated_duration_min, base_price, is_active) VALUES
    ('Hà Nội', 'TP.HCM', 1700.00, 2400, 500000.00, TRUE),
    ('Hà Nội', 'Đà Nẵng', 800.00, 1200, 300000.00, TRUE),
    ('TP.HCM', 'Đà Nẵng', 900.00, 1300, 350000.00, TRUE),
    ('Hà Nội', 'Hải Phòng', 100.00, 120, 80000.00, TRUE);

INSERT IGNORE INTO buses (license_plate, bus_type, total_seats, status) VALUES
    ('29A-12345', 'SLEEPER', 40, 'AVAILABLE'),
    ('30A-67890', 'SEAT', 45, 'AVAILABLE'),
    ('51A-11111', 'LIMOUSINE', 30, 'AVAILABLE');

INSERT IGNORE INTO trips (route_id, bus_id, departure_time, arrival_time, status) VALUES
    ((SELECT id FROM routes WHERE origin = 'Hà Nội' AND destination = 'TP.HCM'), (SELECT id FROM buses WHERE license_plate = '29A-12345'), NOW() + INTERVAL 2 HOUR, NOW() + INTERVAL 26 HOUR, 'SCHEDULED');

INSERT IGNORE INTO trip_assignments (trip_id, employee_id, assignment_role) VALUES
    ((SELECT id FROM trips WHERE route_id = (SELECT id FROM routes WHERE origin = 'Hà Nội' AND destination = 'TP.HCM') LIMIT 1), (SELECT id FROM employees WHERE employee_type = 'DRIVER' LIMIT 1), 'DRIVER'),
    ((SELECT id FROM trips WHERE route_id = (SELECT id FROM routes WHERE origin = 'Hà Nội' AND destination = 'TP.HCM') LIMIT 1), (SELECT id FROM employees WHERE employee_type = 'ASSISTANT' LIMIT 1), 'ASSISTANT');

-- Triggers for ticket and payment business logic.
DELIMITER //
CREATE TRIGGER after_payment_success
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    IF NEW.status = 'SUCCESS' THEN
        UPDATE tickets SET status = 'PAID', paid_at = NOW()
        WHERE id = NEW.ticket_id;
    END IF;
END;//
DELIMITER ;

DELIMITER //
CREATE TRIGGER before_ticket_insert
BEFORE INSERT ON tickets
FOR EACH ROW
BEGIN
    DECLARE trip_time DATETIME;
    SELECT departure_time INTO trip_time FROM trips WHERE id = NEW.trip_id;
    IF NOW() > DATE_SUB(trip_time, INTERVAL 15 MINUTE) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Khong the dat ve sat gio khoi hanh (<15p)!';
    END IF;
END;//
DELIMITER ;
