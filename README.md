<div align="center">

# 🚌 XeKhách Pro — Bus Management & Online Ticketing Platform

### Hệ thống quản lý & đặt vé xe khách trực tuyến — Spring Boot 3.2 · Java 17 · React 18 · VNPay · Google OAuth · SSE Realtime

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.0-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![JWT](https://img.shields.io/badge/JWT-JJWT%200.11.5-000000?logo=jsonwebtokens&logoColor=white)]()
[![VNPay](https://img.shields.io/badge/Payment-VNPay%20v2.1.0-0072BC)](https://vnpay.vn)
[![Google OAuth](https://img.shields.io/badge/Auth-Google%20OAuth-4285F4?logo=google&logoColor=white)](https://developers.google.com/identity)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![Status](https://img.shields.io/badge/status-production%20ready-success)]()

> *"Không chỉ là đặt vé — đó là cả một bộ điều phối tuyến xe thời gian thực: từ đăng nhập một chạm qua Google OAuth, chọn điểm đón cụ thể, giữ ghế bằng pessimistic lock (SELECT FOR UPDATE), thanh toán online có xác thực chữ ký HMAC-SHA512, cho đến dashboard admin đẩy notification real-time qua Server-Sent Events."*

[Demo](#-demo-flow) · [Tính năng](#-tính-năng-nổi-bật) · [Kiến trúc](#-kiến-trúc-hệ-thống) · [Cài đặt](#-cài-đặt--chạy-nhanh) · [API](#-api-endpoints) · [Sơ đồ vé](#-sơ-đồ-vòng-đời-vé) · [Demo](#-ảnh-minh-hoạ)

</div>

---

## 📖 Mục lục

- [🎬 Tổng quan dự án](#-tổng-quan-dự-án)
- [✨ Tính năng nổi bật](#-tính-năng-nổi-bật)
- [🏗️ Kiến trúc hệ thống](#-kiến-trúc-hệ-thống)
- [🧰 Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [🚀 Cài đặt & Chạy nhanh](#-cài-đặt--chạy-nhanh)
- [🔐 Cấu hình môi trường](#-cấu-hình-môi-trường)
- [📂 Cấu trúc thư mục](#-cấu-trúc-thư-mục)
- [🎫 Sơ đồ vòng đời vé](#-sơ-đồ-vòng-đời-vé)
- [💳 Luồng thanh toán VNPay](#-luồng-thanh-toán-vnpay)
- [🔔 Hệ thống SSE Notification](#-hệ-thống-sse-notification)
- [📡 API Endpoints](#-api-endpoints)
- [👤 Tài khoản mặc định](#-tài-khoản-mặc-định)
- [🧪 Testing & Scripts](#-testing--scripts)
- [🛠️ Troubleshooting](#-troubleshooting)
- [📜 License](#-license)

---

## 🎬 Tổng quan dự án

**XeKhách Pro** là một hệ thống **full-stack** đặt vé & quản lý xe khách, được thiết kế theo kiến trúc microservices-lite với 2 module chính:

| Module | Công nghệ | Vai trò |
|---|---|---|
| **Backend** (`/backend`) | Spring Boot 3.2 + Spring Security + JPA/Hibernate | REST API, JWT auth, VNPay integration, SSE broadcaster |
| **Frontend** (`/`) | React 18 + Vite + TypeScript + Tailwind + Zustand | UI/UX, real-time dashboard, booking flow 6 bước |

### 🧠 Triết lý thiết kế

1. **UX-first**: Mỗi flow đặt vé chia nhỏ thành **6 bước rõ ràng** (Tìm chuyến → Điểm đón → Điểm trả → Chọn ghế → Xác nhận → Hoàn tất) với thanh stepper trực quan.
2. **Race-condition-safe**: Hệ thống đặt vé dùng **pessimistic lock với `findByIdForUpdate` + `@Lock(LockModeType.PESSIMISTIC_WRITE)`** (SELECT FOR UPDATE) trên bảng `seats` — hai user không thể cùng đặt 1 ghế trong cùng 1 transaction.
3. **Idempotent by design**: VNPay IPN callback có thể gọi nhiều lần; hệ thống kiểm tra trạng thái `SUCCESS` để return sớm (`return ipnOk()`).
4. **Real-time admin**: Server-Sent Events đẩy notification về admin trong **< 1 giây** khi có vé mới hoặc VNPay thành công.
5. **Defense in depth**: 3 lớp chống spoof — JWT, HMAC-SHA512 checksum VNPay, CORS allowlist chặt.

### 🎯 Đối tượng sử dụng

Hệ thống hỗ trợ 3 role người dùng (`ADMIN`, `CUSTOMER`, `DISPATCHER` — khai báo trong bảng `roles`):

- 🛒 **Khách hàng (CUSTOMER)**: Đăng nhập nhanh bằng tài khoản thường **hoặc Google OAuth**, tìm chuyến, chọn ghế, đặt vé, thanh toán online (VNPay) hoặc COD.
- 👨‍💼 **Quản trị viên (ADMIN)**: Quản lý chuyến, xe, tuyến, nhân sự, vé, dashboard realtime, hộp thư feedback.
- 🚚 **Điều phối viên (DISPATCHER)**: Dashboard điều phối chuyến sắp chạy, phân công nhanh tài xế/phụ xe (xem `/api/trips` và `DispatcherDashboardPage`).

---

## ✨ Tính năng nổi bật

### 🌟 Phía Khách hàng

| Tính năng | Mô tả chi tiết |
|---|---|
| 🔐 **Đăng nhập một chạm với Google** | Nút Google Login trên form đăng nhập — xác thực ID Token qua Google tokeninfo endpoint, backend tự động tạo CUSTOMER mới nếu email chưa tồn tại, đồng thời tạo hồ sơ `Passenger` mặc định. |
| 🔍 **Tìm chuyến thông minh** | Lọc theo **15 thành phố lớn** × 80+ điểm đón/trả cụ thể. Tự động gợi ý tuyến theo ngày. |
| 🎯 **Sơ đồ ghế trực quan** | Grid 5 cột cho Limousine/Sleeper/Seat; phân biệt 3 trạng thái màu: xanh (trống) / đỏ (đã đặt) / xanh dương (đang chọn). |
| 📍 **Điểm đón/trả chi tiết** | City picker cho **15 thành phố lớn** × 5-8 điểm đón cụ thể mỗi nơi (Văn phòng, Bến xe, Trạm xăng, Đại học, Trung tâm thương mại...). |
| 💳 **Thanh toán linh hoạt** | 2 hướng: **VNPay** (ATM nội địa, Visa/Master, QR ngân hàng — sandbox) và **CASH/MOMO/BANK inline** (thanh toán ngay trên web hoặc khi lên xe). |
| 🎫 **Mã vé tự động** | Format `BUS-YYYYMMDD-XXXXX` — dễ tra cứu, dễ in. |
| 🚫 **Hủy vé thông minh** | Cho phép hủy khi vé đang `HOLD`; chặn hủy nếu vé đã `PAID`/`CONFIRMED` hoặc chuyến đã chạy/hoàn thành. |
| 👤 **Quản lý hồ sơ** | Cập nhật họ tên, SĐT; hệ thống tự lưu vào bảng `passengers` qua `PUT /api/auth/profile`. |
| 💬 **Gửi Feedback** | Modal phản hồi nhanh: chọn danh mục (Khiếu nại / Góp ý / Khen / Hỏi / Khác), chủ đề, nội dung, đánh giá 1–5 sao, liên kết chuyến cụ thể (tuỳ chọn). Theo dõi trạng thái xử lý ngay trong hồ sơ. |

### 🎛️ Phía Quản trị viên

| Tính năng | Mô tả chi tiết |
|---|---|
| 📊 **Dashboard tổng quan** | 4 stat cards: Users / Buses / Routes / Trips hôm nay + 2 biểu đồ phân bổ + bảng cảnh báo bảo hiểm. |
| 🔔 **SSE Real-time Notification** | Toast popup khi có vé mới (COD), VNPay thành công hoặc feedback mới. Click → mở modal chi tiết. |
| 🔒 **Quản lý tài khoản** | CRUD users, khóa/mở khóa, reset password, soft-delete (không xóa vĩnh viễn), **phân trang**. |
| 🚌 **Quản lý đội xe** | CRUD 20+ xe với 3 loại: **LIMOUSINE / SLEEPER / SEAT**, theo dõi bảo hiểm & bảo trì, **phân trang**. |
| 🗺️ **Quản lý tuyến & chuyến** | Tạo tuyến mới inline khi tạo chuyến; kiểm tra **trùng lịch xe** (overlap detection); **phân trang** danh sách chuyến. |
| 👔 **Phân công nhân sự** | Gán 1 tài xế + 1 phụ xe cho mỗi chuyến; gợi ý top 5 tài xế kinh nghiệm cao; **phân trang** danh sách phân công. |
| 🎫 **Quản lý vé** | Bảng lọc theo trạng thái (HOLD/CONFIRMED/PAID/CANCELLED), xác nhận/hủy inline, đánh dấu PAID cho COD đã thu tiền mặt, **phân trang 10 vé/trang**. |
| 💺 **Sơ đồ ghế admin** | Modal hiển thị chi tiết từng ghế: ai đặt, SĐT, điểm đón/trả, phương thức thanh toán. |
| 💰 **Quản lý doanh thu** | Tính `estimatedRevenue` (giá × số ghế đặt) và `actualRevenue` (chỉ vé PAID). |
| 📈 **Trang doanh thu chuyên sâu** | Biểu đồ đường theo ngày/tuần/tháng + bar chart theo tuyến, summary cards (tổng / confirmed / pending / cancelled). |
| 📬 **Hộp thư Feedback** | Modal inbox: lọc theo trạng thái (NEW/READ/IN_PROGRESS/RESOLVED/CLOSED) / danh mục / ưu tiên (LOW/MEDIUM/HIGH), tìm kiếm full-text, reply nội tuyến, đổi status/priority qua `PATCH /api/admin/feedbacks/{id}/status`. |
| 📦 **Quản lý hàng hoá (Cargo)** | CRUD `/api/admin/cargo` — quản lý đơn hàng vận chuyển kèm theo chuyến. |
| 🔧 **Quản lý bảo trì (Maintenance)** | CRUD `/api/admin/maintenance` — lịch sử bảo trì xe, cảnh báo bảo hiểm sắp hết hạn hiển thị trên Dashboard. |
| 🛡️ **Phân quyền chặt** | `/api/admin/**` yêu cầu `ROLE_ADMIN`; `/api/private/**` yêu cầu `ROLE_CUSTOMER`; `/api/auth/profile` chỉ cần `authenticated()` (cả CUSTOMER lẫn ADMIN). |

### 🔒 Bảo mật & Toàn vẹn

- **JWT Bearer Token** với HMAC-SHA256, expire 1 giờ (configurable).
- **Spring Security** với filter chain riêng cho JWT (trước `AnonymousAuthenticationFilter`).
- **Google OAuth 2.0**: Verify ID Token qua `https://oauth2.googleapis.com/tokeninfo` trước khi cấp JWT nội bộ.
- **VNPay checksum** verify HMAC-SHA512 trên cả Return URL và IPN.
- **CORS** allowlist chặt qua env var `APP_CORS_ALLOWED_ORIGINS`.
- **Password hashing** bằng BCrypt (Spring Security default).
- **Soft-delete** user — giữ lại lịch sử, chỉ đánh dấu `INACTIVE`.

---

## 🏗️ Kiến trúc hệ thống

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              🌍 BROWSER (React 18)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Customer UI  │  │ Admin UI     │  │ Zustand Store│  │ Axios Client │    │
│  │ (Pink Theme) │  │ (Dark Sidebar│  │ (persist)    │  │ (JWT Bearer) │    │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘  └──────┬───────┘    │
└─────────┼─────────────────┼──────────────────────────────────────┼──────────┘
          │ HTTP/REST       │ HTTP/REST                           │
          │ (PUBLIC)        │ (PRIVATE/ADMIN)                     │ EventSource
          ▼                 ▼                                      ▼ SSE
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ⚙️  SPRING BOOT 3.2 BACKEND (port 8080)                    │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │  🔒 Spring Security Filter Chain                                       │  │
│  │  ├── JwtAuthenticationFilter   (parse Bearer → SecurityContext)       │  │
│  │  ├── AnonymousAuthenticationFilter                                       │  │
│  │  └── AuthorizationFilter (hasRole("ADMIN") / hasRole("CUSTOMER"))      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  │
│  │  📡 REST Controllers│  │  📡 SSE Broadcaster │  │  📡 VNPay Webhook   │  │
│  │  /api/public/**     │  │  /api/admin/notifi- │  │  /api/public/       │  │
│  │  ├── /auth/register  │  │  cations/stream     │  │  payment/vnpay/     │  │
│  │  ├── /auth/login     │  │  (EventSource +     │  │  ├── return (GET)   │  │
│  │  ├── /auth/google    │  │   ?access_token=)   │  │  └── ipn (POST)     │  │
│  │  ├── /trips/**       │  │                     │  │                     │  │
│  │  ├── /routes         │  │                     │  │                     │  │
│  │  └── /payment/vnpay/ │  │                     │  │                     │  │
│  │      return, ipn     │  │                     │  │                     │  │
│  │  /api/private/**     │  │                     │  │                     │  │
│  │  ├── /tickets/**     │  │                     │  │                     │  │
│  │  ├── /feedbacks/**   │  │                     │  │                     │  │
│  │  └── /payment/vnpay/ │  │                     │  │                     │  │
│  │      create          │  │                     │  │                     │  │
│  │  /api/admin/**       │  │                     │  │                     │  │
│  │  └── /tickets/{id}/  │  │                     │  │                     │  │
│  │      confirm/mark-   │  │                     │  │                     │  │
│  │      paid/cancel     │  │                     │  │                     │  │
│  └──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘  │
│             │                         │                         │             │
│  ┌──────────▼─────────────────────────▼─────────────────────────▼──────────┐  │
│  │                       💼 Service Layer (@Transactional)                │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │  │ UserService  │ │ TripService  │ │TicketService │ │VnpayService  │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │  │
│  │  │ AdminService │ │ RouteService │ │FeedbackService│ │PaymentService│  │  │
│  │  │ (1122 dòng!) │ │ (dropdown)   │ │ (reply+status)│ │              │  │  │
│  │  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘  │  │
│  │  ┌──────────────┐ ┌──────────────────────────────────────────────┐    │  │
│  │  │ JwtService   │ │ AdminNotificationService                    │    │  │
│  │  │ (HMAC-SHA256)│ │ (SseEmitter pool — CopyOnWriteArrayList)    │    │  │
│  │  └──────────────┘ └──────────────────────────────────────────────┘    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                  🗄️  Spring Data JPA Repositories (16)                  │  │
│  │  UserRepo · RoleRepo · BusRepo · SeatRepo (PESSIMISTIC_WRITE)          │  │
│  │  RouteRepo · TripRepo · TicketRepo · PaymentRepo · PassengerRepo       │  │
│  │  EmployeeRepo · AssignmentRepo · MaintenanceRepo · CargoRepo           │  │
│  │  FeedbackRepo · FeedbackReplyRepo · AuditLogRepo                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                       │                                       │
└───────────────────────────────────────┼───────────────────────────────────────┘
                                        ▼
                          ┌──────────────────────────┐
                          │   🐬 MySQL 8 Database    │
                          │   bus_management_db      │
                          │   (auto-create on start) │
                          │   ddl-auto=update        │
                          └──────────────────────────┘
                                        ▲
                                        │ (async IPN)
                          ┌─────────────┴────────────────┐
                          │   💳 VNPay Sandbox Gateway   │
                          │   sandbox.vnpayment.vn       │
                          │   API v2.1.0 + HMAC-SHA512   │
                          └──────────────────────────────┘
```

---

## 🧰 Công nghệ sử dụng

### Backend (Spring Boot 3.2)

| Layer | Công nghệ |
|---|---|
| Framework | Spring Boot 3.2.0 (Spring Web, Spring Security, Spring Data JPA, Spring Validation) |
| Language | Java 17 |
| ORM | Hibernate + Spring Data JPA |
| Database | MySQL 8.0 (Connector/J 8.0.33) |
| Auth | JWT (jjwt 0.11.5) + Spring Security |
| Auth | Google OAuth (verify ID Token qua `https://oauth2.googleapis.com/tokeninfo`) |
| Payment | VNPay sandbox API v2.1.0 |
| Real-time | Server-Sent Events (SseEmitter) |
| Build | Maven |
| Util | Lombok |

### Frontend (React 18)

| Layer | Công nghệ |
|---|---|
| Framework | React 18.3 + TypeScript 5.6 |
| Build | Vite 5.4 |
| Routing | React Router 6 |
| State | Zustand 4.5 (with persist middleware) |
| Data fetching | Axios + React Query 5 |
| UI | Tailwind CSS 3.4 + Lucide Icons |
| Charts | Recharts 2.8 |
| Toast | react-hot-toast 2.5 |
| Date | date-fns 4.1 |
| Realtime | EventSource (native browser API) |
| Auth UI | @react-oauth/google 0.13 (Google Login button + GoogleOAuthProvider) |

### 🎨 Hệ thống Theme (2 giao diện)

Hệ thống dùng **2 theme song song** — chuyển đổi tự động theo role:

| Theme | Audience | Màu chủ đạo | Class tiện ích |
|---|---|---|---|
| **Admin (Dark)** | Admin / Dispatcher | Tím đậm + xanh dương + amber | `.admin-card`, `.admin-input`, `.admin-button-primary`, `.admin-table` |
| **Customer (Pink)** | Khách đặt vé | Hồng pastel + coral | `.customer-card`, `.customer-input`, `.customer-btn-primary`, `.customer-layout` |

CSS variables (`--admin-*`, `--customer-*`) được khai báo trong `src/styles/index.css` và override theo selector `.theme-customer` / `.customer-layout`. Form inputs của khách dùng class `.customer-input` (đã được style riêng, không phụ thuộc vào `.customer-layout` cha).

---

## 🚀 Cài đặt & Chạy nhanh

### Yêu cầu hệ thống

| Tool | Version |
|---|---|
| Java JDK | 17+ |
| Maven | 3.8+ |
| Node.js | 18+ |
| MySQL | 8.0+ (hoặc dùng Docker) |
| Git | 2.30+ |

### Bước 1 — Clone & Cài đặt

```bash
git clone <repository-url>
cd BUS

# Cài backend dependencies
cd backend
mvn clean install -DskipTests
cd ..

# Cài frontend dependencies
npm install
```

### Bước 2 — Khởi động MySQL

```bash
# Cách 1: Nếu đã có MySQL local
mysql -u root -p

# Cách 2: Dùng Docker
docker run --name bus-mysql -e MYSQL_ROOT_PASSWORD=123456 \
  -p 3306:3306 -d mysql:8.0
```

### Bước 3 — Khởi động Backend (Terminal 1)

```bash
cd backend
mvn spring-boot:run
```

✅ Backend chạy ở `http://localhost:8080`  
✅ Database `bus_management_db` tự động được tạo  
✅ 4 routes + 20 buses + 20 employees (10 tài xế + 10 phụ xe) + admin user được seed tự động

### Bước 4 — Khởi động Frontend (Terminal 2)

```bash
npm run dev
```

✅ Frontend chạy ở `http://localhost:5173`

### Bước 5 — Truy cập

| Role | URL | Tài khoản |
|---|---|---|
| 👨‍💼 **Admin** | http://localhost:5173/auth/login | `admin` / `ChangeMe@123` |
| 🛒 **Customer** | http://localhost:5173/auth/register | Tự đăng ký — **hoặc** nhấn nút Google Login (cần cấu hình `VITE_GOOGLE_CLIENT_ID`) |

### Cấu hình Google OAuth (tuỳ chọn)

Tạo file `.env` ở thư mục gốc dự án (`D:\metbus\BUS\.env`) với nội dung:

```bash
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Lấy Client ID tại [Google Cloud Console → Credentials → OAuth 2.0 Client IDs](https://console.cloud.google.com/apis/credentials). Authorized JavaScript origins phải bao gồm `http://localhost:5173`. Sau khi tạo, **khởi động lại** `npm run dev` để Vite nhận env mới.

### Chạy full-stack 1 lệnh (tuỳ chọn)

```bash
npm run dev:full
```

Lệnh này dùng `concurrently` để chạy backend + frontend song song, tự động đợi backend ready qua `wait-on`.

---

## 🔐 Cấu hình môi trường

File cấu hình: `backend/src/main/resources/application.properties`

### Biến môi trường quan trọng

| Biến | Mặc định | Mô tả |
|---|---|---|
| `DB_USERNAME` | `root` | MySQL username |
| `DB_PASSWORD` | `123456` | MySQL password |
| `JWT_SECRET` | *(chuỗi 50 ký tự)* | Secret key cho JWT (≥ 32 ký tự) |
| `JWT_EXPIRATION_MS` | `3600000` | Token TTL (1 giờ = 3.600.000 ms) |
| `SEED_DEFAULT_PASSWORD` | `ChangeMe@123` | Mật khẩu seed cho admin user |
| `APP_CORS_ALLOWED_ORIGINS` | localhost + Cloudflare + ngrok | CORS allowlist (CSV) |
| `VNPAY_TMN_CODE` | `SY273SZH` | VNPay merchant code (sandbox) |
| `VNPAY_HASH_SECRET` | `SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT` | VNPay secret (sandbox) |
| `VNPAY_URL` | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` | Payment gateway URL (browser redirect) |
| `VNPAY_API_URL` | `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction` | API URL cho truy vấn giao dịch |
| `VNPAY_RETURN_URL` | Cloudflare tunnel | Frontend nhận kết quả (sau khi user thanh toán xong) |
| `VNPAY_IPN_URL` | Cloudflare tunnel | Server-to-server callback (IPN từ VNPay) |
| `VNPAY_EXPIRE_MINUTES` | `15` | URL thanh toán hết hạn sau N phút (ghi vào `vnp_ExpireDate`) |

### Biến môi trường Frontend (Vite)

Các biến này được đọc qua `import.meta.env` và phải khai báo trong file `.env` ở **thư mục gốc dự án** (`D:\metbus\BUS\.env`):

| Biến | Mặc định | Mô tả |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | *(không có — phải set)* | Google OAuth Client ID — lấy từ Google Cloud Console |
| `VITE_API_BASE_URL` | `/api` | Base URL cho axios. Mặc định dùng Vite proxy `/api` → `http://localhost:8080`. Set khi deploy tách backend (vd `https://api.yourdomain.com`) |

> **Lưu ý**: Các biến frontend phải có tiền tố `VITE_` để Vite expose chúng ra client bundle. Nếu đặt sai tên, code sẽ trả về `undefined` và Google Login sẽ không hoạt động. Sau khi đổi `.env`, **khởi động lại** `npm run dev` để Vite nhận env mới.

### Setup cho Production

```bash
export JWT_SECRET="$(openssl rand -base64 64)"
export DB_PASSWORD="your-strong-password"
export APP_CORS_ALLOWED_ORIGINS="https://yourdomain.com,https://admin.yourdomain.com"
export VNPAY_TMN_CODE="YOUR_PRODUCTION_TMN"
export VNPAY_HASH_SECRET="YOUR_PRODUCTION_SECRET"
export VNPAY_URL="https://vnpayment.vn/paymentv2/vpcpay.html"
export VNPAY_API_URL="https://vnpayment.vn/merchant_webapi/api/transaction"
export VNPAY_RETURN_URL="https://yourdomain.com/payment/vnpay-return"
export VNPAY_IPN_URL="https://api.yourdomain.com/api/public/payment/vnpay/ipn"

cd backend && mvn clean package -DskipTests
java -jar target/bus-management-0.0.1-SNAPSHOT.jar
```

---

## 📂 Cấu trúc thư mục

```
BUS/
├── 📁 backend/                              # Spring Boot 3.2 backend
│   ├── 📁 src/main/java/com/business/busmanagement/
│   │   ├── 📄 BusManagementApplication.java  # Main entry point (@SpringBootApplication)
│   │   ├── 📁 config/                        # Spring Security + JWT + Seed
│   │   │   ├── SecurityConfig.java           # 🔒 Role-based authorization (99 dòng, requestMatchers)
│   │   │   ├── JwtAuthenticationFilter.java  # 🔐 Parse Bearer → SecurityContext
│   │   │   ├── JwtAuthenticationEntryPoint.java  # 401 JSON response
│   │   │   ├── PasswordConfig.java           # 🔑 BCryptPasswordEncoder bean
│   │   │   ├── VnpayConfig.java              # 💳 @ConfigurationProperties cho VNPay
│   │   │   ├── DataInitializer.java          # 🌱 Seed 4 routes + 20 buses + 20 employees + admin user
│   │   │   ├── DatabaseInspector.java        # 🔍 Startup DB schema inspector
│   │   │   └── DatabaseMigrationConfig.java  # 🛠️ Auto-migrate khi Hibernate update
│   │   ├── 📁 controller/                    # REST endpoints (13 controllers)
│   │   │   ├── AuthController.java           # /api/public/auth/{register,login,google}
│   │   │   ├── AdminController.java          # /api/admin/** (CRUD users/buses/routes/trips/tickets/feedbacks + SSE)
│   │   │   ├── TicketController.java         # /api/public/trips/** + /api/private/tickets/**
│   │   │   ├── VnpayController.java          # /api/public/payment/vnpay/{return,ipn} + /api/private/payment/vnpay/create
│   │   │   ├── TripController.java           # /api/trips (dispatcher dùng chung)
│   │   │   ├── RouteController.java          # /api/routes (public dropdown cho form tạo chuyến)
│   │   │   ├── ProfileController.java        # /api/auth/profile (GET/PUT)
│   │   │   ├── TripAssignmentController.java # /api/admin/trip-assignments/{tripId}
│   │   │   ├── EmployeeController.java       # /api/admin/employees + /type/{type} + /top-experienced
│   │   │   ├── MaintenanceController.java    # /api/admin/maintenance CRUD
│   │   │   ├── CargoController.java          # /api/admin/cargo CRUD
│   │   │   ├── FeedbackController.java       # /api/private/feedbacks/** (customer side)
│   │   │   └── HealthController.java         # /api/health + /api/debug/dispatcher
│   │   ├── 📁 dto/                           # Request/Response DTOs (43+ files, 3 packages)
│   │   │   ├── (root: AuthResponse, GoogleAuthRequest, LoginRequest, RegisterRequest,
│   │   │   │    BookTicketRequest, PayTicketRequest, SeatStatusResponse, TicketResponse,
│   │   │   │    TripCreateRequest, TripResponse, TripSearchResponse, UpdateProfileRequest,
│   │   │   │    VnpayCreatePaymentRequest, VnpayPaymentResponse)
│   │   │   ├── 📁 admin/                     # 17 DTOs: AdminDashboard, BusDetail, BusList, CreateBus,
│   │   │   │                                 # CreateRoute, CreateUser, ResetPassword, RevenueStats,
│   │   │   │                                 # RouteDetail, RouteList, TicketDetail, TicketList,
│   │   │   │                                 # TripDetail, UpdateBus, UpdateRoute, UpdateUser,
│   │   │   │                                 # UserDetail, UserList
│   │   │   └── 📁 feedback/                  # 7 DTOs: CreateFeedback, CreateReply, FeedbackReply,
│   │   │                                     # FeedbackResponse, FeedbackSseEvent, FeedbackStats,
│   │   │                                     # UpdateFeedbackStatus
│   │   ├── 📁 exception/                     # Global error handling (@ControllerAdvice)
│   │   │   ├── GlobalExceptionHandler.java   # Xử lý tập trung → trả JSON {error, message, status}
│   │   │   ├── BusinessConflictException.java
│   │   │   └── ResourceNotFoundException.java
│   │   ├── 📁 model/                         # JPA entities (16 entities — 17 files vì có FeedbackReply)
│   │   │   ├── User.java  Role.java  Passenger.java
│   │   │   ├── Bus.java   Seat.java
│   │   │   ├── Route.java Trip.java
│   │   │   ├── Ticket.java Payment.java
│   │   │   ├── Employee.java TripAssignment.java
│   │   │   ├── Maintenance.java Cargo.java
│   │   │   ├── Feedback.java FeedbackReply.java
│   │   │   └── AuditLog.java
│   │   ├── 📁 repository/                    # Spring Data JPA repositories (16 repos)
│   │   │   ├── UserRepository, RoleRepository, PassengerRepository
│   │   │   ├── BusRepository, SeatRepository (có @Lock PESSIMISTIC_WRITE)
│   │   │   ├── RouteRepository, TripRepository
│   │   │   ├── TicketRepository, PaymentRepository
│   │   │   ├── EmployeeRepository, TripAssignmentRepository
│   │   │   ├── MaintenanceRepository, CargoRepository
│   │   │   ├── FeedbackRepository, FeedbackReplyRepository
│   │   │   └── AuditLogRepository
│   │   ├── 📁 service/                       # Business logic (@Transactional) — 9 services
│   │   │   ├── AdminService.java             # 🔥 1122 dòng - core admin logic (dashboard, stats)
│   │   │   ├── TicketService.java            # 🎫 PESSIMISTIC_WRITE booking, idempotent VNPay callback
│   │   │   ├── VnpayService.java             # 💳 HMAC-SHA512 + IPN handler + idempotency
│   │   │   ├── TripService.java              # 🚌 Overlap detection cho lịch xe
│   │   │   ├── RouteService.java             # 🗺️ getActiveRoutes() cho dropdown
│   │   │   ├── UserService.java
│   │   │   ├── JwtService.java               # 🔑 Generate/parse JWT (HMAC-SHA256)
│   │   │   ├── PaymentService.java           # 💰 Tạo & cập nhật Payment row
│   │   │   ├── FeedbackService.java          # 📬 CRUD feedback + reply thread
│   │   │   └── AdminNotificationService.java # 📡 SSE broadcaster (CopyOnWriteArrayList<SseEmitter>)
│   │   └── 📁 util/
│   │       ├── VnpayUtil.java                # 🔐 HMAC-SHA512, URL encoding theo chuẩn VNPay
│   │       └── RoleNormalizer.java           # Chuẩn hoá role name (ADMIN/CUSTOMER/DISPATCHER)
│   ├── 📁 src/main/resources/
│   │   └── application.properties            # ⚙️ Cấu hình DB/JWT/VNPay/CORS (53 dòng)
│   └── 📄 pom.xml                            # Maven config
│
├── 📁 src/                                   # React 18 frontend
│   ├── 📁 api/                               # Axios API clients (typed)
│   │   ├── apiClient.ts                      # 🌐 Axios instance + JWT interceptor + 401 auth:expired event
│   │   ├── auth.ts                           # 🔐 Login/Register/Google
│   │   ├── customer.ts                       # 🛒 Booking, my tickets, VNPay create
│   │   ├── admin.ts                          # 👨‍💼 Admin CRUD + SSE connector (EventSource)
│   │   ├── dispatcher.ts                     # 🚚 Dispatcher API
│   │   └── feedback.ts                       # 📬 Feedback (customer + admin)
│   ├── 📁 components/
│   │   ├── 📁 layout/                        # MainLayout.tsx, ProtectedRoute.tsx
│   │   ├── 📁 ui/                            # StatusBadge.tsx, Snowfall.tsx, Pagination.tsx
│   │   ├── 📁 admin/                         # EmployeeInfoSection.tsx, FeedbackInboxModal.tsx
│   │   ├── 📁 customer/                      # BookingHero.tsx
│   │   └── 📁 feedback/                      # FeedbackModal.tsx (customer submit)
│   ├── 📁 pages/
│   │   ├── 📁 auth/                          # LoginPage.tsx (Google login), RegisterPage.tsx
│   │   ├── 📁 customer/                      # CustomerBookingPage (1246 dòng!)
│   │   │   ├── CustomerBookingPage.tsx       # 🎯 6-step booking flow
│   │   │   ├── CustomerTicketsPage.tsx
│   │   │   └── CustomerProfilePage.tsx
│   │   ├── 📁 admin/                         # 9 admin pages
│   │   │   ├── AdminDashboardPage.tsx        # 📊 Realtime dashboard
│   │   │   ├── AdminUsersPage.tsx
│   │   │   ├── AdminBusesPage.tsx
│   │   │   ├── AdminTripsPage.tsx
│   │   │   ├── AdminTicketsPage.tsx
│   │   │   ├── AdminAssignmentsPage.tsx
│   │   │   ├── AdminRevenuePage.tsx          # 💰 Doanh thu chuyên sâu
│   │   │   ├── AdminRevenueStats.tsx         # 📈 Reusable revenue charts
│   │   │   └── TripSeatsModal.tsx            # 💺 Modal sơ đồ ghế admin
│   │   ├── 📁 dispatcher/
│   │   │   └── DispatcherDashboardPage.tsx   # 🚚 Điều phối chuyến
│   │   └── 📁 payment/
│   │       └── PaymentReturnPage.tsx         # 💳 VNPay return handler
│   ├── 📁 stores/                            # Zustand state
│   │   ├── authStore.ts                      # 🔐 JWT + user (with persist → localStorage)
│   │   └── dispatcherStore.ts
│   ├── 📁 styles/                            # index.css (CSS vars + theme overrides)
│   ├── 📁 types/                             # TypeScript types (UserRole, BusStatus, TicketStatus, ...)
│   ├── 📁 utils/
│   │   ├── apiError.ts                       # 🎯 Error message extractor (axios → string)
│   │   ├── constants.ts                      # ROLE_LABELS, STATUS_COLORS, formatStatusLabel
│   │   └── locations.ts                      # 🗺️ 15 thành phố × 5-8 điểm đón
│   ├── 📄 App.tsx                            # React Router root
│   └── 📄 main.tsx                           # Vite entry (GoogleOAuthProvider)
│
├── 📄 docker-compose.yml                     # MySQL 8.0 + phpMyAdmin
├── 📄 .env                                   # VITE_GOOGLE_CLIENT_ID (root level)
├── 📄 package.json                           # Frontend deps + scripts (dev/dev:full/build)
├── 📄 tsconfig.json
├── 📄 tsconfig.node.json
├── 📄 vite.config.ts
├── 📄 tailwind.config.js
├── 📄 postcss.config.js
├── 📄 index.html                             # Vite HTML shell
├── 📄 test-vnpay-e2e.ps1                     # 🧪 End-to-end VNPay test (PowerShell)
├── 📄 test_login.json / test_register.json   # 🧪 Sample payloads for manual testing
├── 📄 capture_screenshots.py                 # 📸 Auto screenshot script cho README
└── 📄 README.md                              # ← YOU ARE HERE
```

---

## 🎫 Sơ đồ vòng đời vé

Đây là "trái tim" của hệ thống. Một vé có thể trải qua **7 trạng thái**:

```
                  ┌─────────────────────────────────────────────┐
                  │                                             │
                  ▼                                             │
   ┌─────────────────────┐                                     │
   │      📝 BOOKED      │  ← (Legacy - không dùng, chỉ enum)   │
   └─────────────────────┘                                     │
                  │                                             │
                  ▼ (Khách chọn ghế + nhập SĐT + chọn TT)      │
   ┌─────────────────────┐                                     │
   │  🟡 HOLD (Chờ TT)  │ ─────────────────────────────────┐    │
   │  • Ghế đã lock      │                                  │    │
   │  • 15 phút trước    │                                  │    │
   │    giờ khởi hành    │                                  │    │
   │  • Có thể hủy       │                                  │    │
   └──────────┬──────────┘                                  │    │
              │                                             │    │
       ┌──────┴───────┬──────────────────┐                  │    │
       │              │                  │                  │    │
       ▼              ▼                  ▼                  │    │
┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │    │
│  💚 PAID     │ │🟢 CONFIRMED  │ │🔴 CANCELLED  │         │    │
│  (VNPay OK)  │ │(Admin gọi xác│ │(Khách/Admin  │         │    │
│              │ │ nhận COD)    │ │  hủy)        │         │    │
└──────────────┘ └──────────────┘ └──────────────┘         │    │
       │              │                  │                  │    │
       │              │                  │                  │    │
       │      ┌───────┴────────┐         │                  │    │
       │      │                │         │                  │    │
       │      ▼                ▼         ▼                  │    │
       │  ┌──────────────┐ ┌──────────────┐                │    │
       │  │💸 REFUNDED   │ │⏰ EXPIRED    │                │    │
       │  │(Hoàn tiền)   │ │(Hết hạn)    │                │    │
       │  └──────────────┘ └──────────────┘                │    │
       │                                                    │    │
       └────────────────────────────────────────────────────┘    │
                                                                 │
   ┌─────────────────────────────────────────────────────────────┘
   │
   │  ⏰ Tự động EXPIRED nếu:
   │     • > 15 phút trước departure_time mà vẫn HOLD
   │     • Trip status chuyển sang CANCELLED/COMPLETED/RUNNING/DELAYED
   │
```

### Chi tiết transitions

| From | To | Trigger | Service |
|---|---|---|---|
| *(none)* | **HOLD** | Khách chọn ghế + đặt vé (PESSIMISTIC_WRITE lock seat) | `TicketService.bookTicket()` |
| HOLD | **PAID** | VNPay IPN trả `vnp_ResponseCode = "00"` (idempotent) | `VnpayService.processIpn()` |
| HOLD | **PAID** | Khách chọn CASH/MOMO/BANK inline qua `PUT /api/private/tickets/{id}/pay` | `TicketController.payTicket()` |
| HOLD | **CONFIRMED** | Admin gọi điện xác nhận COD (gọi `mark-paid` hoặc `confirm`) | `AdminController` → `AdminService` |
| HOLD | **CANCELLED** | Khách tự hủy (chỉ khi status = `HOLD`) | `TicketController.cancelTicket()` |
| HOLD | **CANCELLED** | Admin hủy (chỉ khi `HOLD` hoặc `CONFIRMED`) | `AdminService.adminCancelTicket()` |
| CONFIRMED | **PAID** | Admin đánh dấu đã thu tiền mặt (`mark-paid`) | `AdminController.markPaid()` |
| PAID | *(blocked)* | Không thể hủy trực tiếp — phải refund (chưa implement auto-refund) | — |
| REFUNDED / EXPIRED | *(blocked)* | Terminal state | — |

### Guards (điều kiện chặn)

```java
// Không cho xác nhận nếu chuyến đã khởi hành
if (LocalDateTime.now().isAfter(trip.getDepartureTime())) {
    throw new BusinessConflictException("Chuyến xe đã khởi hành");
}

// Không cho đặt vé trong 15 phút trước giờ khởi hành
if (LocalDateTime.now().isAfter(trip.getDepartureTime().minusMinutes(15))) {
    throw new IllegalStateException("Không thể đặt vé trong vòng 15 phút trước giờ khởi hành");
}

// Không cho đặt vé nếu chuyến đã hủy/hoàn thành/đang chạy/trễ
if (trip.getStatus() in [CANCELLED, COMPLETED, RUNNING, DELAYED]) {
    throw new IllegalStateException("Không thể đặt vé cho chuyến đã hủy/hoàn thành/đang chạy/trễ");
}
```

---

## 💳 Luồng thanh toán VNPay

### Tổng quan

```
┌──────────┐                  ┌──────────────┐                  ┌──────────┐
│ Browser  │                  │   Backend    │                  │  VNPay   │
│ Customer │                  │  Spring Boot │                  │ Sandbox  │
└────┬─────┘                  └──────┬───────┘                  └────┬─────┘
     │                                │                                │
     │ 1. POST /api/private/payment/  │                                │
     │    vnpay/create                │                                │
     │    Body: { ticketId: 123 }     │                                │
     ├───────────────────────────────►│                                │
     │                                │ 2. Validate ticket = HOLD      │
     │                                │ 3. Tạo Payment PENDING         │
     │                                │ 4. Build query URL + checksum  │
     │                                │    HMAC-SHA512(secret)         │
     │ 5. Response:                   │                                │
     │    { paymentUrl, txnRef }      │                                │
     │◄───────────────────────────────┤                                │
     │                                                                │
     │ 6. window.location.href = paymentUrl                          │
     ├───────────────────────────────────────────────────────────────►│
     │                                                                │
     │                         7. User chọn ngân hàng + nhập OTP       │
     │◄───────────────────────────────────────────────────────────────┤
     │                                                                │
     │ 8. Browser redirect về RETURN_URL                              │
     │    (frontend /payment/vnpay-return)                             │
     │◄───────────────────────────────────────────────────────────────┤
     │                                │                                │
     │ 9. Frontend gọi                │                                │
     │    GET /api/public/payment/    │                                │
     │    vnpay/return?{params}       │                                │
     ├───────────────────────────────►│ 10. Verify HMAC-SHA512 hash   │
     │                                │     (chống spoof)              │
     │ 11. Response: { success, ... } │                                │
     │◄───────────────────────────────┤                                │
     │                                │                                │
     │                                │ ════════════════════════════   │
     │                                │ ║  ASYNC IPN (server-to-server)║
     │                                │ ◄════════════════════════════   │
     │                                │ 12. POST /api/public/payment/  │
     │                                │     vnpay/ipn (form-urlencoded)│
     │                                │     { vnp_TxnRef, vnp_Amount,  │
     │                                │       vnp_ResponseCode, ... }  │
     │                                │                                │
     │                                │ 13. Verify checksum            │
     │                                │ 14. Validate TmnCode           │
     │                                │ 15. Validate amount            │
     │                                │ 16. Idempotent check           │
     │                                │ 17. Update ticket → PAID       │
     │                                │ 18. Update payment → SUCCESS   │
     │                                │ 19. Broadcast SSE → admin     │
     │                                │ 20. Response: { RspCode: 00 }  │
     │                                ├───────────────────────────────►│
     │                                │                                │
```

### Công thức checksum VNPay

```java
// Theo docs VNPay sandbox: https://sandbox.vnpayment.vn/apis/downloads/

// 1. Sort params theo alphabet
List<String> fieldNames = new ArrayList<>(params.keySet());
Collections.sort(fieldNames);

// 2. Build hash data với URL-encoded values
String hashData = fieldNames.stream()
    .filter(name -> shouldIncludeParam(params.get(name)))
    .map(name -> name + "=" + URLEncoder.encode(params.get(name), UTF_8))
    .collect(Collectors.joining("&"));

// 3. Ký HMAC-SHA512
String secureHash = HmacSHA512(VNPAY_HASH_SECRET, hashData);

// 4. URL = VNPAY_URL + "?" + query + "&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=" + secureHash
```

### Cấu hình sandbox test

| Field | Value |
|---|---|
| TMN Code | `SY273SZH` |
| Hash Secret | `SFP53JL1Z5AS4O5WFIEBMEARJAEMDTBT` |
| URL | `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html` |
| Test card NCB | `9704198526191432198` |
| Test card holder | `NGUYEN VAN A` |
| Test expiry | `07/15` |
| Test OTP | `123456` |

---

## 🔔 Hệ thống SSE Notification

### Tại sao SSE thay vì WebSocket?

| Tiêu chí | SSE ✅ | WebSocket ❌ |
|---|---|---|
| Hướng giao tiếp | Server → Client (đủ dùng) | Bidirectional (thừa) |
| Protocol | HTTP thuần (qua proxy dễ) | Custom protocol |
| Auto-reconnect | Có sẵn (EventSource API) | Phải code tay |
| Browser support | 95%+ | 95%+ |
| Dependency | 0 (Spring core) | Cần thêm lib |

### Flow

```
┌──────────┐                                  ┌──────────────────┐
│  Admin   │                                  │  Spring Boot     │
│ Browser  │                                  │  Backend         │
└────┬─────┘                                  └────────┬─────────┘
     │                                                   │
     │ 1. Login as admin → token saved                   │
     │                                                   │
     │ 2. Open AdminDashboardPage                        │
     │    → useEffect → connectAdminNotifications()      │
     │                                                   │
     │ 3. EventSource('/api/admin/notifications/        │
     │    stream?access_token=JWT_TOKEN')                │
     ├──────────────────────────────────────────────────►│
     │                                                   │
     │                                              4. JwtFilter
     │                                                 extract token từ query
     │                                                 set SecurityContext
     │                                                   │
     │                                              5. AdminNotificationService
     │                                                 .register()
     │                                                 → tạo SseEmitter
     │                                                 → add vào CopyOnWriteArrayList
     │                                                 → gửi "connected" event
     │                                                   │
     │ 6. Event: "connected"                             │
     │    data: {"message":"SSE connected"}             │
     │◄──────────────────────────────────────────────────┤
     │                                                   │
     │   ... (admin đang chờ, browser tab mở)            │
     │                                                   │
     │                                                   │ ┌─────────────┐
     │                                                   │ │ Khách đặt vé │
     │                                                   │ │ ở tab khác   │
     │                                                   │ └──────┬──────┘
     │                                                   │        │
     │                                                   │ 7. POST /api/private/tickets
     │                                                   │        │
     │                                                   │ 8. TicketService.bookTicket()
     │                                                   │        │
     │                                                   │ 9. notifyNewBooking(ticket)
     │                                                   │        │
     │                                                   │ 10. broadcast("booking.created", payload)
     │                                                   │     │
     │                                                   │     ▼
     │                                                   │  for (emitter : emitters) {
     │                                                   │    emitter.send(event("booking.created", data))
     │                                                   │  }
     │                                                   │
     │ 11. Event: "booking.created"                      │
     │     data: { ticketId, tripId, seatNumber, ... }   │
     │◄──────────────────────────────────────────────────┤
     │                                                   │
     │ 12. Frontend toast: "🔔 Khách vừa đặt vé #123"   │
     │     + auto-scroll to ticket list                  │
     │                                                   │
```

### Event payloads

#### `booking.created`
```typescript
{
  ticketId: number;
  tripId: number | null;
  seatNumber: string;        // "12"
  passengerName: string;     // "Nguyễn Văn A"
  passengerPhone: string;    // "0901234567"
  price: number;             // 500000
  status: string;            // "HOLD"
  pickupPoint: string;       // "VP Mỹ Đình - ..."
  dropoffPoint: string;      // "Bến xe Mỹ Đình 2 - ..."
  bookedAt: string;          // "2026-06-27T14:30:00"
}
```

#### `payment.vnpay.success`
```typescript
{
  ticketId: number;
  tripId: number | null;
  seatNumber: string;
  passengerName: string;
  passengerPhone: string;
  amount: number;
  vnpTxnRef: string;         // "TICKET123_1719486000000"
  vnpTransactionNo: string;  // "14320123"
  vnpBankCode: string;       // "NCB"
  vnpCardType: string;       // "ATM"
  paidAt: string;
  pickupPoint: string;
  dropoffPoint: string;
}
```

#### `feedback.created`
```typescript
{
  feedbackId: number;
  username: string;
  userFullName: string;
  category: string;   // COMPLAINT / SUGGESTION / PRAISE / QUESTION / OTHER
  subject: string;
  priority: string;   // LOW / MEDIUM / HIGH
  createdAt: string;  // ISO 8601
}
```

---

## 📡 API Endpoints

Tổng cộng **55+ endpoints** chia theo 4 nhóm quyền (Public / Authenticated / CUSTOMER / ADMIN).

### 🌍 Public (Không cần auth)

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/public/auth/register` | Đăng ký CUSTOMER mới |
| `POST` | `/api/public/auth/login` | Đăng nhập username/password → JWT token |
| `POST` | `/api/public/auth/google` | Đăng nhập bằng Google ID Token (OAuth 2.0) → JWT token |
| `GET` | `/api/public/trips` | Lấy tất cả chuyến tương lai (30 ngày) |
| `GET` | `/api/public/trips/search` | Tìm theo `origin`, `destination`, `date` |
| `GET` | `/api/public/trips/{tripId}/seats` | Sơ đồ ghế của 1 chuyến |
| `GET` | `/api/routes` | Danh sách tuyến active (dropdown cho form tạo chuyến) |
| `GET` | `/api/public/payment/vnpay/return` | Return URL từ VNPay (browser redirect) |
| `POST` | `/api/public/payment/vnpay/ipn` | IPN callback server-to-server (form-urlencoded) |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/debug/dispatcher` | Debug dispatcher state (dev only) |

### 🔐 Authenticated (CUSTOMER hoặc ADMIN đều truy cập được)

| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/auth/profile` | Lấy hồ sơ user đang đăng nhập |
| `PUT` | `/api/auth/profile` | Cập nhật họ tên, SĐT |

### 🔐 Private — CUSTOMER

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/private/tickets` | Đặt vé (tạo HOLD — có PESSIMISTIC_WRITE lock) |
| `GET` | `/api/private/tickets/my` | Lịch sử vé của tôi |
| `PUT` | `/api/private/tickets/{id}/cancel` | Hủy vé (chỉ khi HOLD) |
| `PUT` | `/api/private/tickets/{id}/pay` | Thanh toán inline (CASH/MOMO/BANK) |
| `POST` | `/api/private/payment/vnpay/create` | Tạo URL thanh toán VNPay → redirect sang sandbox |
| `POST` | `/api/private/feedbacks` | Gửi feedback mới |
| `GET` | `/api/private/feedbacks/me` | Lịch sử feedback của tôi |
| `GET` | `/api/private/feedbacks/{id}` | Chi tiết feedback |
| `POST` | `/api/private/feedbacks/{id}/reply` | Khách phản hồi lại thread |
| `PUT` | `/api/private/feedbacks/{id}/close` | Khách đóng feedback |

### 👨‍💼 Admin — ROLE_ADMIN

#### Dashboard & Realtime
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/dashboard` | Thống kê tổng quan (users/buses/routes/trips + charts + bảo hiểm sắp hết hạn) |
| `GET` | `/api/admin/revenue` | Thống kê doanh thu (tổng / theo ngày / theo tuyến) |
| `GET` | `/api/admin/notifications/stream` | **SSE stream** realtime (EventSource — token qua query `access_token`) |

#### Quản lý User
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/users` | Danh sách user (filter keyword/role/status, phân trang) |
| `GET` | `/api/admin/users/{id}` | Chi tiết user |
| `POST` | `/api/admin/users` | Tạo user |
| `PUT` | `/api/admin/users/{id}` | Cập nhật user |
| `PUT` | `/api/admin/users/{id}/lock` | Khóa/mở khóa user |
| `PUT` | `/api/admin/users/{id}/password` | Reset mật khẩu |
| `DELETE` | `/api/admin/users/{id}` | Soft-delete user |

#### Quản lý Xe
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/buses` | Danh sách xe (filter status, phân trang) |
| `GET` | `/api/admin/buses/{id}` | Chi tiết xe |
| `POST` | `/api/admin/buses` | Tạo xe + auto-generate ghế theo `totalSeats` |
| `PUT` | `/api/admin/buses/{id}` | Cập nhật xe |
| `PUT` | `/api/admin/buses/{id}/status` | Đổi trạng thái xe |
| `DELETE` | `/api/admin/buses/{id}` | Xóa xe (chặn nếu đang có chuyến) |

#### Quản lý Tuyến & Chuyến
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/routes` | Danh sách tuyến |
| `GET` | `/api/admin/routes/{id}` | Chi tiết tuyến |
| `POST` | `/api/admin/routes` | Tạo tuyến |
| `PUT` | `/api/admin/routes/{id}` | Cập nhật tuyến |
| `DELETE` | `/api/admin/routes/{id}` | Xóa tuyến |
| `GET` | `/api/admin/trips` | Danh sách chuyến (filter date/route/status) |
| `GET` | `/api/admin/trips/{id}` | Chi tiết chuyến + sơ đồ ghế + danh sách vé |
| `POST` | `/api/admin/trips` | Tạo chuyến (kèm tạo route inline) |
| `PUT` | `/api/admin/trips/{id}` | Cập nhật chuyến |
| `DELETE` | `/api/admin/trips/{id}` | Xóa chuyến |
| `GET` | `/api/trips` | Dispatcher xem chuyến (phục vụ `/dispatcher` dashboard) |

#### Phân công nhân sự
| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/admin/trip-assignments/{tripId}` | Phân công tài xế + phụ xe cho chuyến |
| `GET` | `/api/admin/trip-assignments/{tripId}` | Xem phân công hiện tại của chuyến |

#### Quản lý Nhân viên
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/employees` | Danh sách nhân viên |
| `POST` | `/api/admin/employees` | Thêm nhân viên |
| `GET` | `/api/admin/employees/type/{type}` | Lọc theo loại (DRIVER / ASSISTANT) |
| `GET` | `/api/admin/employees/top-experienced` | Top 5 tài xế kinh nghiệm cao |
| `DELETE` | `/api/admin/employees/{id}` | Xoá nhân viên |

#### Quản lý Vé
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/tickets` | Danh sách vé (filter keyword/status/tripId, phân trang 10/trang) |
| `GET` | `/api/admin/tickets/all` | Tất cả vé (cho admin tickets page) |
| `GET` | `/api/admin/tickets/{id}` | Chi tiết vé |
| `PUT` | `/api/admin/tickets/{id}/confirm` | Xác nhận vé (gọi điện xác nhận → `CONFIRMED`) |
| `PUT` | `/api/admin/tickets/{id}/mark-paid` | Đánh dấu vé đã thanh toán (COD/đã thu tiền mặt → `PAID`) |
| `PUT` | `/api/admin/tickets/{id}/admin-cancel` | Admin hủy vé (`HOLD`/`CONFIRMED` → `CANCELLED`) |

#### Quản lý Hàng hoá (Cargo)
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/cargo` | Danh sách đơn hàng vận chuyển |
| `GET` | `/api/admin/cargo/{id}` | Chi tiết đơn hàng |
| `POST` | `/api/admin/cargo` | Tạo đơn hàng |
| `PUT` | `/api/admin/cargo/{id}` | Cập nhật đơn hàng |
| `PUT` | `/api/admin/cargo/{id}/status` | Đổi trạng thái đơn hàng |
| `DELETE` | `/api/admin/cargo/{id}` | Xóa đơn hàng |

#### Quản lý Bảo trì (Maintenance)
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/maintenance` | Danh sách lịch sử bảo trì xe |
| `GET` | `/api/admin/maintenance/{id}` | Chi tiết phiên bảo trì |
| `POST` | `/api/admin/maintenance` | Tạo phiên bảo trì |
| `PUT` | `/api/admin/maintenance/{id}` | Cập nhật phiên bảo trì |
| `DELETE` | `/api/admin/maintenance/{id}` | Xóa phiên bảo trì |

#### Quản lý Feedback
| Method | Endpoint | Mô tả |
|---|---|---|
| `GET` | `/api/admin/feedbacks` | Inbox feedback (filter status/category/priority, search full-text) |
| `GET` | `/api/admin/feedbacks/stats` | Thống kê feedback (NEW/READ/IN_PROGRESS/RESOLVED/CLOSED) |
| `GET` | `/api/admin/feedbacks/{id}` | Chi tiết feedback + reply thread |
| `POST` | `/api/admin/feedbacks/{id}/reply` | Admin phản hồi feedback (tạo FeedbackReply row) |
| `PATCH` | `/api/admin/feedbacks/{id}/status` | Đổi trạng thái + ưu tiên (NEW/READ/IN_PROGRESS/RESOLVED/CLOSED + LOW/MEDIUM/HIGH) |
| `DELETE` | `/api/admin/feedbacks/{id}` | Xóa feedback |

### 📝 Ví dụ Request/Response

#### Đăng nhập Google

```http
POST /api/public/auth/google
Content-Type: application/json

{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjE4M2E4ZGYx...",
  "role": "CUSTOMER"
}
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 42,
    "username": "google_1234567890",
    "fullName": "Nguyễn Văn A",
    "email": "nguyenvana@gmail.com",
    "role": "CUSTOMER",
    "phone": ""
  }
}
```

> **Lưu ý**: User đăng nhập bằng Google **lần đầu** sẽ được tự động tạo CUSTOMER với username `google_<sub>`, mật khẩu ngẫu nhiên (UUID) và hồ sơ `Passenger` mặc định lấy tên + email từ Google. Những lần sau, hệ thống tự lookup theo email.

#### Đặt vé mới
```http
POST /api/private/tickets
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "tripId": 12,
  "seatId": 45,
  "price": 500000,
  "passengerPhone": "0901234567",
  "pickupPoint": "VP Mỹ Đình - Cạnh SVĐ Mỹ Đình",
  "dropoffPoint": "Bến xe Mỹ Đình 2 - Phạm Hùng"
}
```

```json
{
  "id": 123,
  "tripId": 12,
  "origin": "Hà Nội",
  "destination": "TP.HCM",
  "departureTime": "2026-07-01T20:00:00",
  "arrivalTime": "2026-07-02T12:00:00",
  "licensePlate": "30B-222.22",
  "busType": "LIMOUSINE",
  "busLabel": "30B-222.22 - LIMOUSINE",
  "seatNumber": "12",
  "passengerName": "nguyenvana",
  "passengerPhone": "0901234567",
  "passengerEmail": "vana@example.com",
  "price": 500000,
  "status": "HOLD",
  "bookedAt": "2026-06-27T14:30:00",
  "paidAt": null,
  "paymentId": null,
  "paymentMethod": null,
  "paymentStatus": null,
  "transactionCode": null,
  "ticketCode": "BUS-20260627-00123",
  "pickupPoint": "VP Mỹ Đình - Cạnh SVĐ Mỹ Đình",
  "dropoffPoint": "Bến xe Mỹ Đình 2 - Phạm Hùng"
}
```

---

## 👤 Tài khoản mặc định

### Admin (seed tự động khi khởi động lần đầu)

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `ChangeMe@123` |
| Email | `admin@bus.com` |
| Role | ADMIN |
| Status | ACTIVE |

⚠️ **LƯU Ý BẢO MẬT**: Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!

### Seed data

| Loại | Số lượng | Chi tiết |
|---|---|---|
| **Tuyến** | 4 | Hà Nội ↔ TP.HCM, Hà Nội ↔ Đà Nẵng, TP.HCM ↔ Đà Nẵng, Hà Nội ↔ Hải Phòng |
| **Xe** | 20 | 5 Limousine (28 chỗ) + 5 Sleeper cao cấp (34 chỗ) + 5 Sleeper thường (40 chỗ) + 4 Seat cao cấp (45 chỗ) + 1 Seat thường (50 chỗ) |
| **Tài xế** | 10 | 5 kinh nghiệm 11-15 năm (VIP) + 5 kinh nghiệm 3-7 năm |
| **Phụ xe** | 10 | Kinh nghiệm 1-6 năm |
| **Điểm đón/trả** | 80+ | 15 thành phố × 5-8 điểm mỗi nơi |

---

## 🧪 Testing & Scripts

### Test scripts (PowerShell)

```powershell
# Test VNPay end-to-end (full IPN flow — register → book → create payment URL)
.\test-vnpay-e2e.ps1
```

### Test với cURL

#### Đăng nhập admin
```bash
curl -X POST http://localhost:8080/api/public/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChangeMe@123","role":"ADMIN"}'
```

#### Lấy dashboard
```bash
TOKEN="<jwt_token_from_login>"
curl http://localhost:8080/api/admin/dashboard \
  -H "Authorization: Bearer $TOKEN"
```

#### Tìm chuyến
```bash
curl "http://localhost:8080/api/public/trips/search?origin=H%C3%A0%20N%E1%BB%99i&destination=TP.HCM&date=2026-07-01"
```

#### SSE stream (dùng curl)
```bash
curl -N "http://localhost:8080/api/admin/notifications/stream?access_token=$TOKEN"
```

### Unit tests

```bash
cd backend
mvn test
```

---

## 🛠️ Troubleshooting

### ❌ Backend không khởi động được

```bash
# Lỗi: Communications link failure
# → MySQL chưa chạy. Khởi động MySQL trước:
docker start bus-mysql
# hoặc
net start mysql80

# Lỗi: Access denied for user 'root'@'localhost'
# → Sai password. Sửa trong application.properties:
spring.datasource.password=YOUR_PASSWORD
```

### ❌ Frontend không kết nối được Backend

```bash
# Lỗi: Network Error / CORS
# → Kiểm tra application.properties:
app.cors.allowed-origins=http://localhost:5173

# Lỗi: 401 Unauthorized (sau khi gọi /api/private/**)
# → Token hết hạn (1 giờ theo JWT_EXPIRATION_MS). Logout rồi login lại.
# → Hoặc token chưa được gửi kèm — kiểm tra localStorage('token') hoặc 'auth-storage'.

# Lỗi: 403 Forbidden
# → Đã đăng nhập nhưng sai role. CUSTOMER không được gọi /api/admin/** và ngược lại.
#   Dispatcher xem /api/trips (public), Admin mới gọi /api/admin/**.

### ❌ VNPay sandbox không hoạt động

```bash
# Lỗi: Invalid checksum
# → Sai VNPAY_HASH_SECRET. Lấy lại từ https://sandbox.vnpayment.vn

# Lỗi: IPN không được gọi
# → VNPay cần URL public. Dùng Cloudflare Tunnel hoặc ngrok:
cloudflared tunnel --url http://localhost:8080
# → Set VNPAY_IPN_URL = https://<tunnel>.trycloudflare.com/api/public/payment/vnpay/ipn
```

### ❌ SSE không nhận event

```bash
# Kiểm tra:
1. Token đã truyền qua query: ?access_token=...
2. EventSource có trong network tab → status 200, type "text/event-stream"
3. Có ít nhất 1 admin đang subscribe
4. Trigger booking mới → check log backend: "broadcast booking.created"
```

### ❌ Đặt vé thất bại: "Ghế đã được đặt bởi người khác"

```bash
# → Đây là tính năng, không phải bug! Hệ thống dùng SELECT FOR UPDATE
#    để chống race condition. Reload trang và chọn ghế khác.
```

### ❌ Google Login không hoạt động

```bash
# Lỗi: Nút Google hiển thị "Sign in with Google" nhưng bấm không có phản hồi
# → Thiếu VITE_GOOGLE_CLIENT_ID. Tạo file .env ở thư mục gốc với:
echo "VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com" > .env
# → Khởi động lại npm run dev.

# Lỗi: "Invalid Google ID Token"
# → Token đã hết hạn (Google ID Token chỉ sống ~1 giờ) hoặc Client ID chưa
#    được thêm vào Authorized JavaScript origins của Google Console.
#    Thêm http://localhost:5173 vào origins, đợi 5 phút rồi thử lại.

# Lỗi: "Account is not active"
# → Tài khoản Google đã đăng nhập trước đó nhưng admin đã khoá. Liên hệ admin.
```

---

## 📸 Ảnh minh hoạ

### 🛒 Customer Flow

| | |
|---|---|
| **Bước 0**: Đăng nhập | Form đăng nhập gồm username/password **và** nút "Sign in with Google". Sau khi xác thực, frontend lưu JWT vào Zustand (persist) rồi redirect theo role (ADMIN → `/admin/dashboard`, CUSTOMER → `/customer/booking`). |
| **Bước 1**: Tìm chuyến | Form với 3 trường: Điểm đi / Điểm đến / Ngày đi. Hiển thị danh sách chuyến với progress bar tỉ lệ đầy ghế. |
| **Bước 2-3**: Chọn điểm đón/trả | City picker + collapsible list các điểm cụ thể (VP, Bến xe, Trạm xăng, ĐH...). |
| **Bước 4**: Chọn ghế | Grid ghế với 3 trạng thái màu: xanh (trống) / đỏ (đã đặt) / xanh dương (đang chọn). |
| **Bước 5**: Xác nhận | Hiển thị tóm tắt + 2 phương thức thanh toán (VNPay → redirect sandbox / CASH-MOMO-BANK inline) + nhập SĐT. |
| **Bước 6**: Thành công | Card vé gradient xanh, mã vé `BUS-YYYYMMDD-XXXXX`. |
| **Feedback** | Modal phản hồi từ header / trang vé: chọn danh mục + đánh giá sao + liên kết chuyến (tuỳ chọn). |

### 👨‍💼 Admin Flow

| | |
|---|---|
| **Dashboard** | 4 stat cards + 2 progress bars (role distribution, bus status) + bảng cảnh báo bảo hiểm. Hiệu ứng snowfall + gradient cards. |
| **Doanh thu** | Trang riêng `/admin/revenue` với 4 summary cards (Tổng / Confirmed / Pending / Cancelled) + line chart theo ngày + bar chart theo tuyến. Component `AdminRevenueStats` được tái sử dụng trên Dashboard. |
| **Quản lý xe** | Bảng với badge trạng thái (AVAILABLE/RUNNING/MAINTENANCE), icon cảnh báo bảo hiểm sắp hết hạn. |
| **Quản lý chuyến** | Bảng với filter (tuyến, status), modal tạo/sửa có 3 tab: thông tin chuyến / phân công / sơ đồ ghế. |
| **Sơ đồ ghế admin** | Modal hiển thị sơ đồ ghế với thông tin từng ghế đã đặt (tên khách, SĐT, điểm đón/trả, payment method). |
| **Quản lý vé** | Bảng filter trạng thái, search theo tên/SĐT/mã vé, action button **xác nhận / đánh dấu PAID / hủy** với confirm dialog, **phân trang 10 vé/trang**. |
| **Real-time notification** | Toast popup góc trên phải khi có event mới (booking.created / payment.vnpay.success / feedback.created). |
| **Hộp thư Feedback** | Modal mở từ header: lọc theo trạng thái (NEW / READ / IN_PROGRESS / RESOLVED / CLOSED), tìm kiếm full-text, reply nội tuyến, đổi ưu tiên. Realtime khi có feedback mới. |
| **Dispatcher** | Dashboard điều phối: danh sách chuyến sắp chạy, phân công nhanh tài xế/phụ xe. |

---

## 🤝 Đóng góp

Chúng tôi hoan nghênh mọi đóng góp! Vui lòng:

1. Fork repository
2. Tạo branch mới: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add some AmazingFeature'`
4. Push lên branch: `git push origin feature/AmazingFeature`
5. Tạo Pull Request

### Coding standards

- **Backend**: Lombok, `@RequiredArgsConstructor`, `@Transactional`, DTO pattern
- **Frontend**: TypeScript strict mode, functional components + hooks, Zustand for state
- **Git**: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

## 👥 Tác giả & Credits

**XeKhách Pro** được xây dựng với ❤️ bởi team MetBus.

### Acknowledgments

- [Spring Boot](https://spring.io/projects/spring-boot) — Backend framework
- [React](https://react.dev) — Frontend framework
- [VNPay](https://vnpay.vn) — Payment gateway
- [Tailwind CSS](https://tailwindcss.com) — Utility-first CSS
- [Lucide](https://lucide.dev) — Beautiful icons
- [Recharts](https://recharts.org) — Charts library

---

<div align="center">

### 🌟 Nếu thấy dự án hay, hãy star repository! 🌟

**Made with ❤️ in Vietnam**

[⬆ Quay lại đầu trang](#-xekhch-pro--bus-management--online-ticketing-platform)

</div>
