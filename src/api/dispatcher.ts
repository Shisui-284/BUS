import apiClient from "./apiClient";
import { Employee, EmployeeRole, Trip, TripAssignment } from "../types";

export interface TripFilter {
  date?: string;
  routeId?: number;
  status?: string;
}

export interface CreateTripPayload {
  routeId: number;
  busId: number;
  departureTime: string;
  arrivalTime: string;
  status?: string;
}

export interface AssignTripPayload {
  tripId: number;
  employeeId: number;
  role: EmployeeRole;
}

export async function getTrips(filter?: TripFilter): Promise<Trip[]> {
  const response = await apiClient.get<Trip[]>("/api/admin/trips", { params: filter });
  return response.data;
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const response = await apiClient.post<Trip>("/api/admin/trips", payload);
  return response.data;
}

export async function assignTripRequest(
  payload: AssignTripPayload,
): Promise<TripAssignment> {
  const response = await apiClient.post<TripAssignment>(
    "/api/admin/trip-assignments",
    payload,
  );
  return response.data;
}

export async function getAvailableEmployees(params: {
  from: string;
  to: string;
  role: EmployeeRole;
}): Promise<Employee[]> {
  const response = await apiClient.get<Employee[]>("/api/admin/employees/available", {
    params,
  });
  return response.data;
}
