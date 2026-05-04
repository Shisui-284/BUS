-- ========================================================
-- GIAI ĐOẠN 1: DỌN DẸP DATABASE CŨ
-- Chạy script này để xóa toàn bộ dữ liệu STAFF cũ
-- ========================================================

-- Bước 1: Xóa STAFF users (các user có role_id = STAFF)
-- Tìm role_id của STAFF trước
SELECT id, name FROM roles WHERE name = 'STAFF';

-- Xóa users có role STAFF
DELETE FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'STAFF');

-- Bước 2: Xóa role STAFF
DELETE FROM roles WHERE name = 'STAFF';

-- Bước 3: Xóa bảng employees (JPA không tự xóa khi xóa entity)
DROP TABLE IF EXISTS employees;

-- Bước 4: Xóa bảng trip_assignments (JPA không tự xóa khi xóa entity)
DROP TABLE IF EXISTS trip_assignments;

-- Bước 5: Kiểm tra kết quả
SELECT 'Roles remaining:' AS info;
SELECT id, name FROM roles;

SELECT 'Users remaining:' AS info;
SELECT id, username, status FROM users;
