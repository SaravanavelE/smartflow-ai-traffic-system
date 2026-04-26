/**
 * useBackendAPI
 * React hook that connects the Next.js frontend to the FastAPI + CrewAI backend.
 * Falls back gracefully when the backend is not running.
 */

import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const WS_URL = BACKEND_URL.replace("http", "ws");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SignalTiming {
  direction: string;
  green: number;
  yellow: number;
  red: number;
}

export interface IntersectionState {
  intersection_id: string;
  name: string;
  lat: number;
  lng: number;
  congestion: "Low" | "Medium" | "High";
  signal_timings: SignalTiming[];
  emergency_override: boolean;
  last_updated: string;
}

export interface CrewAnalysisResult {
  intersection_id: string;
  crew_output: string;
  updated_state: IntersectionState;
  timestamp: string;
}

export interface EmergencyResult {
  status: string;
  intersection_id: string;
  route_id: string;
  confirmation: string;
  timestamp: string;
}

export interface PredictionResult {
  intersection_id: string;
  predicted_congestion: { "10min": string; "15min": string };
  confidence_level: number;
  weather_impact: string;
  recommendation: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useBackendAPI() {
  const [intersections, setIntersections] = useState<IntersectionState[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionId = useRef(`session-${Math.random().toString(36).slice(2)}`);

  // Health check + initial data load
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          setBackendOnline(true);
          const data = await fetch(`${BACKEND_URL}/api/intersections`).then((r) => r.json());
          setIntersections(data.intersections || []);
        }
      } catch {
        setBackendOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection for live updates
  useEffect(() => {
    if (!backendOnline) return;

    const connect = () => {
      const ws = new WebSocket(`${WS_URL}/ws/signals/${sessionId.current}`);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        // Auto-reconnect after 5s
        setTimeout(connect, 5000);
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === "initial_state" || msg.type === "signal_tick") {
            setIntersections(msg.intersections || []);
          } else if (msg.type === "intersection_update" || msg.type === "emergency_activated") {
            setIntersections((prev) =>
              prev.map((i) =>
                i.intersection_id === msg.intersection_id ? msg.data : i
              )
            );
          }
        } catch {/* ignore malformed */ }
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, [backendOnline]);

  // ─── API Methods ─────────────────────────────────────────────────────────

  const runCrewAnalysis = useCallback(
    async (intersection_id: string): Promise<CrewAnalysisResult | null> => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/crew/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intersection_id,
            traffic_data_source: "sensor_api",
            feedback_source: "user_app",
          }),
        });
        return res.ok ? res.json() : null;
      } catch {
        return null;
      }
    },
    []
  );

  const triggerEmergency = useCallback(
    async (
      intersection_id: string,
      vehicle_type: string,
      approach_direction: string,
      estimated_arrival_seconds = 30
    ): Promise<EmergencyResult | null> => {
      // Also send via WebSocket for instant broadcast
      wsRef.current?.send(
        JSON.stringify({ type: "trigger_emergency", intersection_id })
      );

      try {
        const res = await fetch(`${BACKEND_URL}/api/crew/emergency`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intersection_id,
            vehicle_type,
            approach_direction,
            estimated_arrival_seconds,
          }),
        });
        return res.ok ? res.json() : null;
      } catch {
        return null;
      }
    },
    []
  );

  const clearEmergency = useCallback(async (intersection_id: string) => {
    wsRef.current?.send(
      JSON.stringify({ type: "clear_emergency", intersection_id })
    );
    try {
      await fetch(`${BACKEND_URL}/api/crew/emergency/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intersection_id }),
      });
    } catch {/* ignore */ }
  }, []);

  const getPrediction = useCallback(
    async (intersection_id: string): Promise<PredictionResult | null> => {
      const now = new Date();
      try {
        const res = await fetch(`${BACKEND_URL}/api/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intersection_id,
            current_hour: now.getHours(),
            day_of_week: now.toLocaleDateString("en", { weekday: "long" }),
            weather: "clear",
          }),
        });
        return res.ok ? res.json() : null;
      } catch {
        return null;
      }
    },
    []
  );

  return {
    intersections,
    backendOnline,
    wsConnected,
    runCrewAnalysis,
    triggerEmergency,
    clearEmergency,
    getPrediction,
  };
}
