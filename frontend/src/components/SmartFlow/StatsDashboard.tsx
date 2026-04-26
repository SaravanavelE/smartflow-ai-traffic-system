"use client";

import React from "react";
import { Activity, Gauge, Timer, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrafficOptimizationOutput } from "@/ai/flows/traffic-optimization-flow";

interface StatsDashboardProps {
  insights: TrafficOptimizationOutput | null;
}

export function StatsDashboard({ insights }: StatsDashboardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <MetricCard
        label="Congestion Level"
        value={insights?.congestionLevel || "Medium"}
        icon={<TrendingUp className="h-4 w-4" />}
        color={insights?.congestionLevel === "Severe" ? "text-red-500" : (insights?.congestionLevel === "High" ? "text-orange-500" : "text-accent")}
        footer="Traffic flow is 12% faster than usual"
      />
      <MetricCard
        label="Flow Efficiency"
        value="84%"
        icon={<Activity className="h-4 w-4" />}
        color="text-accent"
        progress={84}
      />
      <MetricCard
        label="Avg. Speed"
        value="42 km/h"
        icon={<Gauge className="h-4 w-4" />}
        color="text-accent"
        footer="Optimal speed for green corridor"
      />
      <MetricCard
        label="Est. Waiting Time"
        value="3.5 min"
        icon={<Timer className="h-4 w-4" />}
        color="text-accent"
        footer="Across 12 traffic signals"
      />
    </div>
  );
}

function MetricCard({ label, value, icon, color, footer, progress }: any) {
  return (
    <Card className="bg-background/90 backdrop-blur-md border-border overflow-hidden shadow-2xl">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
          <div className={`${color} p-1.5 rounded-lg bg-secondary/50`}>
            {icon}
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-2xl font-black ${color}`}>{value}</span>
        </div>
        {progress !== undefined && (
          <Progress value={progress} className="h-1.5 bg-secondary" />
        )}
        {footer && (
          <p className="text-[10px] text-muted-foreground font-medium">{footer}</p>
        )}
      </CardContent>
    </Card>
  );
}