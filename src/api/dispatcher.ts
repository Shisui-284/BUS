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
  const response = await apiClient.get<Trip[]>("/trips", { params: filter });
  return response.data;
}

export async function createTrip(payload: CreateTripPayload): Promise<Trip> {
  const response = await apiClient.post<Trip>("/trips", payload);
  return response.data;
}

export async function assignTripRequest(
  payload: AssignTripPayload,
): Promise<TripAssignment> {
  const response = await apiClient.post<TripAssignment>(
    "/trip-assignments",
    payload,
  );
  return response.data;
}

export async function getAvailableEmployees(params: {
  from: string;
  to: string;
  role: EmployeeRole;
}): Promise<Employee[]> {
  const response = await apiClient.get<Employee[]>("/employees/available", {
    params,
  });
  return response.data;
}
