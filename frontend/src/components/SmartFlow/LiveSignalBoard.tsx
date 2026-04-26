"use client";

/**
 * LiveSignalBoard
 * Compact panel showing live signal states for intersections on the active route.
 * Updates every second via the shared signal state from the parent.
 */

import React from "react";
import { TrafficCone, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignalEntry {
  id: string;
  name: string;
  status: "GREEN" | "YELLOW" | "RED";
  timeLeft: number;
  distanceM?: number;
}

interface LiveSignalBoardProps {
  signals: SignalEntry[];
  isEmergencyMode: boolean;
  isVisible: boolean;
}

const STATUS_STYLE = {
  GREEN:  { dot: "bg-green-500 shadow-[0_0_6px_#22c55e]",  text: "text-green-400",  label: "GO"   },
  YELLOW: { dot: "bg-yellow-400 shadow-[0_0_6px_#eab308]", text: "text-yellow-400", label: "SLOW" },
  RED:    { dot: "bg-red-500 shadow-[0_0_6px_#ef4444]",    text: "text-red-400",    label: "STOP" },
};

export function LiveSignalBoard({ signals, isEmergencyMode, isVisible }: LiveSignalBoardProps) {
  if (!isVisible || signals.length === 0) return null;

  const greenCount  = signals.filter(s => s.status === "GREEN").length;
  const yellowCount = signals.filter(s => s.status === "YELLOW").length;
  const redCount    = signals.filter(s => s.status === "RED").length;
  const allGreen    = greenCount === signals.length;

  return (
    <div className="bg-background/90 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden w-full animate-in slide-in-from-bottom duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <TrafficCone className="h-3.5 w-3.5 text-accent" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">
            Signals on Route
          </span>
        </div>
        {isEmergencyMode ? (
          <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 rounded-full px-2 py-0.5">
            <Zap className="h-2.5 w-2.5 text-red-400" />
            <span className="text-[9px] font-black text-red-400 uppercase">ALL GREEN</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[9px] font-bold">
            {greenCount > 0  && <span className="text-green-400">{greenCount}🟢</span>}
            {yellowCount > 0 && <span className="text-yellow-400">{yellowCount}🟡</span>}
            {redCount > 0    && <span className="text-red-400">{redCount}🔴</span>}
          </div>
        )}
      </div>

      {/* Signal rows */}
      <div className="flex flex-col divide-y divide-border/40 max-h-44 overflow-y-auto">
        {signals.map((sig, idx) => {
          const s = STATUS_STYLE[sig.status];
          return (
            <div
              key={sig.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-colors",
                idx === 0 && "bg-accent/5"
              )}
            >
              {/* Signal light */}
              <div className="flex flex-col gap-[3px] bg-black/40 p-1.5 rounded-lg shrink-0">
                <div className={cn("w-2.5 h-2.5 rounded-full transition-all", sig.status === "RED"    ? "bg-red-500 shadow-[0_0_5px_#ef4444]" : "bg-red-900/30")} />
                <div className={cn("w-2.5 h-2.5 rounded-full transition-all", sig.status === "YELLOW" ? "bg-yellow-400 shadow-[0_0_5px_#eab308]" : "bg-yellow-900/30")} />
                <div className={cn("w-2.5 h-2.5 rounded-full transition-all", sig.status === "GREEN"  ? "bg-green-500 shadow-[0_0_5px_#22c55e]" : "bg-green-900/30")} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{sig.name}</p>
                {sig.distanceM !== undefined && (
                  <p className="text-[9px] text-muted-foreground mb-0.5">
                    {sig.distanceM < 1000 ? `${sig.distanceM}m ahead` : `${(sig.distanceM/1000).toFixed(1)}km ahead`}
                  </p>
                )}
                {/* Speed Suggestion */}
                {sig.distanceM !== undefined && (
                  <div className="mt-1">
                    {(() => {
                       const speedKmph = 40; 
                       const timeToReach = sig.distanceM / (speedKmph * 0.277778);
                       if (sig.status === "GREEN") {
                         if (timeToReach <= sig.timeLeft) return <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-semibold truncate block">Maintain {speedKmph} km/h to pass</span>;
                         return <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-semibold truncate block">Slow down, will turn RED</span>;
                       } else if (sig.status === "RED") {
                         if (timeToReach >= sig.timeLeft) return <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 font-semibold truncate block">Keep {speedKmph} km/h, will be GREEN</span>;
                         return <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-semibold truncate block">Prepare to stop</span>;
                       } else {
                         return <span className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 font-semibold truncate block">Slow down</span>;
                       }
                    })()}
                  </div>
                )}
              </div>

              {/* Status + timer */}
              <div className="text-right shrink-0">
                <p className={cn("text-[10px] font-black", s.text)}>{s.label}</p>
                <p className="text-[11px] font-mono font-bold text-white">
                  {sig.timeLeft === 99 ? "∞" : `${sig.timeLeft}s`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
