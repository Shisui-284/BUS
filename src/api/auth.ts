import apiClient from "./apiClient";
import { User } from "../types";

export interface LoginRequest {
  username: string;
  password: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
}

export interface RegisterRequest {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export function loginRequest(payload: LoginRequest): Promise<LoginResponse> {
  return apiClient
    .post<LoginResponse>("/public/auth/login", payload)
    .then((response) => response.data);
}

export function registerRequest(
  payload: RegisterRequest,
): Promise<LoginResponse> {
  return apiClient
    .post<LoginResponse>("/public/auth/register", payload)
    .then((response) => response.data);
}
