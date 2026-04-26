"use client";

import React, { useState } from "react";
import { Siren, ShieldCheck, Lock, AlertTriangle, Building2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { emergencyCorridorConfirmation } from "@/ai/flows/emergency-corridor-flow";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

interface EmergencyControlProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  currentLocation: string;
  destination: string;
  onDestinationOverride?: (dest: string) => void;
}

const HOSPITALS = [
  "Apollo Hospital, Chennai",
  "Government General Hospital, Chennai",
  "Fortis Malar Hospital, Chennai",
  "MIOT International, Chennai",
  "Sri Ramachandra Hospital, Chennai",
];

export function EmergencyControl({
  isActive,
  onToggle,
  currentLocation,
  destination,
  onDestinationOverride,
}: EmergencyControlProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedHospital, setSelectedHospital] = useState(HOSPITALS[0]);
  const [showHospitalPicker, setShowHospitalPicker] = useState(false);

  // Determine if this user can trigger emergency
  const canTriggerEmergency =
    user?.role === "emergency" || // Always allowed for emergency users
    (user?.role === "user" && destination?.toLowerCase().includes("hospital")); // User only if dest is hospital

  const isLocked = !canTriggerEmergency;

  const handleToggle = async (checked: boolean) => {
    if (isLocked) {
      toast({
        title: "Access Restricted",
        description:
          user?.role === "user"
            ? "As a normal user, emergency mode is only available when navigating to a hospital."
            : "Only emergency vehicle drivers can activate emergency corridors.",
        variant: "destructive",
      });
      return;
    }

    onToggle(checked);

    if (checked) {
      // For normal users, override destination to selected hospital
      if (user?.role === "user" && onDestinationOverride) {
        onDestinationOverride(selectedHospital);
      }

      const dest =
        user?.role === "emergency"
          ? destination || "Nearest Medical Center"
          : selectedHospital;

      try {
        const response = await emergencyCorridorConfirmation({
          emergencyModeActive: true,
          currentLocation,
          destination: dest,
          routeId: `EM-${Math.floor(Math.random() * 9000) + 1000}`,
        });
        toast({
          title: `🚨 EMERGENCY MODE — ${user?.role === "emergency" ? user.badgeId : "User"}`,
          description: response.confirmationMessage,
          variant: "destructive",
        });
      } catch (err) {
        toast({
          title: "Emergency Mode Active",
          description: `Green corridor activated to ${dest}. All signals ahead set to green.`,
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Emergency Mode Deactivated",
        description: "Standard traffic rules re-applied.",
      });
    }
  };

  return (
    <div
      className={cn(
        "p-4 rounded-2xl border transition-all duration-500",
        isActive
          ? "bg-red-500/10 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
          : isLocked
          ? "bg-muted/30 border-border opacity-80"
          : "bg-secondary border-border"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              isActive
                ? "bg-red-500 text-white animate-pulse"
                : isLocked
                ? "bg-muted text-muted-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isLocked ? <Lock className="h-5 w-5" /> : <Siren className="h-6 w-6" />}
          </div>
          <div>
            <Label htmlFor="emergency-mode" className="text-sm font-bold block">
              Emergency Mode
            </Label>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              {user?.role === "emergency"
                ? `Badge: ${user.badgeId}`
                : user?.role === "user"
                ? "Hospital destinations only"
                : "Admin view"}
            </span>
          </div>
        </div>
        <Switch
          id="emergency-mode"
          checked={isActive}
          onCheckedChange={handleToggle}
          className="data-[state=checked]:bg-red-500"
          disabled={isLocked && user?.role !== "user"}
        />
      </div>

      {/* Hospital picker for normal users */}
      {user?.role === "user" && !isActive && (
        <div className="mt-2">
          <button
            onClick={() => setShowHospitalPicker((v) => !v)}
            className="flex items-center gap-2 text-xs text-accent hover:text-accent/80 font-semibold"
          >
            <Building2 className="h-3.5 w-3.5" />
            Navigate to hospital + enable emergency
          </button>

          {showHospitalPicker && (
            <div className="mt-2 flex flex-col gap-1 bg-background/80 rounded-xl border border-border p-2">
              {HOSPITALS.map((h) => (
                <button
                  key={h}
                  onClick={() => {
                    setSelectedHospital(h);
                    if (onDestinationOverride) onDestinationOverride(h);
                    setShowHospitalPicker(false);
                    handleToggle(true);
                  }}
                  className="text-left text-xs px-3 py-2 rounded-lg hover:bg-secondary transition-colors font-medium text-white/80 hover:text-white"
                >
                  🏥 {h}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isActive && (
        <div className="bg-red-500/20 rounded-lg p-3 flex items-start gap-3 animate-in zoom-in duration-300">
          <ShieldCheck className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-semibold text-red-200 leading-tight">
            {user?.role === "emergency"
              ? "🚨 GREEN CORRIDOR ACTIVE — All signals ahead set to green. Priority route cleared."
              : "🏥 Emergency route to hospital active. Signals ahead optimized for clear passage."}
          </p>
        </div>
      )}

      {isLocked && user?.role !== "user" && (
        <div className="bg-muted/50 rounded-lg p-2.5 flex items-center gap-2 mt-1">
          <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Only emergency vehicle operators can activate this.
          </p>
        </div>
      )}
    </div>
  );
}
