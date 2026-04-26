"use client";

/**
 * RealTimeMap — 100% FREE stack
 *
 * Map tiles  : OpenStreetMap  (free, no key)
 * Routing    : OpenRouteService (free, 2000 req/day — key in .env.local)
 * Geocoding  : Nominatim       (free, no key, rate-limit: 1 req/s)
 * Library    : Leaflet 1.9     (loaded via CDN script tag)
 *
 * NO Google Maps. NO billing. NO credit card.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Minimize2, Layers, Navigation, Siren, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trafficOptimizationInsights, TrafficOptimizationOutput } from "@/ai/flows/traffic-optimization-flow";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LatLng { lat: number; lng: number }

interface TrafficSignal {
  id: string;
  position: LatLng;
  status: "GREEN" | "YELLOW" | "RED";
  timeLeft: number;
  name: string;
}

interface RealTimeMapProps {
  isNavigating: boolean;
  isEmergencyMode: boolean;
  destination: string;
  onInsightsUpdate: (insights: TrafficOptimizationOutput) => void;
  onSignalsUpdate?: (signals: TrafficSignal[]) => void;
  currentCoords: LatLng | null;
  routePath?: LatLng[];
}

// ─── OpenRouteService helper (free — 2000 req/day) ────────────────────────────

const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || "";

async function getRoute(from: LatLng, to: LatLng): Promise<LatLng[]> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
    );
    if (!res.ok) throw new Error("OSRM error");
    const data = await res.json();
    const coords: [number, number][] = data.routes[0].geometry.coordinates;
    const mapped = coords.map(([lng, lat]) => ({ lat, lng }));
    if (mapped.length < 2) throw new Error("Path too short");
    return mapped;
  } catch {
    // Fallback: straight line with small intermediate steps
    const steps = 8;
    const path: LatLng[] = [];
    for (let i = 0; i <= steps; i++) {

      path.push({
        lat: from.lat + ((to.lat - from.lat) * i) / steps,
        lng: from.lng + ((to.lng - from.lng) * i) / steps,
      });
    }
    return path;
  }
}

// ─── Nominatim geocoder (free) ────────────────────────────────────────────────

async function geocode(query: string): Promise<LatLng | null> {
  try {
    const encoded = encodeURIComponent(query);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      { headers: { "Accept-Language": "en,ta,hi,*", "User-Agent": "SmartFlowAgent/1.0" } }
    );
    const data = await res.json();
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// ─── Signal helpers ────────────────────────────────────────────────────────────

function generateSignals(path: LatLng[], emergency: boolean): TrafficSignal[] {
  if (path.length < 4) return [];
  const signals: TrafficSignal[] = [];
  const step = Math.max(1, Math.floor(path.length / 6));
  for (let i = step; i < path.length - 1; i += step) {
    const statuses: ("GREEN" | "YELLOW" | "RED")[] = ["GREEN", "YELLOW", "RED"];
    const status: "GREEN" | "YELLOW" | "RED" = emergency
      ? "GREEN"
      : statuses[Math.floor(Math.random() * 3)];
    signals.push({
      id: `sig-${i}`,
      position: path[i],
      status,
      timeLeft: status === "GREEN" ? 15 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 30),
      name: `Signal ${signals.length + 1}`,
    });
  }
  return signals;
}

const SIGNAL_COLORS = { GREEN: "#22c55e", YELLOW: "#eab308", RED: "#ef4444" };

const STATIC_ADMIN_SIGNALS = [
  { id: "INT-001", name: "Gandhipuram Junction", lat: 11.0168, lng: 76.9688 },
  { id: "INT-002", name: "Lakshmi Mills Junction", lat: 11.0118, lng: 76.9922 },
  { id: "INT-003", name: "Hope College Junction", lat: 11.0264, lng: 77.0108 },
  { id: "INT-004", name: "Ukkadam Bus Stand", lat: 10.9925, lng: 76.9602 },
  { id: "INT-005", name: "RS Puram Junction", lat: 11.0084, lng: 76.9535 },
];

// ─── Component ────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    L: any; // Leaflet global
  }
}

export function RealTimeMap({
  isNavigating,
  isEmergencyMode,
  destination,
  onInsightsUpdate,
  onSignalsUpdate,
  currentCoords,
}: RealTimeMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const userMarker = useRef<any>(null);
  const routeLayer = useRef<any>(null);
  const signalMarkers = useRef<any[]>([]);
  const adminMarkers = useRef<any[]>([]);
  const destMarker = useRef<any>(null);

  const [mapReady, setMapReady] = useState(false);
  const [tileMode, setTileMode] = useState<"streets" | "satellite">("streets");
  const tileLayer = useRef<any>(null);
  const [signals, setSignals] = useState<TrafficSignal[]>([]);
  const [routingInfo, setRoutingInfo] = useState<{ dist: string; time: string } | null>(null);

  // ── Load Leaflet from CDN ──────────────────────────────────────────────────
  useEffect(() => {
    if (window.L) { initMap(); return; }

    // Load CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = initMap;
    document.head.appendChild(script);
  }, []);

  function initMap() {
    if (!mapRef.current || leafletMap.current) return;
    const L = window.L;

    const center = currentCoords || { lat: 10.9289, lng: 76.9845 };
    const map = L.map(mapRef.current, {
      center: [center.lat, center.lng],
      zoom: 14,
      zoomControl: false,
    });

    // OSM tile layer
    tileLayer.current = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }
    ).addTo(map);

    leafletMap.current = map;
    setMapReady(true);
  }

  // ── User location marker ───────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !currentCoords || !window.L) return;
    const L = window.L;

    const icon = L.divIcon({
      className: "",
      html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 12px rgba(59,130,246,0.7);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (userMarker.current) {
      userMarker.current.setLatLng([currentCoords.lat, currentCoords.lng]);
      leafletMap.current.setView([currentCoords.lat, currentCoords.lng], 14);
    } else {
      userMarker.current = L.marker([currentCoords.lat, currentCoords.lng], { icon })
        .addTo(leafletMap.current)
        .bindPopup("📍 Your location");
      leafletMap.current.setView([currentCoords.lat, currentCoords.lng], 14);
    }
  }, [currentCoords, mapReady]);

  // ── Tile layer toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !window.L) return;
    const L = window.L;

    if (tileLayer.current) leafletMap.current.removeLayer(tileLayer.current);

    const urls: Record<string, string> = {
      streets: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    };
    const attribs: Record<string, string> = {
      streets: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
      satellite: "© Esri — Esri, i-cubed, USDA, USGS, AEX",
    };

    tileLayer.current = L.tileLayer(urls[tileMode], {
      attribution: attribs[tileMode],
      maxZoom: 19,
    }).addTo(leafletMap.current);
  }, [tileMode, mapReady]);

  // ── Draw signal markers ───────────────────────────────────────────────────
  const drawSignals = useCallback((sigs: TrafficSignal[]) => {
    if (!mapReady || !window.L) return;
    const L = window.L;

    signalMarkers.current.forEach((m) => leafletMap.current.removeLayer(m));
    signalMarkers.current = [];

    sigs.forEach((sig) => {
      const color = SIGNAL_COLORS[sig.status];
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width:18px;height:18px;border-radius:50%;
            background:${color};border:2px solid white;
            box-shadow:0 0 8px ${color};
            display:flex;align-items:center;justify-content:center;
          "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const marker = L.marker([sig.position.lat, sig.position.lng], { icon })
        .addTo(leafletMap.current)
        .bindPopup(`
          <div style="font-family:sans-serif;font-size:13px;padding:4px 2px;">
            <strong style="color:${color}">${sig.status}</strong><br/>
            ${sig.name}<br/>
            <span style="color:#888;font-size:11px">${sig.timeLeft}s remaining</span>
          </div>
        `);
      signalMarkers.current.push(marker);
    });
  }, [mapReady]);

  // ── Admin Signal Points: show only when not navigating ─────────────────────
  useEffect(() => {
    if (!mapReady || isNavigating || !window.L || !leafletMap.current) {
      adminMarkers.current.forEach((m) => leafletMap.current?.removeLayer(m));
      adminMarkers.current = [];
      return;
    }
    const L = window.L;

    adminMarkers.current.forEach((m) => leafletMap.current.removeLayer(m));
    adminMarkers.current = [];

    STATIC_ADMIN_SIGNALS.forEach((s) => {
      const icon = L.divIcon({
        className: "",
        html: `<div style="width:24px;height:24px;background:#f59e0b;border:2px solid white;border-radius:50%;box-shadow:0 0 10px rgba(245,158,11,0.6);display:flex;align-items:center;justify-content:center;font-size:12px;">🚥</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const marker = L.marker([s.lat, s.lng], { icon })
        .addTo(leafletMap.current)
        .bindPopup(`<strong>${s.name}</strong><br/><span style="font-size:10px;color:#666;">Click to view live stream</span>`);

      marker.on('click', () => {
        window.dispatchEvent(new CustomEvent('admin_select_stream', { detail: s.id }));
      });

      adminMarkers.current.push(marker);
    });

    return () => {
      adminMarkers.current.forEach((m) => leafletMap.current?.removeLayer(m));
      adminMarkers.current = [];
    };
  }, [mapReady, isNavigating]);

  // ── Navigate: geocode destination, get route, draw ────────────────────────
  useEffect(() => {
    if (!mapReady || !isNavigating || !currentCoords || !destination) return;
    if (!window.L) return;
    const L = window.L;

    (async () => {
      // Remove old route + dest marker
      if (routeLayer.current) leafletMap.current.removeLayer(routeLayer.current);
      if (destMarker.current) leafletMap.current.removeLayer(destMarker.current);

      // Geocode destination
      const destCoords = await geocode(destination);
      if (!destCoords) return;

      // Place destination marker
      const destIcon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;border-radius:50%;background:#f97316;border:3px solid white;box-shadow:0 0 12px rgba(249,115,22,0.7);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      destMarker.current = L.marker([destCoords.lat, destCoords.lng], { icon: destIcon })
        .addTo(leafletMap.current)
        .bindPopup(`🏁 ${destination}`);

      // Get route
      const path = await getRoute(currentCoords, destCoords);
      if (path.length < 2) return;

      // Draw route polyline
      const routeColor = isEmergencyMode ? "#ef4444" : "#3b82f6";
      routeLayer.current = L.polyline(
        path.map((p) => [p.lat, p.lng]),
        { color: routeColor, weight: 6, opacity: 0.85, lineJoin: "round" }
      ).addTo(leafletMap.current);

      // Fit bounds
      leafletMap.current.fitBounds(routeLayer.current.getBounds(), { padding: [40, 40] });

      // Calculate distance and time
      let distKm = 0;
      for (let i = 1; i < path.length; i++) {
        distKm += haversine(path[i - 1], path[i]);
      }
      const timeMin = Math.round((distKm / 30) * 60); // assume 30 km/h avg
      let timeStr = timeMin + " min";
      if (timeMin >= 60) {
        timeStr = `${Math.floor(timeMin / 60)} hrs ${timeMin % 60} min`;
      }
      setRoutingInfo({ dist: distKm.toFixed(1) + " km", time: timeStr });

      // Generate signals
      const sigs = generateSignals(path, isEmergencyMode);
      setSignals(sigs);
      drawSignals(sigs);

      // AI insights
      try {
        const insights = await trafficOptimizationInsights({
          currentLocation: { latitude: currentCoords.lat, longitude: currentCoords.lng },
          destinationLocation: { latitude: destCoords.lat, longitude: destCoords.lng },
          currentRoutePolyline: "ors_route",
          simulatedTrafficConditions: isEmergencyMode ? "Emergency Corridor Active" : "Live OpenStreetMap Traffic",
          simulatedSignalTiming: sigs.map((s) => `${s.name}: ${s.status} ${s.timeLeft}s`).join(", "),
        });
        onInsightsUpdate(insights);
      } catch { /* Genkit unavailable — no-op */ }
    })();
  }, [isNavigating, destination, currentCoords, mapReady, isEmergencyMode, drawSignals, onInsightsUpdate, onSignalsUpdate]);

  // ── Clear route when navigation stops ────────────────────────────────────
  useEffect(() => {
    if (isNavigating) return;
    if (routeLayer.current && leafletMap.current) {
      leafletMap.current.removeLayer(routeLayer.current);
      routeLayer.current = null;
    }
    if (destMarker.current && leafletMap.current) {
      leafletMap.current.removeLayer(destMarker.current);
      destMarker.current = null;
    }
    signalMarkers.current.forEach((m) => leafletMap.current?.removeLayer(m));
    signalMarkers.current = [];
    setSignals([]);
    setRoutingInfo(null);
  }, [isNavigating]);

  // ── Emergency: all signals → GREEN, redraw route red ─────────────────────
  useEffect(() => {
    if (!isNavigating) return;
    setSignals((prev) => {
      const updated = prev.map((s) =>
        isEmergencyMode ? { ...s, status: "GREEN" as const, timeLeft: 99 } : s
      );
      drawSignals(updated);

      // Update route color
      if (routeLayer.current) {
        routeLayer.current.setStyle({ color: isEmergencyMode ? "#ef4444" : "#3b82f6" });
      }
      return updated;
    });
  }, [isEmergencyMode, isNavigating, drawSignals]);

  // ── Signal countdown timer ────────────────────────────────────────────────
  useEffect(() => {
    if (!isNavigating || signals.length === 0) return;
    const iv = setInterval(() => {
      setSignals((prev) => {
        const updated = prev.map((s) => {
          if (isEmergencyMode) return { ...s, status: "GREEN" as const, timeLeft: 99 };
          const t = s.timeLeft - 1;
          if (t <= 0) {
            const next: "GREEN" | "YELLOW" | "RED" =
              s.status === "GREEN" ? "YELLOW" : s.status === "YELLOW" ? "RED" : "GREEN";
            return { ...s, status: next, timeLeft: next === "GREEN" ? 20 : next === "YELLOW" ? 5 : 30 };
          }
          return { ...s, timeLeft: t };
        });
        drawSignals(updated);
        return updated;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [isNavigating, signals.length, isEmergencyMode, drawSignals]);

  // ── Notify Parent of Signal Changes safely ────────────────────────────────
  useEffect(() => {
    onSignalsUpdate?.(signals);
  }, [signals, onSignalsUpdate]);

  return (
    <div className="relative w-full h-full">
      {/* Leaflet map container */}
      <div ref={mapRef} className="w-full h-full" style={{ background: "#1e293b" }} />

      {/* Emergency banner */}
      {isEmergencyMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="flex items-center gap-2 bg-red-500/95 backdrop-blur text-white px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse">
            <Siren className="h-4 w-4" />
            <span className="text-xs font-black uppercase tracking-widest">
              🚨 Emergency Green Corridor Active
            </span>
          </div>
        </div>
      )}

      {/* Route info pill */}
      {routingInfo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="flex items-center gap-3 bg-background/90 backdrop-blur border border-border rounded-full px-4 py-2 shadow-xl text-sm font-bold text-white">
            <span className="text-accent">{routingInfo.dist}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-accent">{routingInfo.time}</span>
          </div>
        </div>
      )}

      {/* Signal count badge */}
      {isNavigating && signals.length > 0 && (
        <div className="absolute top-4 right-16 z-[1000] bg-background/90 backdrop-blur border border-border rounded-xl px-3 py-2 text-xs font-bold shadow-xl">
          <span className="text-green-400">{signals.filter((s) => s.status === "GREEN").length} 🟢</span>
          {" · "}
          <span className="text-yellow-400">{signals.filter((s) => s.status === "YELLOW").length} 🟡</span>
          {" · "}
          <span className="text-red-400">{signals.filter((s) => s.status === "RED").length} 🔴</span>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-4 bottom-32 z-[1000] flex flex-col gap-2">
        <div className="flex flex-col bg-background/90 backdrop-blur border border-border rounded-xl overflow-hidden shadow-2xl">
          <Button
            variant="ghost" size="icon"
            onClick={() => leafletMap.current?.zoomIn()}
            className="h-11 w-11 text-white hover:bg-accent/10 rounded-none"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <div className="h-px bg-border mx-2" />
          <Button
            variant="ghost" size="icon"
            onClick={() => leafletMap.current?.zoomOut()}
            className="h-11 w-11 text-white hover:bg-accent/10 rounded-none"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Re-center button */}
      {currentCoords && (
        <div className="absolute right-4 bottom-56 z-[1000]">
          <Button
            variant="ghost" size="icon"
            onClick={() => leafletMap.current?.setView([currentCoords.lat, currentCoords.lng], 15)}
            className="h-11 w-11 bg-background/90 backdrop-blur border border-border text-white hover:bg-accent/10 rounded-xl shadow-2xl"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tile toggle */}
      <div className="absolute left-4 bottom-4 z-[1000]">
        <div className="flex bg-background/90 backdrop-blur border border-border rounded-xl p-1 shadow-2xl">
          <Button
            variant={tileMode === "streets" ? "default" : "ghost"} size="sm"
            onClick={() => setTileMode("streets")}
            className="h-9 px-3 text-xs font-bold gap-1.5 rounded-lg"
          >
            <Navigation className="h-3.5 w-3.5" /> Map
          </Button>
          <Button
            variant={tileMode === "satellite" ? "default" : "ghost"} size="sm"
            onClick={() => setTileMode("satellite")}
            className="h-9 px-3 text-xs font-bold gap-1.5 rounded-lg"
          >
            <Layers className="h-3.5 w-3.5" /> Satellite
          </Button>
        </div>
      </div>

      {/* OSM attribution override (minimal) */}
      <style>{`
        .leaflet-control-attribution { font-size: 9px !important; opacity: 0.5; }
        .leaflet-control-zoom { display: none; }
        .leaflet-popup-content-wrapper { background: #1e293b !important; color: #f1f5f9 !important; border: 1px solid #334155 !important; border-radius: 12px !important; box-shadow: 0 4px 24px rgba(0,0,0,0.4) !important; }
        .leaflet-popup-tip { background: #1e293b !important; }
        .leaflet-popup-close-button { color: #94a3b8 !important; }
        .leaflet-container { font-family: Inter, sans-serif; }
      `}</style>
    </div>
  );
}

// ─── Haversine distance (km) ──────────────────────────────────────────────────

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
