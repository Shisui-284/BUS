import { create } from "zustand";
import {
  assignTripRequest,
  getAvailableEmployees,
  getTrips,
  TripFilter,
} from "../api/dispatcher";
import { Employee, EmployeeRole, Trip, TripAssignment } from "../types";

interface DispatcherState {
  trips: Trip[];
  employees: Employee[];
  isLoading: boolean;
  isAssigning: boolean;
  loadTrips: (filter?: TripFilter) => Promise<void>;
  loadAvailableEmployees: (
    from: string,
    to: string,
    role: EmployeeRole,
  ) => Promise<void>;
  getEmployee: (employeeId: number) => Employee | undefined;
  getTripAssignments: (tripId: number) => TripAssignment[];
  isEmployeeAvailable: (employeeId: number) => boolean;
  assignTrip: (
    tripId: number,
    employeeId: number,
    role: EmployeeRole,
  ) => Promise<boolean>;
}

export const useDispatcherStore = create<DispatcherState>()((set, get) => ({
  trips: [],
  employees: [],
  isLoading: false,
  isAssigning: false,

  loadTrips: async (filter) => {
    set({ isLoading: true });
    try {
      const trips = await getTrips(filter);
      set({ trips });
    } finally {
      set({ isLoading: false });
    }
  },

  loadAvailableEmployees: async (from, to, role) => {
    const employees = await getAvailableEmployees({ from, to, role });
    set({ employees });
  },

  getEmployee: (employeeId) =>
    get().employees.find((employee) => employee.id === employeeId),

  getTripAssignments: (tripId) => {
    const trip = get().trips.find((item) => item.id === tripId);
    return trip?.assignments ?? [];
  },

  isEmployeeAvailable: (employeeId) => {
    return get().employees.some((employee) => employee.id === employeeId);
  },

  assignTrip: async (tripId, employeeId, role) => {
    set({ isAssigning: true });
    try {
      await assignTripRequest({ tripId, employeeId, role });
      const refreshedTrips = await getTrips();
      set({ trips: refreshedTrips });
      return true;
    } finally {
      set({ isAssigning: false });
    }
  },
}));
