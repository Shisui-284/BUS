// ============================================================================
// ADMIN API — Module: Quản lý phía Admin (FE)
// ============================================================================

import apiClient from "./apiClient";
import { AdminTicket, Employee, UserRole } from "../types";

// ==================== DASHBOARD ====================

export interface RoleCount {
  role: string;
  count: number;
}

export interface BusStatusCount {
  status: string;
  count: number;
}

export interface BusInsuranceAlert {
  busId: number;
  licensePlate: string;
  busType: string;
  status: string;
  expiryDate: string;
  alertType: "EXPIRED" | "EXPIRING_SOON";
}

export interface AdminDashboardData {
  totalUsers: number;
  totalBuses: number;
  totalRoutes: number;
  todayTrips: number;
  roleDistribution: RoleCount[];
  busStatusDistribution: BusStatusCount[];
  insuranceAlerts: BusInsuranceAlert[];
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const res = await apiClient.get<AdminDashboardData>("/admin/dashboard");
  return res.data;
}

// ==================== USER MANAGEMENT ====================

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  phone: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "LOCKED";
  fullName: string;
  employeeType: string;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  email?: string;
  phone?: string;
  fullName?: string;
  employeeType?: string;
}

export async function getUsers(params?: {
  keyword?: string;
  role?: string;
  status?: string;
}): Promise<AdminUser[]> {
  const res = await apiClient.get<AdminUser[]>("/admin/users", { params });
  return res.data;
}

export async function getUserById(id: number): Promise<AdminUser> {
  const res = await apiClient.get<AdminUser>(`/admin/users/${id}`);
  return res.data;
}

export async function createUser(payload: CreateUserPayload): Promise<AdminUser> {
  const res = await apiClient.post<AdminUser>("/admin/users", payload);
  return res.data;
}

export async function updateUser(id: number, payload: UpdateUserPayload): Promise<AdminUser> {
  const res = await apiClient.put<AdminUser>(`/admin/users/${id}`, payload);
  return res.data;
}

export async function lockUnlockUser(id: number): Promise<AdminUser> {
  const res = await apiClient.put<AdminUser>(`/admin/users/${id}/lock`);
  return res.data;
}

export async function resetUserPassword(id: number, newPassword: string): Promise<void> {
  await apiClient.put(`/admin/users/${id}/password`, { newPassword });
}
export async function deleteUser(id: number): Promise<void> {
  await apiClient.delete(`/admin/users/${id}`);
}
// ==================== BUS MANAGEMENT ====================

export interface AdminBus {
  id: number;
  licensePlate: string;
  busType: string;
  totalSeats: number;
  status: "AVAILABLE" | "RUNNING" | "MAINTENANCE";
  lastMaintenanceDate: string | null;
  insuranceExpiry: string | null;
  insuranceExpired: boolean;
  insuranceExpiringSoon: boolean;
  assignedTripsCount?: number;
}

export interface CreateBusPayload {
  licensePlate: string;
  busType: string;
  totalSeats: number;
  lastMaintenanceDate?: string;
  insuranceExpiry?: string;
}

export interface UpdateBusPayload {
  busType?: string;
  totalSeats?: number;
  lastMaintenanceDate?: string;
  insuranceExpiry?: string;
}

export async function getBuses(params?: {
  keyword?: string;
  status?: string;
}): Promise<AdminBus[]> {
  const res = await apiClient.get<AdminBus[]>("/admin/buses", { params });
  return res.data;
}

export async function getBusById(id: number): Promise<AdminBus> {
  const res = await apiClient.get<AdminBus>(`/admin/buses/${id}`);
  return res.data;
}

export async function createBus(payload: CreateBusPayload): Promise<AdminBus> {
  const res = await apiClient.post<AdminBus>("/admin/buses", payload);
  return res.data;
}

export async function updateBus(id: number, payload: UpdateBusPayload): Promise<AdminBus> {
  const res = await apiClient.put<AdminBus>(`/admin/buses/${id}`, payload);
  return res.data;
}

export async function updateBusStatus(id: number, status: string): Promise<AdminBus> {
  const res = await apiClient.put<AdminBus>(`/admin/buses/${id}/status`, { status });
  return res.data;
}

