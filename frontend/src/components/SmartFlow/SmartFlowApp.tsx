"use client";

import { useAuth } from "@/context/AuthContext";
import { LoginPage } from "./LoginPage";
import { SmartFlowDashboard } from "./SmartFlowDashboard";

export function SmartFlowApp() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <SmartFlowDashboard /> : <LoginPage />;
}
