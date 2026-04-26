"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Search, MapPin, Navigation2, X, Clock, ArrowRight, Loader2, LocateFixed, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface NavSidebarProps {
  onStart: (dest: string) => void;
  onStop: () => void;
  isNavigating: boolean;
  startLocation: string;
  endLocation: string;
  onSetStart?: (loc: string, coords: { lat: number, lng: number }) => void;
}

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

const RECENT_DESTINATIONS = [
  "Gandhipuram, Coimbatore",
  "Lakshmi Mills, Coimbatore",
  "Hope College, Coimbatore",
  "Ukkadam, Coimbatore",
  "RS Puram, Coimbatore",
  "Brookefields Mall, Coimbatore",
  "Prozone Mall, Coimbatore",
];

export function NavSidebar({
  onStart, onStop, isNavigating, startLocation, endLocation, onSetStart
}: NavSidebarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [startSearch, setStartSearch] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [startSuggestions, setStartSuggestions] = useState<{ name: string, lat: number, lng: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStart, setLoadingStart] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setStartSearch(startLocation);
  }, [startLocation]);

  const fetchSuggestions = useCallback(async (query: string, isStart: boolean) => {
    if (query.length < 3) {
      if (isStart) setStartSuggestions([]); else setSuggestions([]);
      return;
    }
    if (isStart) setLoadingStart(true); else setLoading(true);
    try {
      const encoded = encodeURIComponent(query);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=6&addressdetails=0`,
        { headers: { "Accept-Language": "en,ta,hi,*", "User-Agent": "SmartFlowAgent/1.0" } }
      );
      const data: NominatimResult[] = await res.json();

      if (isStart) {
        setStartSuggestions(data.map(r => ({
          name: r.display_name.split(", ").slice(0, 4).join(", "),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon)
        })));
      } else {
        setSuggestions(data.map((r) => r.display_name.split(", ").slice(0, 4).join(", ")));
      }
    } catch {
      if (!isStart) {
        setSuggestions(RECENT_DESTINATIONS.filter((d) => d.toLowerCase().includes(query.toLowerCase())));
      }
    } finally {
      if (isStart) setLoadingStart(false); else setLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(value, false), 600);
  };

  const handleStartInputChange = (value: string) => {
    setStartSearch(value);
    if (startDebounceRef.current) clearTimeout(startDebounceRef.current);
    if (!value.trim()) { setStartSuggestions([]); return; }
    startDebounceRef.current = setTimeout(() => fetchSuggestions(value, true), 600);
  };

  const handleSelect = (dest: string) => {
    setSuggestions([]);
    setSearchValue("");
    onStart(dest);
  };

  const handleStartSelect = (item: { name: string, lat: number, lng: number }) => {
    setStartSuggestions([]);
    setStartSearch(item.name);
    onSetStart?.(item.name, { lat: item.lat, lng: item.lng });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) handleSelect(searchValue.trim());
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {!isNavigating ? (
        <>
          <div className="relative">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Starting From
            </h3>
            <div className="relative group">
              <LocateFixed className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="My Location"
                value={startSearch}
                onChange={(e) => handleStartInputChange(e.target.value)}
                className="pl-10 pr-10 h-11 bg-secondary border-transparent focus:border-accent/50 text-sm font-bold truncate"
                autoComplete="off"
              />
              {loadingStart && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
            </div>
            {startSuggestions.length > 0 && (
              <div className="absolute top-14 left-0 right-0 z-50 mt-1 bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
                {startSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleStartSelect(s)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left"
                  >
                    <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm font-medium leading-snug">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Destination
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors pointer-events-none" />
                <Input
                  placeholder="Search destination..."
                  className="pl-10 pr-10 h-12 bg-secondary border-transparent focus:border-accent/50 focus:ring-accent/20 transition-all text-sm font-medium"
                  value={searchValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  autoComplete="off"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
              </div>
            </form>
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSelect(s)} className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-secondary transition-colors text-left group/item">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground group-hover/item:text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-white/80 group-hover/item:text-white line-clamp-2 leading-snug">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-accent" /> AI Recommended Routes
            </h3>

            <button
              onClick={() => handleSelect(RECENT_DESTINATIONS[0])}
              className="group relative overflow-hidden rounded-xl border border-accent/30 bg-accent/5 hover:bg-accent/10 transition-all p-3 text-left"
            >
              <div className="absolute top-0 right-0 p-2 opacity-20"><MapPin className="h-12 w-12 text-accent" /></div>
              <p className="text-[10px] font-bold text-accent mb-0.5 tracking-wider uppercase">Smart Commute</p>
              <p className="text-sm font-bold text-white relative z-10">{RECENT_DESTINATIONS[0]}</p>
              <p className="text-[10px] text-white/60 relative z-10 mt-1 line-clamp-1">Avoids 3 congested zones using AI signal sync</p>
            </button>

            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mt-2">
              <Clock className="h-3 w-3" /> Popular Destinations
            </h3>
            <div className="flex flex-col gap-1.5">
              {RECENT_DESTINATIONS.slice(1).map((dest) => (
                <button
                  key={dest}
                  onClick={() => handleSelect(dest)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-colors text-left group"
                >
                  <span className="text-sm font-medium text-white/80 group-hover:text-white truncate">{dest}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-left duration-300">
          <div className="p-4 rounded-2xl bg-primary text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-1 right-1">
              <Button variant="ghost" size="icon" onClick={onStop} className="h-8 w-8 text-white hover:bg-white/20"><X className="h-5 w-5" /></Button>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Navigation2 className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 pr-8">
                <p className="text-xs font-medium text-white/70 uppercase tracking-widest">Navigating to</p>
                <h3 className="text-base font-bold mt-0.5 line-clamp-2 leading-snug">{endLocation}</h3>
              </div>
            </div>
            <div className="mt-4 flex justify-between items-end">
              <div>
                <p className="text-2xl font-black leading-none">— <span className="text-sm font-normal text-white/70">min</span></p>
                <p className="text-xs font-medium text-white/70 mt-1">Calculating ETA...</p>
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-transparent text-[10px]">FASTEST ROUTE</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Route Info</h3>
            <div className="flex flex-col gap-3 pl-2">
              <div className="flex gap-4 relative">
                <div className="w-0.5 bg-accent absolute top-5 bottom-0 left-[7px]" />
                <div className="w-4 h-4 rounded-full border-2 border-accent bg-background z-10 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-accent uppercase">Route active</p>
                  <p className="text-sm font-medium text-white mt-0.5">Follow the highlighted path on the map</p>
                </div>
              </div>
              <div className="flex gap-4 opacity-50">
                <div className="w-4 h-4 rounded-full border-2 border-border bg-background z-10 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Destination</p>
                  <p className="text-sm font-medium text-white mt-0.5 line-clamp-2">{endLocation}</p>
                </div>
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={onStop} className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 font-bold">
            <X className="h-4 w-4 mr-2" /> End Navigation
          </Button>
        </div>
      )}
    </div>
  );
}
