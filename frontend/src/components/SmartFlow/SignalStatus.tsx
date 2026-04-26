"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Siren } from "lucide-react";

interface SignalStatusProps {
  isEmergencyMode?: boolean;
}

export function SignalStatus({ isEmergencyMode = false }: SignalStatusProps) {
  const [timer, setTimer] = useState(15);
  const [status, setStatus] = useState<"GREEN" | "YELLOW" | "RED">("GREEN");

  useEffect(() => {
    if (isEmergencyMode) {
      setStatus("GREEN");
      setTimer(99);
      return;
    }

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (status === "GREEN") { setStatus("YELLOW"); return 5; }
          if (status === "YELLOW") { setStatus("RED"); return 20; }
          setStatus("GREEN"); return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, isEmergencyMode]);

  return (
    <div
      className={cn(
        "bg-background/90 backdrop-blur-md border rounded-2xl p-4 shadow-2xl flex items-center gap-4 animate-in slide-in-from-right duration-500",
        isEmergencyMode ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "border-border",
      )}
    >
      {/* Traffic light */}
      <div className="flex flex-col gap-1.5 bg-black/40 p-2 rounded-xl border border-white/5">
        <div className={cn("w-4 h-4 rounded-full transition-all duration-300",
          status === "RED" ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]" : "bg-red-900/30")} />
        <div className={cn("w-4 h-4 rounded-full transition-all duration-300",
          status === "YELLOW" ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]" : "bg-yellow-900/30")} />
        <div className={cn("w-4 h-4 rounded-full transition-all duration-300",
          status === "GREEN" ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]" : "bg-green-900/30")} />
      </div>

      <div className="flex-1">
        {isEmergencyMode ? (
          <div className="flex items-center gap-1.5">
            <Siren className="h-3.5 w-3.5 text-red-400 animate-pulse" />
            <span className="text-xs font-black text-red-400 uppercase tracking-wide">
              All Green
            </span>
          </div>
        ) : (
          <>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Next Signal
            </p>
            <h4 className={cn("text-lg font-black leading-tight",
              status === "GREEN" ? "text-green-500" : status === "YELLOW" ? "text-yellow-500" : "text-red-500"
            )}>
              {status}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-mono font-bold text-white tabular-nums">{timer}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">sec</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
