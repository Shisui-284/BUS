export type UserRole = "ADMIN" | "CUSTOMER";

export type BusStatus = "AVAILABLE" | "RUNNING" | "MAINTENANCE";
export type TripStatus =
  | "SCHEDULED"
  | "RUNNING"
  | "COMPLETED"
  | "CANCELLED"
  | "DELAYED";
export type TicketStatus =
  | "BOOKED"
  | "HOLD"
  | "CONFIRMED"
  | "EXPIRED"
  | "PAID"
  | "CANCELLED"
  | "REFUNDED";
export type MaintenanceStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface Bus {
  id: number;
  licensePlate: string;
  busType: string;
  totalSeats: number;
  status: BusStatus;
}

export interface Route {
  id: number;
  origin: string;
  destination: string;
  distanceKm: number;
  estimatedDurationMin: number;
  basePrice: number;
}

export interface Trip {
  id: number;
  routeId: number;
  routeName: string;
  busId: number;
  busLabel: string;
  departureTime: string;
  arrivalTime: string;
  status: TripStatus;
  actualDepartureTime?: string;
  actualArrivalTime?: string;
  assignments: TripAssignment[];
}

export type EmployeeRole = "DRIVER" | "ASSISTANT";

export interface TripAssignment {
  id: number;
  employeeId: number;
  employeeName: string;
  role: EmployeeRole;
}


export interface Ticket {
  id: number;
  tripId: number;
  seatNumber: string;
  passengerName: string;
  passengerPhone: string;
  status: TicketStatus;
  price: number;
  expiredAt?: string;
}

export interface Payment {
  id: number;
  ticketId: number;
  amount: number;
  paymentMethod: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  paidAt?: string;
}

export interface MaintenanceRecord {
  id: number;
  busId: number;
  maintenanceType: string;
  scheduledDate: string;
  cost: number;
  status: MaintenanceStatus;
  description?: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  action: string;
  tableName: string;
  recordId: number;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
}

export interface AdminTicket {
  ticketId: number;
  routeName: string;
  departureTime: string;
  busInfo: string;
  seatNumber: string;
  passengerName: string;
  passengerPhone: string;
  bookedAt: string;
  price: number;
  status: 'BOOKED' | 'HOLD' | 'CONFIRMED' | 'EXPIRED' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  pickupPoint: string | null;
  dropoffPoint: string | null;
}
export interface Employee {
  id: number;
  fullName: string;
  phone: string;
  hometown?: string;
  experienceYears?: number;
  joinDate?: string;
  employeeType: 'DRIVER' | 'ASSISTANT' | 'TECHNICIAN' | 'DISPATCHER' | 'MANAGER';
  status: 'ACTIVE' | 'INACTIVE';
  currentTripInfo?: string;
}