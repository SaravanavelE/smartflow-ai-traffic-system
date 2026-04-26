"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "user" | "emergency";

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  badgeId?: string; // for emergency users
  license?: string;
  vehicle?: string;
  hospital?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: Omit<AuthUser, "id"> & { password: string }) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Mock user database — we export it so AdminDashboard can read all registered users.
export const MOCK_USERS_DB: Record<string, AuthUser & { password: string }> = {
  "admin@smartflow.com": {
    id: "adm-001",
    name: "City Traffic Police",
    email: "admin@smartflow.com",
    role: "admin",
    password: "admin123",
    license: "POL-001"
  },
  "user@smartflow.com": {
    id: "usr-001",
    name: "Saravanavel",
    email: "user@smartflow.com",
    role: "user",
    password: "user123",
    license: "TN-12-X-9002"
  },
  "ambulance@smartflow.com": {
    id: "emg-001",
    name: "Apollo Hospital Unit 4",
    email: "ambulance@smartflow.com",
    role: "emergency",
    badgeId: "TN-AMB-A12",
    password: "emerg123",
    vehicle: "TN-01-AB-1234",
    license: "DRV-1192A",
    hospital: "Apollo Main"
  },
  "fire@smartflow.com": {
    id: "emg-002",
    name: "Fire Unit #F7",
    email: "fire@smartflow.com",
    role: "emergency",
    badgeId: "TN-FIRE-F7",
    password: "emerg123",
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = async (email: string, password: string): Promise<boolean> => {
    const record = MOCK_USERS_DB[email.toLowerCase()];
    if (record && record.password === password) {
      const { password: _, ...authUser } = record;
      setUser(authUser);
      return true;
    }
    return false;
  };

  const signup = async (userData: Omit<AuthUser, "id"> & { password: string }): Promise<boolean> => {
    const email = userData.email.toLowerCase();
    if (MOCK_USERS_DB[email]) return false; // Already exists

    const id = `${userData.role}-${Math.floor(Math.random() * 90000) + 10000}`;
    MOCK_USERS_DB[email] = { ...userData, id };
    
    // Auto-login after signup
    const { password: _, ...authUser } = MOCK_USERS_DB[email];
    setUser(authUser);
    return true;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
