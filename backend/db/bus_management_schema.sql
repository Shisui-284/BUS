-- Bus Management Database Schema and Seed Data (SQL Server Version)
-- This script is intended as project documentation and optional database bootstrap.

USE master;
GO

-- Drop database if it exists (Requires SQL Server 2016+)
DROP DATABASE IF EXISTS bus_management_db;
GO

CREATE DATABASE bus_management_db;
GO

USE bus_management_db;
GO

-- 1. Roles
IF OBJECT_ID('roles', 'U') IS NULL
CREATE TABLE roles (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);
GO

-- 2. Users
IF OBJECT_ID('users', 'U') IS NULL
CREATE TABLE users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    role_id BIGINT,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED')),
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id)
);
GO

-- 3. Employees
IF OBJECT_ID('employees', 'U') IS NULL
CREATE TABLE employees (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    employee_type VARCHAR(20) NOT NULL CHECK (employee_type IN ('DRIVER', 'ASSISTANT', 'TECHNICIAN', 'DISPATCHER', 'MANAGER')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    CONSTRAINT fk_employee_user FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

-- 4. Routes
IF OBJECT_ID('routes', 'U') IS NULL
CREATE TABLE routes (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    distance_km DECIMAL(10,2) NOT NULL CHECK (distance_km > 0),
    estimated_duration_min INT NOT NULL CHECK (estimated_duration_min > 0),
    base_price DECIMAL(10,2) NOT NULL,
    is_active BIT DEFAULT 1
);
GO

-- 5. Buses
IF OBJECT_ID('buses', 'U') IS NULL
CREATE TABLE buses (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    license_plate VARCHAR(20) NOT NULL UNIQUE,
    bus_type VARCHAR(20) CHECK (bus_type IN ('LIMOUSINE', 'SLEEPER', 'SEAT')),
    total_seats INT NOT NULL,
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RUNNING', 'MAINTENANCE')),
    last_maintenance_date DATE,
    insurance_expiry DATE
);
GO

-- 6. Seats
IF OBJECT_ID('seats', 'U') IS NULL
CREATE TABLE seats (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    bus_id BIGINT,
    seat_number VARCHAR(10) NOT NULL,
    position_x INT,
    position_y INT,
    CONSTRAINT fk_seat_bus FOREIGN KEY (bus_id) REFERENCES buses(id) ON DELETE CASCADE,
    UNIQUE(bus_id, seat_number)
);
GO

-- 7. Trips
IF OBJECT_ID('trips', 'U') IS NULL
CREATE TABLE trips (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    route_id BIGINT,
    bus_id BIGINT,
    departure_time DATETIME NOT NULL,
    arrival_time DATETIME,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'DELAYED')),
    actual_departure DATETIME,
    actual_arrival DATETIME,
    CONSTRAINT fk_trip_route FOREIGN KEY (route_id) REFERENCES routes(id),
    CONSTRAINT fk_trip_bus FOREIGN KEY (bus_id) REFERENCES buses(id)
);
GO

-- 8. Trip assignments
IF OBJECT_ID('trip_assignments', 'U') IS NULL
CREATE TABLE trip_assignments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    trip_id BIGINT,
    employee_id BIGINT,
    assignment_role VARCHAR(20) CHECK (assignment_role IN ('DRIVER', 'ASSISTANT')),
    assigned_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT fk_assign_trip FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
    CONSTRAINT fk_assign_emp FOREIGN KEY (employee_id) REFERENCES employees(id),
    UNIQUE(trip_id, employee_id),
    UNIQUE(trip_id, assignment_role)
);
GO

-- 9. Passengers
IF OBJECT_ID('passengers', 'U') IS NULL
CREATE TABLE passengers (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    id_card VARCHAR(20),
    CONSTRAINT fk_passenger_user FOREIGN KEY (user_id) REFERENCES users(id)
);
GO

-- 10. Tickets
IF OBJECT_ID('tickets', 'U') IS NULL
CREATE TABLE tickets (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    trip_id BIGINT,
    seat_id BIGINT,
    passenger_id BIGINT,
    price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'BOOKED' CHECK (status IN ('BOOKED', 'HOLD', 'CONFIRMED', 'EXPIRED', 'PAID', 'CANCELLED', 'REFUNDED')),
    booked_by BIGINT,
    booked_at DATETIME DEFAULT GETDATE(),
    paid_at DATETIME,
    CONSTRAINT fk_ticket_trip FOREIGN KEY (trip_id) REFERENCES trips(id),
    CONSTRAINT fk_ticket_seat FOREIGN KEY (seat_id) REFERENCES seats(id),
    CONSTRAINT fk_ticket_pass FOREIGN KEY (passenger_id) REFERENCES passengers(id),
    UNIQUE(trip_id, seat_id)
);
GO

-- 11. Payments
IF OBJECT_ID('payments', 'U') IS NULL
CREATE TABLE payments (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    ticket_id BIGINT UNIQUE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('CASH', 'CARD', 'MOMO', 'BANK')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    transaction_code VARCHAR(100),
    paid_at DATETIME,
    CONSTRAINT fk_payment_ticket FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
);
GO

