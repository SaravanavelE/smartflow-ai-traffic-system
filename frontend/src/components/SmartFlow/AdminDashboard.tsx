"use client";

import React, { useState, useEffect } from "react";
import {
  Activity, Brain, AlertTriangle, Users, Zap, RefreshCw,
  BarChart3, TrafficCone, Shield, Cpu, WifiOff, Siren
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { IntersectionState } from "@/hooks/use-backend-api";
import { MOCK_USERS_DB } from "@/context/AuthContext";



interface AgentStatus {
  name: string; status: "running"|"idle"|"processing"|"alert";
  lastOutput: string; confidence: number;
  icon: React.ReactNode; color: string;
}
interface AdminDashboardProps {
  intersections?: IntersectionState[];
  backendOnline?: boolean;
  onRunCrew?: (id: string) => Promise<any>;
  onTriggerEmergency?: (id: string) => Promise<any>;
  onClearEmergency?: (id: string) => void;
  onSelectStream?: (id: string) => void;
}
const STATUS_STYLE = {
  running:"bg-green-500/20 text-green-400 border-green-500/30",
  idle:"bg-gray-500/20 text-gray-400 border-gray-500/30",
  processing:"bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  alert:"bg-red-500/20 text-red-400 border-red-500/30",
};
const CONGESTION_COLOR:{[k:string]:string} = {Low:"text-green-400",Medium:"text-yellow-400",High:"text-red-400"};
const STATIC_INTERSECTIONS: IntersectionState[] = [
  {intersection_id:"INT-001",name:"Anna Salai × Mount Road",  lat:13.0569,lng:80.2425,congestion:"High",  signal_timings:[{direction:"north",green:45,yellow:5,red:70},{direction:"south",green:35,yellow:5,red:80},{direction:"east",green:20,yellow:5,red:95},{direction:"west",green:20,yellow:5,red:95}],emergency_override:false,last_updated:new Date().toISOString()},
  {intersection_id:"INT-002",name:"OMR × Perungudi",          lat:12.9716,lng:80.2444,congestion:"Medium",signal_timings:[{direction:"north",green:30,yellow:5,red:85},{direction:"south",green:30,yellow:5,red:85},{direction:"east",green:30,yellow:5,red:85},{direction:"west",green:30,yellow:5,red:85}],emergency_override:false,last_updated:new Date().toISOString()},
  {intersection_id:"INT-003",name:"T-Nagar × Panagal Park",  lat:13.0418,lng:80.2341,congestion:"High",  signal_timings:[{direction:"north",green:50,yellow:5,red:65},{direction:"south",green:40,yellow:5,red:75},{direction:"east",green:15,yellow:5,red:100},{direction:"west",green:15,yellow:5,red:100}],emergency_override:false,last_updated:new Date().toISOString()},
  {intersection_id:"INT-004",name:"ECR × Thiruvanmiyur",     lat:12.9830,lng:80.2590,congestion:"Low",   signal_timings:[{direction:"north",green:25,yellow:5,red:90},{direction:"south",green:25,yellow:5,red:90},{direction:"east",green:25,yellow:5,red:90},{direction:"west",green:25,yellow:5,red:90}],emergency_override:false,last_updated:new Date().toISOString()},
  {intersection_id:"INT-005",name:"GST Road × Tambaram",     lat:12.9249,lng:80.1000,congestion:"Medium",signal_timings:[{direction:"north",green:35,yellow:5,red:80},{direction:"south",green:30,yellow:5,red:85},{direction:"east",green:25,yellow:5,red:90},{direction:"west",green:30,yellow:5,red:85}],emergency_override:false,last_updated:new Date().toISOString()},
];
function makeAgents(): AgentStatus[] {
  return [
    {name:"Traffic Analyzer", status:"running",    lastOutput:"High congestion on Anna Salai. 3 lanes at capacity.",               confidence:94,icon:<Activity className="h-4 w-4"/>,  color:"text-blue-400"},
    {name:"Prediction Agent", status:"processing", lastOutput:"Expecting 20% density increase near T-Nagar at 18:30.",             confidence:87,icon:<Brain className="h-4 w-4"/>,     color:"text-purple-400"},
    {name:"Signal Optimizer", status:"running",    lastOutput:"Extended green phase northbound Anna Salai by +15s.",               confidence:91,icon:<Zap className="h-4 w-4"/>,        color:"text-yellow-400"},
    {name:"Emergency Agent",  status:"idle",       lastOutput:"No active emergency vehicles detected. Monitoring 12 junctions.",   confidence:99,icon:<Shield className="h-4 w-4"/>,    color:"text-red-400"},
    {name:"Feedback Learner", status:"idle",       lastOutput:"Absorbed 12 feedback points. Model accuracy improved +2.3%.",       confidence:78,icon:<RefreshCw className="h-4 w-4"/>,  color:"text-green-400"},
  ];
}
export function AdminDashboard({intersections:backendIntersections,backendOnline=false,onRunCrew,onTriggerEmergency,onClearEmergency,onSelectStream}:AdminDashboardProps) {
  const [agents,setAgents]=useState<AgentStatus[]>(makeAgents());
  const [runningCrew,setRunningCrew]=useState(false);
  const [crewLog,setCrewLog]=useState<string[]>([]);
  const [activeId,setActiveId]=useState("INT-001");
  const [localIntersections, setLocalIntersections] = useState<IntersectionState[]>(STATIC_INTERSECTIONS);

  useEffect(() => {
    // Initialize random vehicles count
    setLocalIntersections(STATIC_INTERSECTIONS.map(inter => ({
      ...inter,
      signal_timings: inter.signal_timings.map(t => ({
        ...t,
        vehicles: Math.floor(Math.random() * 80) + 5
      }))
    })));
  }, []);

  const displayIntersections = backendIntersections?.length ? backendIntersections : localIntersections;

  useEffect(()=>{
    const iv=setInterval(()=>setAgents(prev=>prev.map(a=>({...a,confidence:Math.min(100,Math.max(60,a.confidence+(Math.random()*4-2))),status:Math.random()>0.85?(["running","processing","idle"] as const)[Math.floor(Math.random()*3)]:a.status}))),3500);
    return()=>clearInterval(iv);
  },[]);

  const handleOptimizeSignal = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLocalIntersections(prev => prev.map(inter => {
      if (inter.intersection_id !== id) return inter;
      // @ts-ignore
      const maxDir = inter.signal_timings.reduce((a,b) => (a.vehicles||0) > (b.vehicles||0) ? a : b).direction;
      return {
        ...inter,
        signal_timings: inter.signal_timings.map(t => 
          t.direction === maxDir ? { ...t, green: 30 } : t
        )
      };
    }));
  };

  const handleRunCrew=async()=>{
    setRunningCrew(true);setCrewLog([]);
    const steps=["🔍 Traffic Analyzer: Fetching sensor data from 12 intersections...","🚨 Emergency Agent: Scanning for priority vehicles (async)...","📊 Congestion Level HIGH detected at "+activeId,"🔮 Prediction Agent: Running 10-min forecast...","🔮 Expected 18% congestion increase at peak hour","⚡ Signal Optimizer: Calculating adaptive timings...","⚡ Northbound green extended by +12s","⚡ Cycle red phase reduced by -8s","📈 Feedback Agent: Logging performance metrics...","✅ Crew complete. System efficiency +9.4%"];
    if(backendOnline&&onRunCrew){const r=await onRunCrew(activeId);if(r?.crew_output){setCrewLog(r.crew_output.split(". ").map((s:string)=>"▶ "+s.trim()));setRunningCrew(false);return;}}
    for(const s of steps){await new Promise(r=>setTimeout(r,550));setCrewLog(prev=>[...prev,s]);}
    setRunningCrew(false);
  };

  const allUsers = Object.values(MOCK_USERS_DB);
  const normalUsers = allUsers.filter(u => u.role === "user");
  const emergencyUsers = allUsers.filter(u => u.role === "emergency");

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div><h2 className="text-sm font-black">Admin Control Center</h2><p className="text-[10px] text-muted-foreground">CrewAI Agents + Signal Management</p></div>
        <div className="flex items-center gap-2">
          {!backendOnline&&<div className="flex items-center gap-1 text-[9px] text-yellow-400 font-bold"><WifiOff className="h-2.5 w-2.5"/>DEMO</div>}
          <Button size="sm" onClick={handleRunCrew} disabled={runningCrew} className="gap-1.5 font-bold text-xs bg-primary/90 h-8">
            <Cpu className={cn("h-3.5 w-3.5",runningCrew&&"animate-spin")}/>{runningCrew?"Running...":"Run Crew"}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[{l:"Intersections",v:"12",i:<TrafficCone className="h-3.5 w-3.5"/>,c:"text-blue-400"},{l:"Optimizations",v:"247",i:<Zap className="h-3.5 w-3.5"/>,c:"text-yellow-400"},{l:"Alerts Today",v:"3",i:<AlertTriangle className="h-3.5 w-3.5"/>,c:"text-red-400"},{l:"Active Users",v:"1,842",i:<Users className="h-3.5 w-3.5"/>,c:"text-green-400"}].map(s=>(
          <Card key={s.l} className="bg-background/80 border-border"><CardContent className="p-2.5 flex items-center gap-2">
            <div className={cn("p-1.5 rounded-lg bg-secondary/50 shrink-0",s.c)}>{s.i}</div>
            <div><p className="text-lg font-black text-white leading-none">{s.v}</p><p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">{s.l}</p></div>
          </CardContent></Card>
        ))}
      </div>
      <Card className="bg-background/80 border-border">
        <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs font-bold flex items-center gap-1.5"><Brain className="h-3.5 w-3.5 text-purple-400"/>CrewAI Agents</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 flex flex-col gap-2">
          {agents.map(a=>(
            <div key={a.name} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-secondary/30 border border-border">
              <div className={cn("mt-0.5 shrink-0",a.color)}>{a.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-xs font-bold text-white">{a.name}</span>
                  <Badge className={cn("text-[8px] h-3.5 border px-1",STATUS_STYLE[a.status])}>{a.status.toUpperCase()}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mb-1 leading-snug line-clamp-2">{a.lastOutput}</p>
                <div className="flex items-center gap-1.5">
                  <Progress value={a.confidence} className="h-1 flex-1"/>
                  <span className="text-[9px] text-muted-foreground font-mono shrink-0">{a.confidence.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
      {crewLog.length>0&&(
        <Card className="bg-background/80 border-border">
          <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs font-bold flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-green-400"/>Execution Log</CardTitle></CardHeader>
          <CardContent className="px-3 pb-3">
            <div className="bg-black/40 rounded-xl p-3 font-mono text-[10px] text-green-300 flex flex-col gap-0.5 max-h-36 overflow-y-auto">
              {crewLog.map((l,i)=><div key={i} className="animate-in fade-in duration-200 leading-relaxed">{l}</div>)}
              {runningCrew&&<div className="text-green-500 animate-pulse">▋</div>}
            </div>
          </CardContent>
        </Card>
      )}
      <Card className="bg-background/80 border-border">
        <CardHeader className="pb-1 pt-3 px-3"><CardTitle className="text-xs font-bold flex items-center gap-1.5"><TrafficCone className="h-3.5 w-3.5 text-orange-400"/>Signal Intersections & Action Cameras</CardTitle></CardHeader>
        <CardContent className="px-3 pb-3 flex flex-col gap-2">
          {displayIntersections.map(inter=>(
            <div key={inter.intersection_id} onClick={()=>{
                setActiveId(inter.intersection_id);
                if(onSelectStream) onSelectStream(inter.intersection_id);
              }}
              className={cn("p-2.5 rounded-xl border cursor-pointer transition-all",
                inter.emergency_override?"bg-red-500/10 border-red-500/30":
                activeId===inter.intersection_id?"bg-primary/10 border-primary/30":
                "bg-secondary/30 border-border hover:border-border/80")}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-white truncate block">{inter.name} <Badge variant="outline" className="text-[8px] bg-black/40 ml-1">LIVE CAM</Badge></span>
                  <span className="text-[9px] text-muted-foreground font-mono">{inter.intersection_id}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={cn("text-[10px] font-bold",CONGESTION_COLOR[inter.congestion]||"text-muted-foreground")}>{inter.congestion}</span>
                  <Button size="sm" variant="outline" className="h-5 text-[9px] px-1.5 font-bold text-green-400 border-green-500/30"
                    onClick={(e)=>handleOptimizeSignal(e, inter.intersection_id)}>
                    Auto Sync 30s
                  </Button>
                  {onTriggerEmergency&&onClearEmergency&&(
                    <Button size="sm" variant={inter.emergency_override?"destructive":"outline"} className="h-5 text-[9px] px-1.5 font-bold"
                      onClick={e=>{e.stopPropagation();inter.emergency_override?onClearEmergency(inter.intersection_id):onTriggerEmergency(inter.intersection_id);}}>
                      {inter.emergency_override?"🚨":"Override"}
                    </Button>
                  )}
                </div>
              </div>
              {inter.signal_timings.length>0&&(
                <div className="grid grid-cols-4 gap-1">
                  {inter.signal_timings.map(t=>(
                    <div key={t.direction} className="text-center bg-black/20 rounded-lg p-1">
                      <div className="text-[9px] text-muted-foreground uppercase flex justify-between px-1">
                        <span>{t.direction[0]}</span>
                        {/* @ts-ignore */}
                        {t.vehicles !== undefined && <span className="text-[8px] tracking-wide text-blue-300 font-bold">{t.vehicles} veh</span>}
                      </div>
                      <div className={cn("text-[11px] font-bold",inter.emergency_override?"text-green-400":"text-accent")}>
                        {inter.emergency_override?"99":t.green}s
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card className="bg-background/80 border-border">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-bold flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-blue-400"/>Active Directory</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <Accordion type="single" collapsible className="w-full flex flex-col gap-1">
            <AccordionItem value="users" className="border-border">
              <AccordionTrigger className="text-xs font-bold py-2 hover:no-underline">
                <div className="flex items-center gap-2"><Users className="h-3.5 w-3.5 text-blue-400"/> Normal Users ({normalUsers.length})</div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-2 pt-1 pb-2">
                  {normalUsers.map((usr: any, i: number)=>(
                    <div key={i} className="flex flex-col gap-1 p-2.5 rounded-xl bg-secondary/30 border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white leading-none">{usr.name}</span>
                        <Badge className="text-[8px] h-3.5 border px-1 bg-green-500/10 text-green-400 border-green-500/30">USER</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        {usr.license && <span className="text-[9px] text-muted-foreground font-mono bg-black/40 px-1.5 py-0.5 rounded">DL: {usr.license}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="emergency" className="border-none">
              <AccordionTrigger className="text-xs font-bold py-2 hover:no-underline">
                <div className="flex items-center gap-2"><Siren className="h-3.5 w-3.5 text-red-400"/> Emergency Responders ({emergencyUsers.length})</div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-col gap-2 pt-1 pb-2">
                  {emergencyUsers.map((usr: any, i: number)=>(
                    <div key={i} className="flex flex-col gap-1 p-2.5 rounded-xl bg-red-500/5 border border-red-500/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white leading-none">{usr.name}</span>
                        <Badge className="text-[8px] h-3.5 border px-1 bg-red-500/10 text-red-400 border-red-500/30">EMERGENCY</Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {usr.license && <span className="text-[9px] text-muted-foreground font-mono bg-black/40 px-1.5 py-0.5 rounded">DL: {usr.license}</span>}
                        {usr.vehicle && <span className="text-[9px] text-muted-foreground font-mono bg-black/40 px-1.5 py-0.5 rounded">VEH: {usr.vehicle}</span>}
                        {usr.hospital && <span className="text-[9px] text-accent font-mono bg-black/40 px-1.5 py-0.5 rounded">HOSP: {usr.hospital}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
