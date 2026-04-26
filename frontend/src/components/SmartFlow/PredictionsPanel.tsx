"use client";

import React, { useState, useEffect } from "react";
import { Brain, TrendingUp, TrendingDown, Minus, Clock, CloudRain, Sun, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { PredictionResult } from "@/hooks/use-backend-api";

interface PredictionsPanelProps {
  prediction?: PredictionResult | null;
  isLoading?: boolean;
  isVisible: boolean;
}

const CONGESTION_CONFIG = {
  Low:    { color: "text-green-400",  bg: "bg-green-500/10",  border: "border-green-500/20",  icon: <TrendingDown className="h-3.5 w-3.5" />, bar: 25 },
  Medium: { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: <Minus className="h-3.5 w-3.5" />,        bar: 60 },
  High:   { color: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    icon: <TrendingUp className="h-3.5 w-3.5" />,   bar: 90 },
  Severe: { color: "text-red-500",    bg: "bg-red-500/15",    border: "border-red-500/30",    icon: <AlertTriangle className="h-3.5 w-3.5" />, bar: 100 },
};

// Simulated live predictions when no backend
function simulatePrediction(): PredictionResult {
  const now = new Date();
  const hour = now.getHours();
  const isPeak = [8, 9, 17, 18, 19].includes(hour);
  const levels = isPeak ? ["High", "High", "Medium", "Severe"] : ["Low", "Low", "Medium", "Low"];
  const level10 = levels[Math.floor(Math.random() * levels.length)] as "Low" | "Medium" | "High";
  const level15 = levels[Math.floor(Math.random() * levels.length)] as "Low" | "Medium" | "High";
  return {
    intersection_id: "INT-001",
    predicted_congestion: { "10min": level10, "15min": level15 },
    confidence_level: 0.72 + Math.random() * 0.2,
    weather_impact: Math.random() > 0.7 ? "Light rain detected — +8% density" : "No weather impact",
    recommendation: isPeak
      ? "Consider departing 15 mins early or using alternate route via ECR."
      : "Current route optimal — low congestion expected.",
  };
}

export function PredictionsPanel({ prediction, isLoading, isVisible }: PredictionsPanelProps) {
  const [liveData, setLiveData] = useState<PredictionResult>(simulatePrediction());

  // Refresh simulation every 45s if no backend data
  useEffect(() => {
    if (prediction) return;
    const iv = setInterval(() => setLiveData(simulatePrediction()), 45_000);
    return () => clearInterval(iv);
  }, [prediction]);

  const data = prediction || liveData;
  const c10 = CONGESTION_CONFIG[data.predicted_congestion["10min"] as keyof typeof CONGESTION_CONFIG] || CONGESTION_CONFIG.Medium;
  const c15 = CONGESTION_CONFIG[data.predicted_congestion["15min"] as keyof typeof CONGESTION_CONFIG] || CONGESTION_CONFIG.Medium;
  const hasRain = data.weather_impact.toLowerCase().includes("rain");

  if (!isVisible) return null;

  return (
    <Card className={cn(
      "bg-background/90 backdrop-blur-md border-border shadow-2xl animate-in slide-in-from-bottom duration-500",
    )}>
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-bold flex items-center gap-2 text-white">
          <Brain className="h-3.5 w-3.5 text-purple-400" />
          AI Traffic Forecast
          {isLoading && (
            <span className="text-[9px] text-muted-foreground font-normal animate-pulse">Updating...</span>
          )}
          <span className="ml-auto text-[9px] text-muted-foreground font-normal">
            {(data.confidence_level * 100).toFixed(0)}% confidence
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 flex flex-col gap-3">
        {/* 10 min / 15 min forecast */}
        <div className="grid grid-cols-2 gap-2">
          {([
            { label: "In 10 min", cfg: c10, level: data.predicted_congestion["10min"] },
            { label: "In 15 min", cfg: c15, level: data.predicted_congestion["15min"] },
          ] as const).map(({ label, cfg, level }) => (
            <div key={label} className={cn("rounded-xl p-2.5 border", cfg.bg, cfg.border)}>
              <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" /> {label}
              </p>
              <div className={cn("flex items-center gap-1.5 font-black text-sm", cfg.color)}>
                {cfg.icon} {level}
              </div>
              <Progress
                value={cfg.bar}
                className={cn("h-1 mt-1.5", level === "High" || level === "Severe" ? "[&>div]:bg-red-500" : level === "Medium" ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500")}
              />
            </div>
          ))}
        </div>

        {/* Weather */}
        <div className="flex items-center gap-2 text-[10px]">
          {hasRain
            ? <CloudRain className="h-3.5 w-3.5 text-blue-400 shrink-0" />
            : <Sun className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
          <span className="text-muted-foreground">{data.weather_impact}</span>
        </div>

        {/* Recommendation */}
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-2.5">
          <p className="text-[10px] font-semibold text-accent leading-snug">
            💡 {data.recommendation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
