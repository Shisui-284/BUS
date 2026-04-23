-- Normalize legacy roles to the 3-role model: ADMIN, STAFF, CUSTOMER.
-- Run once on an existing database before or after deploying the app.

START TRANSACTION;

INSERT IGNORE INTO roles (name, description)
VALUES
    ('ADMIN', 'Administrator with full access'),
    ('STAFF', 'Operational staff with dispatch, reporting, maintenance and ticket access'),
    ('CUSTOMER', 'Customer account');

UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'STAFF')
WHERE role_id IN (
    SELECT id FROM roles
    WHERE name IN ('DISPATCHER', 'MANAGER', 'TECHNICIAN', 'TICKET_AGENT', 'DRIVER', 'ASSISTANT')
);

DELETE FROM roles
WHERE name IN ('DISPATCHER', 'MANAGER', 'TECHNICIAN', 'TICKET_AGENT', 'DRIVER', 'ASSISTANT');

COMMIT;