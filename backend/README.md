# Xe Khach Backend API

Backend server cho hệ thống quản lý xe khách liên tỉnh.

## Cài đặt

```bash
cd backend
mvn clean install
```

## Chạy server

### Development mode (recommended)

```bash
cd backend
mvn spring-boot:run
```

Server sẽ chạy trên `http://localhost:8080`

## API Endpoints

### Authentication

#### Đăng ký

```
POST /api/public/auth/register
Content-Type: application/json

{
  "fullName": "Nguyễn Văn A",
  "username": "nguyenvana",
  "email": "nguyenvana@example.com",
  "password": "password123",
  "role": "CUSTOMER"
}
```

#### Đăng nhập

```
POST /api/public/auth/login
Content-Type: application/json

{
  "username": "nguyenvana",
  "password": "password123",
  "role": "CUSTOMER"
}
```

#### Lấy thông tin profile (cần token)

```
GET /api/auth/profile
Authorization: Bearer <token>
```

### Health Check

```
GET /api/health
```

### Core Dispatch APIs

#### Lấy danh sách chuyến (lọc theo ngày/tuyến/trạng thái)

```
GET /api/trips?date=2026-04-22&routeId=1&status=SCHEDULED
Authorization: Bearer <token>
```

#### Tạo chuyến mới

```
POST /api/trips
Authorization: Bearer <token>
Content-Type: application/json

{
  "routeId": 1,
  "busId": 1,
  "departureTime": "2026-04-22T08:00:00",
  "arrivalTime": "2026-04-22T14:00:00",
  "status": "SCHEDULED"
}
```

#### Phân công nhân sự cho chuyến

```
POST /api/trip-assignments
Authorization: Bearer <token>
Content-Type: application/json

{
  "tripId": 1,
  "employeeId": 1,
  "role": "DRIVER"
}
```

Nếu nhân sự bị trùng lịch, API sẽ trả `409 Conflict` với JSON lỗi có `message`.

#### Lấy nhân sự available theo khoảng thời gian

```
GET /api/employees/available?from=2026-04-22T08:00:00&to=2026-04-22T14:00:00&role=DRIVER
Authorization: Bearer <token>
```

## Default Users

Server sẽ tự động tạo các tài khoản mặc định (theo `DataInitializer`):

- **admin** / **ChangeMe@123** (ADMIN)
- **dispatcher** / **ChangeMe@123** (STAFF)
- **manager** / **ChangeMe@123** (STAFF)
- **driver1** / **ChangeMe@123** (STAFF)
- **assistant1** / **ChangeMe@123** (STAFF)

Password mặc định được cấu hình qua biến `SEED_DEFAULT_PASSWORD` trong `application.properties`, mặc định là `ChangeMe@123`.

Tài khoản **CUSTOMER** được tạo thông qua API đăng ký `POST /api/public/auth/register`.

## Database

Sử dụng MySQL và JPA/Hibernate theo cấu hình trong `src/main/resources/application.properties`.

## Environment Variables

Bạn có thể cung cấp biến môi trường `JWT_SECRET` để ghi đè cấu hình mặc định trong `application.properties`:

```bash
export JWT_SECRET=your-super-secret-jwt-key
```

Trên Windows PowerShell:

```powershell
$env:JWT_SECRET = "your-super-secret-jwt-key"
```

## CORS

Server cho phép kết nối từ:

- `http://localhost:4173` (Vite dev server)
- `http://localhost:4174` (Vite dev server)
- `http://localhost:3000` (Alternative port)