-- 12. Cargo
IF OBJECT_ID('cargos', 'U') IS NULL
CREATE TABLE cargos (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    trip_id BIGINT NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    receiver_name VARCHAR(100) NOT NULL,
    receiver_phone VARCHAR(20) NOT NULL,
    cargo_type VARCHAR(100),
    weight DECIMAL(10,2),
    fee DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED')),
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT fk_cargo_trip FOREIGN KEY (trip_id) REFERENCES trips(id)
);
GO

-- 13. Maintenance
IF OBJECT_ID('maintenance', 'U') IS NULL
CREATE TABLE maintenance (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    bus_id BIGINT,
    description TEXT,
    cost DECIMAL(12,2),
    maintenance_date DATE,
    status VARCHAR(20) CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED')),
    CONSTRAINT fk_maint_bus FOREIGN KEY (bus_id) REFERENCES buses(id)
);
GO

-- 14. Audit logs
IF OBJECT_ID('audit_logs', 'U') IS NULL
CREATE TABLE audit_logs (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(20),
    table_name VARCHAR(50),
    record_id BIGINT,
    old_values NVARCHAR(MAX), -- Thay JSON bằng NVARCHAR(MAX)
    new_values NVARCHAR(MAX), -- Thay JSON bằng NVARCHAR(MAX)
    timestamp DATETIME DEFAULT GETDATE()
);
GO

-- ==========================================
-- Sample seed data 
-- ==========================================

INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Administrator with full access'),
    ('STAFF', 'Operational staff with dispatch, reporting, maintenance and ticket access'),
    ('CUSTOMER', 'Customer account');
GO

-- Mapping Role IDs: ADMIN=1, STAFF=2, CUSTOMER=3
INSERT INTO users (username, password_hash, email, phone, role_id, status) VALUES
    ('admin', '$2a$10$examplehashedpasswordadmin', 'admin@bus.com', '0123456789', 1, 'ACTIVE'),
    ('dispatcher', '$2a$10$examplehashedpassworddisp', 'dispatcher@bus.com', '0123456789', 2, 'ACTIVE'),
    ('manager', '$2a$10$examplehashedpasswordmgr', 'manager@bus.com', '0123456789', 2, 'ACTIVE'),
    ('driver1', '$2a$10$examplehashedpassworddrv', 'driver1@bus.com', '0123456789', 2, 'ACTIVE'),
    ('assistant1', '$2a$10$examplehashedpasswordast', 'assistant1@bus.com', '0123456789', 2, 'ACTIVE');
GO

-- Mapping User IDs: dispatcher=2, manager=3, driver1=4, assistant1=5
INSERT INTO employees (user_id, full_name, phone, employee_type, status) VALUES
    (2, 'Le Quoc Huy', '0123456789', 'DISPATCHER', 'ACTIVE'),
    (3, 'Pham Minh Anh', '0123456789', 'MANAGER', 'ACTIVE'),
    (4, 'Nguyen Van Tai', '0123456789', 'DRIVER', 'ACTIVE'),
    (5, 'Tran Thi Huong', '0123456789', 'ASSISTANT', 'ACTIVE');
GO

INSERT INTO routes (origin, destination, distance_km, estimated_duration_min, base_price, is_active) VALUES
    ('Hà Nội', 'TP.HCM', 1700.00, 2400, 500000.00, 1),
    ('Hà Nội', 'Đà Nẵng', 800.00, 1200, 300000.00, 1),
    ('TP.HCM', 'Đà Nẵng', 900.00, 1300, 350000.00, 1),
    ('Hà Nội', 'Hải Phòng', 100.00, 120, 80000.00, 1);
GO

INSERT INTO buses (license_plate, bus_type, total_seats, status) VALUES
    ('29A-12345', 'SLEEPER', 40, 'AVAILABLE'),
    ('30A-67890', 'SEAT', 45, 'AVAILABLE'),
    ('51A-11111', 'LIMOUSINE', 30, 'AVAILABLE');
GO

-- Mapping Route=1, Bus=1
INSERT INTO trips (route_id, bus_id, departure_time, arrival_time, status) VALUES
    (1, 1, DATEADD(HOUR, 2, GETDATE()), DATEADD(HOUR, 26, GETDATE()), 'SCHEDULED');
GO

-- Mapping Trip=1, Driver Emp_ID=3, Assistant Emp_ID=4
INSERT INTO trip_assignments (trip_id, employee_id, assignment_role) VALUES
    (1, 3, 'DRIVER'),
    (1, 4, 'ASSISTANT');
GO

-- ==========================================
-- Triggers for ticket and payment logic
-- ==========================================

CREATE TRIGGER trg_after_payment_success
ON payments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF UPDATE(status)
    BEGIN
        UPDATE t
        SET t.status = 'PAID', t.paid_at = GETDATE()
        FROM tickets t
        INNER JOIN INSERTED i ON t.id = i.ticket_id
        WHERE i.status = 'SUCCESS';
    END
END;
GO

CREATE TRIGGER trg_before_ticket_insert
ON tickets
AFTER INSERT -- SQL Server sử dụng AFTER trigger kết hợp ROLLBACK để mô phỏng BEFORE logic
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM INSERTED i
        INNER JOIN trips t ON i.trip_id = t.id
        WHERE GETDATE() > DATEADD(MINUTE, -15, t.departure_time)
    )
    BEGIN
        RAISERROR('Khong the dat ve sat gio khoi hanh (<15p)!', 16, 1);
        ROLLBACK TRANSACTION;
    END
END;
GO