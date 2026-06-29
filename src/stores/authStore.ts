// ============================================================================
// AUTH STORE — Zustand store quản lý auth state (Zustand + persist)
// State: { token, user }
// Action: login(), register(), googleLogin(), logout()
// Persist vào localStorage key "auth-storage"
// ============================================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  loginRequest,
  registerRequest,
  googleLoginRequest,
  LoginRequest,
  RegisterRequest,
} from "../api/auth";
import { User } from "../types";

function normalizeRole(role: string | undefined): User["role"] {
  if (role === "ADMIN" || role === "CUSTOMER") {
    return role as User["role"];
  }
  // Unknown role from persisted state: treat as CUSTOMER instead of logging out
  return "CUSTOMER";
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (payload: LoginRequest) => Promise<User>;
  register: (payload: RegisterRequest) => Promise<User>;
  googleLogin: (idToken: string, role?: string) => Promise<User>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      login: async (payload: LoginRequest) => {
        set({ isLoading: true });
        try {
          const response = await loginRequest(payload);
          localStorage.setItem("token", response.token);
          set({ token: response.token, user: response.user });
          return response.user;
        } finally {
          set({ isLoading: false });
        }
      },
      register: async (payload: RegisterRequest) => {
        set({ isLoading: true });
        try {
          const response = await registerRequest(payload);
          localStorage.setItem("token", response.token);
          set({ token: response.token, user: response.user });
          return response.user;
        } finally {
          set({ isLoading: false });
        }
      },
      googleLogin: async (idToken: string, role?: string) => {
        set({ isLoading: true });
        try {
          const response = await googleLoginRequest(idToken, role);
          localStorage.setItem("token", response.token);
          set({ token: response.token, user: response.user });
          return response.user;
        } finally {
          set({ isLoading: false });
        }
      },
      logout: () => {
        set({ user: null, token: null });
        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: "auth-storage",
      getStorage: () => localStorage,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (state.user) {
            state.user = {
              ...state.user,
              role: normalizeRole(state.user.role),
            };
          }
          state.isLoading = false;
        }
      },
    },
  ),
);