// ==================== ROUTE MANAGEMENT ====================

export interface AdminRoute {
  id: number;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedDurationMin: number;
  basePrice: number;
  isActive: boolean;
  tripCount?: number;
}

export interface CreateRoutePayload {
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedDurationMin: number;
  basePrice: number;
}

export interface UpdateRoutePayload {
  origin?: string;
  destination?: string;
  distanceKm?: number;
  estimatedDurationMin?: number;
  basePrice?: number;
  isActive?: boolean;
}

export async function getRoutes(params?: {
  keyword?: string;
  activeOnly?: boolean;
}): Promise<AdminRoute[]> {
  const res = await apiClient.get<AdminRoute[]>("/admin/routes", { params });
  return res.data;
}

export async function getRouteById(id: number): Promise<AdminRoute> {
  const res = await apiClient.get<AdminRoute>(`/admin/routes/${id}`);
  return res.data;
}

export async function createRoute(payload: CreateRoutePayload): Promise<AdminRoute> {
  const res = await apiClient.post<AdminRoute>("/admin/routes", payload);
  return res.data;
}

export async function updateRoute(id: number, payload: UpdateRoutePayload): Promise<AdminRoute> {
  const res = await apiClient.put<AdminRoute>(`/admin/routes/${id}`, payload);
  return res.data;
}

// ==================== TRIP MANAGEMENT ====================

export interface AdminTrip {
  id: number;
  routeId: number;
  routeName: string;
  busId: number;
  busLabel: string;
  departureTime: string;
  arrivalTime: string;
  status: "SCHEDULED" | "RUNNING" | "COMPLETED" | "CANCELLED" | "DELAYED";
  totalSeats?: number;
  bookedSeats?: number;
  availableSeats?: number;
  assignments: {
    id: number;
    employeeId: number | null;
    employeeName: string | null;
    role: string;
  }[];
}

export interface CreateTripPayload {
  // Dùng routeId có sẵn hoặc tạo mới inline
  routeId?: number;
  origin?: string;        // Tạo route mới nếu routeId = null
  destination?: string;    // Tạo route mới nếu routeId = null
  basePrice?: number;     // Giá vé cho route mới
  distanceKm?: number;    // Khoảng cách cho route mới
  estimatedDurationMin?: number; // Thời gian cho route mới

  busId: number;
  departureTime: string;
  arrivalTime: string;
  status?: string;
}

export async function getAdminTrips(params?: {
  date?: string;
  routeId?: number;
  status?: string;
}): Promise<AdminTrip[]> {
  const res = await apiClient.get<AdminTrip[]>("/admin/trips", { params });
  const trips = res.data;

  // Enrich trips với thông tin nhân sự
  const enrichedTrips = await Promise.all(
    trips.map(async (trip) => {
      try {
        const assignments = await apiClient.get(`/admin/trip-assignments/${trip.id}`);
        const employees = await apiClient.get<Employee[]>('/admin/employees');

        const enrichedAssignments = (assignments.data || []).map((a: any) => {
          const employee = employees.data?.find((e: any) => e.id === a.employeeId);
          return {
            ...a,
            employeeName: employee?.fullName || `NV #${a.employeeId}`
          };
        });

        return { ...trip, assignments: enrichedAssignments };
      } catch {
        return { ...trip, assignments: [] };
      }
    })
  );

  return enrichedTrips;
}

export async function createAdminTrip(payload: CreateTripPayload): Promise<AdminTrip> {
  const res = await apiClient.post<AdminTrip>("/admin/trips", payload);
  return res.data;
}

export async function updateAdminTrip(id: number, payload: CreateTripPayload): Promise<AdminTrip> {
  const res = await apiClient.put<AdminTrip>(`/admin/trips/${id}`, payload);
  return res.data;
}

export async function deleteAdminTrip(id: number): Promise<void> {
  await apiClient.delete(`/admin/trips/${id}`);
}


export const getAllTicketsForAdmin = async (): Promise<AdminTicket[]> => {
  const response = await apiClient.get('/admin/tickets/all');
  return response.data;
}

export const confirmTicket = async (ticketId: number): Promise<void> => {
  await apiClient.put(`/admin/tickets/${ticketId}/confirm`);
};

