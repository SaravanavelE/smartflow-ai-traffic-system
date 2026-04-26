"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { RealTimeMap } from "./RealTimeMap";
import { NavSidebar } from "./NavSidebar";
import { StatsDashboard } from "./StatsDashboard";
import { SignalStatus } from "./SignalStatus";
import { FeedbackDialog } from "./FeedbackDialog";
import { EmergencyControl } from "./EmergencyControl";
import { AdminDashboard } from "./AdminDashboard";
import { LiveSignalBoard } from "./LiveSignalBoard";
import { PredictionsPanel } from "./PredictionsPanel";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useBackendAPI } from "@/hooks/use-backend-api";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { TrafficOptimizationOutput } from "@/ai/flows/traffic-optimization-flow";
import type { PredictionResult } from "@/hooks/use-backend-api";
import {
  LocateFixed, LogOut, Shield, User, Siren,
  ChevronLeft, ChevronRight, Wifi, Server, X
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RouteSignal {
  id: string;
  name: string;
  status: "GREEN" | "YELLOW" | "RED";
  timeLeft: number;
  distanceM?: number;
}

// ─── Role badge config ────────────────────────────────────────────────────────

const ROLE_BADGE = {
  admin: {
    label: "Admin",
    icon: <Shield className="h-3 w-3" />,
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  user: {
    label: "User",
    icon: <User className="h-3 w-3" />,
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  emergency: {
    label: "Emergency",
    icon: <Siren className="h-3 w-3" />,
    color: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SmartFlowDashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const {
    intersections,
    backendOnline,
    wsConnected,
    runCrewAnalysis,
    triggerEmergency,
    clearEmergency,
    getPrediction,
  } = useBackendAPI();

  const [startLocation, setStartLocation] = useState("Karpagam Academy of Higher Education, Pollachi Main Road, Eachanari, Coimbatore");
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>({ lat: 10.9289, lng: 76.9845 });
  const [endLocation, setEndLocation] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [isEmergencyMode, setIsEmergencyMode] = useState(false);
  const [trafficInsights, setTrafficInsights] = useState<TrafficOptimizationOutput | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<PredictionResult | null>(null);
  const [routeSignals, setRouteSignals] = useState<RouteSignal[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(384); 
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [showIncidentReport, setShowIncidentReport] = useState(false);

  const [bottomPanelHeight, setBottomPanelHeight] = useState(250);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  const isResizingBottomRef = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  const startResizingBottom = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingBottom(true);
    isResizingBottomRef.current = true;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    isResizingRef.current = false;
    setIsResizingBottom(false);
    isResizingBottomRef.current = false;
    document.body.style.cursor = "default";
    document.body.style.userSelect = "auto";
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizingRef.current) {
      const newWidth = e.clientX;
      if (newWidth > 260 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
    if (isResizingBottomRef.current) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < window.innerHeight * 0.6) {
        setBottomPanelHeight(newHeight);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [resize, stopResizing]);

  const roleBadge = user ? ROLE_BADGE[user.role] : null;

  // ── No Geolocation (Static) ──────────────────────────────────────────────────
  useEffect(() => {
    // Location is globally static: Karpagam Academy of Higher Education
    setCurrentCoords({ lat: 10.9289, lng: 76.9845 });
    setStartLocation("Karpagam Academy of Higher Education, Pollachi Main Road, Eachanari, Coimbatore");
  }, []);

  // ── Sync Map Selection ──────────────────────────────────────────────────────
  useEffect(() => {
    const handleAdminSelect = (e: any) => {
      if (user?.role === "admin") {
        setActiveStream(e.detail);
      }
    };
    window.addEventListener('admin_select_stream', handleAdminSelect);
    return () => window.removeEventListener('admin_select_stream', handleAdminSelect);
  }, [user]);

  const handleUpdateStartLocation = (name: string, coords: { lat: number, lng: number }) => {
    setStartLocation(name);
    setCurrentCoords({ lat: coords.lat, lng: coords.lng });
  };

  // ── Navigation handlers ──────────────────────────────────────────────────────
  const handleStartNavigation = (dest: string) => {
    setEndLocation(dest);
    setIsNavigating(true);
    toast({ title: "🗺️ Route Calculating", description: `Finding optimal path to ${dest}...` });

    if (backendOnline && intersections[0]) {
      getPrediction(intersections[0].intersection_id).then((pred) => {
        if (pred) {
          setCurrentPrediction(pred);
          toast({
            title: `🔮 AI Forecast — ${pred.predicted_congestion["10min"]} in 10 min`,
            description: pred.recommendation,
          });
        }
      });
    }
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
    setEndLocation("");
    setTrafficInsights(null);
    setCurrentPrediction(null);
    setRouteSignals([]);
    setActiveStream(null);
    setShowIncidentReport(false);
    if (isEmergencyMode) {
      setIsEmergencyMode(false);
      intersections.forEach((i) => clearEmergency(i.intersection_id));
    }
  };

  const handleEmergencyToggle = async (active: boolean) => {
    setIsEmergencyMode(active);

    if (active && backendOnline && intersections[0]) {
      const result = await triggerEmergency(
        intersections[0].intersection_id,
        user?.role === "emergency" ? "ambulance" : "civilian_emergency",
        "north",
        45
      );
      if (result) {
        toast({
          title: "🚨 Backend Confirmed",
          description: result.confirmation,
          variant: "destructive",
        });
      }
    } else if (!active && backendOnline) {
      intersections.forEach((i) => clearEmergency(i.intersection_id));
    }
  };

  // Convert map signal format to LiveSignalBoard format
  const handleSignalsUpdate = useCallback((signals: any[]) => {
    const converted: RouteSignal[] = signals.map((s, idx) => ({
      id: s.id,
      name: s.name || `Signal ${idx + 1}`,
      status: s.status,
      timeLeft: s.timeLeft,
      distanceM: idx === 0 ? 200 : (idx * 400),
    }));
    setRouteSignals(converted);
  }, []);

  return (
    <TooltipProvider>
      <div className="relative flex h-screen w-full flex-col md:flex-row overflow-hidden">

        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside
          style={{ width: sidebarCollapsed ? 0 : sidebarWidth }}
          className={cn(
            "z-30 shrink-0 bg-background/95 backdrop-blur-md",
            "flex flex-col shadow-2xl relative",
            !isResizing && "transition-all duration-300",
            sidebarCollapsed && "overflow-hidden"
          )}
        >
          {!sidebarCollapsed && (
            <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">

              {/* Logo + header */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.3)] shrink-0">
                    <LocateFixed className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base font-black tracking-tight leading-none truncate">
                      SmartFlow
                    </h1>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold truncate">
                      AI Traffic Management
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {/* Backend status pill */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold border cursor-default select-none",
                          backendOnline
                            ? "bg-green-500/10 text-green-400 border-green-500/30"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/30"
                        )}
                      >
                        <Server className="h-2.5 w-2.5" />
                        {backendOnline ? "API" : "DEMO"}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {backendOnline
                        ? `Backend online${wsConnected ? " · WebSocket live" : ""}`
                        : "Backend offline — running in demo mode"}
                    </TooltipContent>
                  </Tooltip>

                  <Button
                    variant="ghost" size="icon"
                    onClick={logout}
                    className="h-8 w-8 text-muted-foreground hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* User pill */}
              {user && roleBadge && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border shrink-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <Badge className={cn("text-[9px] border gap-1 shrink-0 h-5 px-1.5", roleBadge.color)}>
                    {roleBadge.icon}
                    <span>{roleBadge.label}</span>
                  </Badge>
                </div>
              )}

              {/* Role-based content */}
              {user?.role === "admin" ? (
                <div className="flex-1 overflow-y-auto -mx-4 min-h-0">
                  <AdminDashboard
                    intersections={intersections}
                    backendOnline={backendOnline}
                    onRunCrew={runCrewAnalysis}
                    onTriggerEmergency={(id) =>
                      triggerEmergency(id, "ambulance", "north", 30)
                    }
                    onClearEmergency={clearEmergency}
                    onSelectStream={setActiveStream}
                  />
                </div>
              ) : (
                <>
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <NavSidebar
                      onStart={handleStartNavigation}
                      onStop={handleStopNavigation}
                      isNavigating={isNavigating}
                      startLocation={startLocation}
                      endLocation={endLocation}
                      onSetStart={handleUpdateStartLocation}
                    />
                  </div>

                  <div className="flex flex-col gap-3 shrink-0 mt-auto">
                    <EmergencyControl
                      isActive={isEmergencyMode}
                      onToggle={handleEmergencyToggle}
                      currentLocation={startLocation}
                      destination={endLocation}
                      onDestinationOverride={handleStartNavigation}
                    />
                    <FeedbackDialog onOpenInline={() => setShowIncidentReport(true)} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed((v) => !v)}
            className={cn(
              "absolute -right-3.5 top-1/2 -translate-y-1/2 z-50",
              "w-7 h-14 bg-background border border-border rounded-full",
              "hidden md:flex items-center justify-center",
              "text-muted-foreground hover:text-white transition-colors shadow-lg"
            )}
          >
            {sidebarCollapsed
              ? <ChevronRight className="h-3.5 w-3.5" />
              : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

        </aside>

        {/* Resizer Handle / Splitter Line */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={startResizing}
            className={cn(
              "hidden md:block w-1.5 cursor-col-resize z-[100] self-stretch transition-all",
              "bg-border/30 hover:bg-accent/50",
              isResizing ? "bg-accent w-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "hover:w-2"
            )}
          >
            <div className="h-full w-px bg-border/50 mx-auto" />
          </div>
        )}

        {/* ── Map ───────────────────────────────────────────────────────────── */}
        <section className="relative flex-1 flex flex-col overflow-hidden bg-background">
          <div className="relative flex-1 min-h-0">
            {showIncidentReport ? (
               <div className="w-full h-full bg-background flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 relative">
                  <Button 
                    variant="ghost" size="icon" 
                    onClick={() => setShowIncidentReport(false)} 
                    className="absolute top-4 right-4 z-[1000] text-muted-foreground hover:text-white bg-secondary/50 rounded-full h-10 w-10">
                      <X className="h-5 w-5"/>
                  </Button>
                  <div className="max-w-2xl w-full">
                    <FeedbackDialog 
                      inline={true} 
                      onClose={() => setShowIncidentReport(false)} 
                    />
                  </div>
               </div>
            ) : activeStream ? (
              <div className="w-full h-full bg-black flex items-center justify-center relative">
                <Button
                  variant="ghost" size="icon"
                  onClick={() => setActiveStream(null)}
                  className="absolute top-4 right-4 z-[1000] text-white hover:bg-white/20 bg-black/40 rounded-full h-10 w-10">
                  <X className="h-5 w-5" />
                </Button>
                <video
                  src={`/video/${['1074486089-preview.mp4', '1102463567-preview.mp4', '3717052391-preview.mp4', '3726881551-preview.mp4', '3847055011-preview.mp4', '3847056339-preview.mp4'][parseInt(activeStream.replace(/\D/g, '') || '0') % 6]}`}
                  loop muted autoPlay playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE FEED
                  </div>
                  <div className="bg-background/90 backdrop-blur-md text-white border border-border text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                    {activeStream} CCTV
                  </div>
                </div>
              </div>
            ) : (
              <RealTimeMap
                isNavigating={isNavigating}
                isEmergencyMode={isEmergencyMode}
                destination={endLocation}
                onInsightsUpdate={setTrafficInsights}
                onSignalsUpdate={handleSignalsUpdate}
                currentCoords={currentCoords}
              />
            )}

            {/* ── Right overlay panel ─────────────────────────────────────────── */}
            <div className="absolute top-4 right-4 z-[500] flex flex-col gap-3 w-64 pointer-events-none">
              {isNavigating && (
                <>
                  {/* Signal status widget */}
                  <div className="pointer-events-auto">
                    <SignalStatus isEmergencyMode={isEmergencyMode} />
                  </div>

                  {/* AI speed insight */}
                  {trafficInsights && (
                    <div className="pointer-events-auto bg-background/90 backdrop-blur-md border border-accent/30 rounded-xl p-3 shadow-xl animate-in slide-in-from-right duration-500">
                      <div className="flex items-center gap-2 text-accent mb-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          AI Speed Insight
                        </span>
                      </div>
                      <p className="text-xs font-medium leading-snug text-white">
                        {trafficInsights.suggestedSpeedInstruction}
                      </p>
                    </div>
                  )}

                  {/* 10/15 min prediction */}
                  <div className="pointer-events-auto">
                    <PredictionsPanel
                      prediction={currentPrediction}
                      isVisible={isNavigating}
                    />
                  </div>
                </>
              )}
            </div>

            {/* WebSocket live indicator */}
            {wsConnected && (
              <div className="absolute bottom-4 right-4 z-[500] flex items-center gap-1.5 bg-background/90 backdrop-blur border border-green-500/30 text-green-400 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-lg">
                <Wifi className="h-3 w-3 animate-pulse" />
                LIVE
              </div>
            )}
          </div>

          {/* Horizontal Resizer / Splitter Line */}
          {isNavigating && (
            <div
              onMouseDown={startResizingBottom}
              className={cn(
                "h-1.5 cursor-row-resize z-[100] w-full transition-all border-t border-border/50 flex items-center shrink-0",
                "bg-border/30 hover:bg-accent/50",
                isResizingBottom ? "bg-accent h-2 shadow-[0_0_15px_rgba(59,130,246,0.2)]" : "hover:h-2"
              )}
            >
              <div className="w-12 h-px bg-border/50 mx-auto rounded-full" />
            </div>
          )}

          {/* ── Bottom panel ────────────────────────────────────────────────── */}
          {isNavigating && (
            <div 
              style={{ height: bottomPanelHeight }}
              className={cn(
                "shrink-0 bg-background/95 backdrop-blur-md p-4 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4",
                !isResizingBottom && "transition-all duration-300"
              )}
            >
              {/* Stats row */}
              <StatsDashboard insights={trafficInsights} />

              {/* Live signal board */}
              <div className="h-full max-h-48 overflow-y-auto">
                <LiveSignalBoard
                  signals={routeSignals}
                  isEmergencyMode={isEmergencyMode}
                  isVisible={routeSignals.length > 0}
                />
              </div>
            </div>
          )}
        </section>

        <Toaster />
      </div>
    </TooltipProvider>
  );
}
