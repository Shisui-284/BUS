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
  assignments: {
    id: number;
    employeeId: number | null;
    employeeName: string | null;
    role: string;
  }[];
}

export interface CreateTripPayload {
  routeId: number;
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
  // SỬA ĐƯỜNG DẪN Ở ĐÂY THÊM CHỮ /all
  const response = await apiClient.get('/admin/tickets/all'); 
  return response.data;
}
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