export const markTicketAsPaid = async (ticketId: number): Promise<void> => {
  await apiClient.put(`/admin/tickets/${ticketId}/mark-paid`);
};

export const cancelTicketByAdmin = async (ticketId: number): Promise<void> => {
  await apiClient.put(`/admin/tickets/${ticketId}/admin-cancel`);
};
export const assignStaffToTrip = async (tripId: number, driverId: number | null, assistantId: number | null) => {
  const response = await apiClient.post(`/admin/trip-assignments/${tripId}`, {
    driverId,
    assistantId
  });
  return response.data;
};
export const getAllEmployees = async (): Promise<Employee[]> => {
  const response = await apiClient.get('/admin/employees');
  return response.data;
};

export const createEmployee = async (employeeData: Omit<Employee, 'id'>): Promise<Employee> => {
  const response = await apiClient.post('/admin/employees', employeeData);
  return response.data;
};

export const deleteEmployee = async (id: number): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/admin/employees/${id}`);
  return response.data;
};

export const getEmployeesByType = async (type: 'DRIVER' | 'ASSISTANT'): Promise<Employee[]> => {
  const response = await apiClient.get(`/admin/employees/type/${type}`);
  return response.data;
};

export const getTopExperiencedDrivers = async (): Promise<Employee[]> => {
  const response = await apiClient.get('/admin/employees/top-experienced');
  return response.data;
};

export const getStaffByTrip = async (tripId: number) => {
  const response = await apiClient.get(`/admin/trip-assignments/${tripId}`);
  return response.data;
};

// ==================== TRIP DETAIL (modal sơ đồ ghế) ====================

export interface AdminTripDetail {
  id: number;
  route: {
    id: number;
    origin: string;
    destination: string;
    distanceKm: number;
    estimatedDurationMin: number;
    basePrice: number;
  } | null;
  bus: {
    id: number;
    licensePlate: string;
    busType: string;
    totalSeats: number;
    status: string;
  } | null;
  departureTime: string;
  arrivalTime: string;
  status: string;
  totalSeats: number;
  bookedSeats: number;
  availableSeats: number;
  seats: AdminTripSeat[];
  tickets: AdminTripTicket[];
  estimatedRevenue: number;
  actualRevenue: number;
}

export interface AdminTripSeat {
  id: number;
  seatNumber: string;
  positionX: number | null;
  positionY: number | null;
  booked: boolean;
  bookedBy: string;
  passengerName: string;
}

export interface AdminTripTicket {
  id: number;
  seatNumber: string;
  passengerName: string;
  passengerPhone: string;
  price: number;
  status: string; // BOOKED / HOLD / CONFIRMED / PAID / CANCELLED / REFUNDED / EXPIRED
  bookedAt: string | null;
  pickupPoint: string | null;
  dropoffPoint: string | null;
  paymentMethod: string | null; // CASH / VNPAY / null
  paymentStatus: string | null; // PENDING / SUCCESS / FAILED / null
  paidAt: string | null;
}

export async function getAdminTripById(id: number): Promise<AdminTripDetail> {
  const res = await apiClient.get<AdminTripDetail>(`/admin/trips/${id}`);
  return res.data;
}

// ==================== TICKET DETAIL (modal info ghế) ====================

export interface AdminTicketDetail {
  id: number;
  trip: {
    id: number;
    routeId: number | null;
    routeName: string;
    busId: number | null;
    busLabel: string;
    departureTime: string | null;
    arrivalTime: string | null;
    tripStatus: string;
  } | null;
  seat: {
    id: number;
    seatNumber: string;
    positionX: number | null;
    positionY: number | null;
  } | null;
  passenger: {
    id: number;
    fullName: string;
    phone: string;
    email: string;
    idCard: string;
  } | null;
  price: number;
  status: string;
  user: {
    id: number;
    username: string;
    role: string;
  } | null;
  bookedAt: string | null;
  paidAt: string | null;
  payment: {
    id: number;
    amount: number;
    paymentMethod: string;
    status: string;
    transactionCode: string | null;
    paidAt: string | null;
  } | null;
}

export async function getAdminTicketById(id: number): Promise<AdminTicketDetail> {
  const res = await apiClient.get<AdminTicketDetail>(`/admin/tickets/${id}`);
  return res.data;
}

// ==================== REVENUE STATISTICS ====================

export interface RevenueDailyPoint {
  date: string;
  label: string;
  amount: number;
}

export interface RevenueWeeklyPoint {
  weekStart: string;
  label: string;
  amount: number;
}

export interface RevenueMonthlyPoint {
  month: string;
  label: string;
  amount: number;
}

export interface RevenueYearlyPoint {
  year: string;
  label: string;
  amount: number;
}

export interface TopBusRevenue {
  busId: number;
  licensePlate: string;
  busType: string;
  tripCount: number;
  ticketCount: number;
  revenue: number;
}

export interface TopDriverRevenue {
  employeeId: number;
  fullName: string;
  tripCount: number;
  ticketCount: number;
  revenue: number;
}

export interface AdminRevenueStats {
  totalRevenue: number;
  dailyRevenue: RevenueDailyPoint[];
  weeklyRevenue: RevenueWeeklyPoint[];
  monthlyRevenue: RevenueMonthlyPoint[];
  yearlyRevenue: RevenueYearlyPoint[];
  topBuses: TopBusRevenue[];
  topDrivers: TopDriverRevenue[];
  confirmedTicketCount: number;
  pendingTicketCount: number;
  cancelledTicketCount: number;
}

export async function getAdminRevenueStats(): Promise<AdminRevenueStats> {
  const res = await apiClient.get<AdminRevenueStats>("/admin/revenue");
  return res.data;
}

// ==================== SSE NOTIFICATIONS ====================

/** Mở kết nối SSE tới admin notifications. */
export function connectAdminNotifications(
  onBookingCreated: (data: AdminBookingEvent) => void,
  onPaymentVnpay: (data: AdminPaymentEvent) => void,
  onFeedbackCreated?: (data: AdminFeedbackEvent) => void,
  onError?: (err: Event) => void,
): EventSource {
  // EventSource không gửi được Authorization header tự động, nhưng endpoint
  // /api/admin/** yêu cầu ROLE_ADMIN — nên ta truyền token qua query param.
  // Backend sẽ đọc token từ query string (xem SecurityConfig filter).
  const token = localStorage.getItem("token");
  const url = token
    ? `/api/admin/notifications/stream?access_token=${encodeURIComponent(token)}`
    : "/api/admin/notifications/stream";

  const es = new EventSource(url);

  es.addEventListener("booking.created", (e) => {
    try {
      onBookingCreated(JSON.parse((e as MessageEvent).data));
    } catch {
      // Bỏ qua event lỗi parse — UI sẽ tự refresh qua API call khác
    }
  });

  es.addEventListener("payment.vnpay.success", (e) => {
    try {
      onPaymentVnpay(JSON.parse((e as MessageEvent).data));
    } catch {
      // Bỏ qua event lỗi parse
    }
  });

  if (onFeedbackCreated) {
    es.addEventListener("feedback.created", (e) => {
      try {
        onFeedbackCreated(JSON.parse((e as MessageEvent).data));
      } catch {
        // Bỏ qua event lỗi parse
      }
    });
  }

  if (onError) es.addEventListener("error", onError);

  return es;
}

export interface AdminBookingEvent {
  ticketId: number;
  tripId: number | null;
  seatNumber: string;
  passengerName: string;
  passengerPhone: string;
  price: number;
  status: string;
  pickupPoint: string | null;
  dropoffPoint: string | null;
  bookedAt: string | null;
}

export interface AdminPaymentEvent {
  ticketId: number;
  tripId: number | null;
  seatNumber: string;
  passengerName: string;
  passengerPhone: string;
  amount: number;
  vnpTxnRef: string;
  vnpTransactionNo: string | null;
  vnpBankCode: string | null;
  vnpCardType: string | null;
  paidAt: string;
  pickupPoint: string | null;
  dropoffPoint: string | null;
}

/** SSE event khi user gửi feedback mới. */
export interface AdminFeedbackEvent {
  feedbackId: number;
  username: string;
  userFullName: string;
  category: string;
  subject: string;
  rating: number | null;
  createdAt: string;
}