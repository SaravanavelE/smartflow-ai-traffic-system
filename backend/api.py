"""
SmartFlow — FastAPI Backend
Bridges the Next.js frontend to the CrewAI agent system.

Endpoints:
  POST /api/crew/analyze          — Run full crew analysis for an intersection
  POST /api/crew/emergency        — Trigger emergency agent immediately (async)
  POST /api/signals/optimize      — Get optimized signal timings
  POST /api/predict               — Get 10-15min congestion predictions
  GET  /api/health                — Health check
  GET  /api/intersections         — List all managed intersections
  WS   /ws/signals/{session_id}   — WebSocket for live signal updates
"""

import asyncio
import json
import os
import random
from datetime import datetime
from typing import Dict, List, Optional

import uvicorn
try:
    from crewai import LLM, Agent, Crew, Process, Task
    from crewai_tools import FileReadTool
except ImportError:
    pass
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── App setup ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="SmartFlow API",
    description="AI-powered traffic management backend with CrewAI agents",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9002", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Pydantic Models ────────────────────────────────────────────────────────────

class IntersectionRequest(BaseModel):
    intersection_id: str
    traffic_data_source: Optional[str] = "sensor_api"
    feedback_source: Optional[str] = "user_app"

class EmergencyRequest(BaseModel):
    intersection_id: str
    vehicle_type: str  # ambulance | fire_truck | police
    approach_direction: str  # north | south | east | west
    estimated_arrival_seconds: int
    route_id: Optional[str] = None

class SignalOptimizationRequest(BaseModel):
    intersection_id: str
    vehicle_density: Dict[str, int]  # {"north": 12, "south": 8, "east": 15, "west": 6}
    emergency_active: bool = False
    current_cycle_length: int = 120

class PredictionRequest(BaseModel):
    intersection_id: str
    current_hour: int
    day_of_week: str
    weather: Optional[str] = "clear"

class SignalTiming(BaseModel):
    direction: str
    green: int
    yellow: int
    red: int

class IntersectionState(BaseModel):
    intersection_id: str
    name: str
    lat: float
    lng: float
    congestion: str
    signal_timings: List[SignalTiming]
    emergency_override: bool = False
    last_updated: str

# ─── In-memory state (replace with Redis/DB in production) ─────────────────────

INTERSECTIONS: Dict[str, IntersectionState] = {
    "INT-001": IntersectionState(
        intersection_id="INT-001", name="Gandhipuram Junction",
        lat=11.0168, lng=76.9688, congestion="High",
        signal_timings=[
            SignalTiming(direction="north", green=45, yellow=5, red=70),
            SignalTiming(direction="south", green=35, yellow=5, red=80),
            SignalTiming(direction="east", green=20, yellow=5, red=95),
            SignalTiming(direction="west", green=20, yellow=5, red=95),
        ], last_updated=datetime.now().isoformat()
    ),
    "INT-002": IntersectionState(
        intersection_id="INT-002", name="Lakshmi Mills Junction",
        lat=11.0118, lng=76.9922, congestion="Medium",
        signal_timings=[
            SignalTiming(direction="north", green=30, yellow=5, red=85),
            SignalTiming(direction="south", green=30, yellow=5, red=85),
            SignalTiming(direction="east", green=30, yellow=5, red=85),
            SignalTiming(direction="west", green=30, yellow=5, red=85),
        ], last_updated=datetime.now().isoformat()
    ),
    "INT-003": IntersectionState(
        intersection_id="INT-003", name="Hope College Junction",
        lat=11.0264, lng=77.0108, congestion="High",
        signal_timings=[
            SignalTiming(direction="north", green=50, yellow=5, red=65),
            SignalTiming(direction="south", green=40, yellow=5, red=75),
            SignalTiming(direction="east", green=15, yellow=5, red=100),
            SignalTiming(direction="west", green=15, yellow=5, red=100),
        ], last_updated=datetime.now().isoformat()
    ),
    "INT-004": IntersectionState(
        intersection_id="INT-004", name="Ukkadam Bus Stand",
        lat=10.9925, lng=76.9602, congestion="Low",
        signal_timings=[
            SignalTiming(direction="north", green=25, yellow=5, red=90),
            SignalTiming(direction="south", green=25, yellow=5, red=90),
            SignalTiming(direction="east", green=25, yellow=5, red=90),
            SignalTiming(direction="west", green=25, yellow=5, red=90),
        ], last_updated=datetime.now().isoformat()
    ),
    "INT-005": IntersectionState(
        intersection_id="INT-005", name="RS Puram Eye Hospital Junction",
        lat=11.0084, lng=76.9535, congestion="Medium",
        signal_timings=[
            SignalTiming(direction="north", green=35, yellow=5, red=80),
            SignalTiming(direction="south", green=30, yellow=5, red=85),
            SignalTiming(direction="east", green=25, yellow=5, red=90),
            SignalTiming(direction="west", green=30, yellow=5, red=85),
        ], last_updated=datetime.now().isoformat()
    ),
}

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    def disconnect(self, session_id: str):
        self.active_connections.pop(session_id, None)

    async def broadcast(self, data: dict):
        disconnected = []
        for sid, ws in self.active_connections.items():
            try:
                await ws.send_json(data)
            except Exception:
                disconnected.append(sid)
        for sid in disconnected:
            self.disconnect(sid)

    async def send_to(self, session_id: str, data: dict):
        ws = self.active_connections.get(session_id)
        if ws:
            await ws.send_json(data)

manager = ConnectionManager()

# ─── CrewAI Agent Builder ───────────────────────────────────────────────────────

def build_llm():
    api_key = os.getenv("OPENAI_API_KEY", "")
    return LLM(model="openai/gpt-4o-mini", temperature=0.5, api_key=api_key)

def build_crew(intersection_id: str, traffic_data: str, feedback_source: str):
    llm = build_llm()
    try:
        tools = [FileReadTool()]
    except NameError:
        return None

    traffic_analyzer = Agent(
        role="Traffic Analyzer Agent",
        goal=f"Analyze real-time vehicle density at {intersection_id} and classify congestion.",
        backstory="Expert traffic analyst with deep knowledge of Coimbatore road networks.",
        tools=tools, llm=llm, allow_delegation=False, max_iter=10,
    )
    prediction_agent = Agent(
        role="Prediction Agent",
        goal=f"Predict traffic patterns 10-15 minutes ahead for {intersection_id}.",
        backstory="Data scientist specializing in Coimbatore traffic forecasting.",
        tools=tools, llm=llm, allow_delegation=False, max_iter=10,
    )
    signal_optimizer = Agent(
        role="Signal Optimization Agent",
        goal=f"Calculate optimal signal timing for {intersection_id} to minimize wait times.",
        backstory="Traffic engineer with expertise in adaptive signal control systems.",
        tools=tools, llm=llm, allow_delegation=False, max_iter=10,
    )
    emergency_agent = Agent(
        role="Emergency Agent",
        goal=f"Detect emergency vehicles near {intersection_id} and trigger green corridors.",
        backstory="Emergency response specialist who has coordinated with Coimbatore ambulance services.",
        tools=tools, llm=llm, allow_delegation=False, max_iter=5,
    )
    feedback_agent = Agent(
        role="Feedback Learning Agent",
        goal=f"Process feedback for {intersection_id} to continuously improve the system.",
        backstory="ML engineer specializing in feedback loops for smart city systems.",
        tools=tools, llm=llm, allow_delegation=False, max_iter=5,
    )

    t_analyze = Task(
        description=f"Analyze traffic at {intersection_id} from {traffic_data}. Classify congestion as Low/Medium/High.",
        expected_output='JSON: {"intersection_id": str, "congestion_level": str, "vehicle_density": dict, "average_speeds": dict}',
        agent=traffic_analyzer,
    )
    t_emergency = Task(
        description=f"Scan for emergency vehicles at {intersection_id}. Check if green corridor needed.",
        expected_output='JSON: {"emergency_detected": bool, "vehicle_type": str, "green_corridor_required": bool}',
        agent=emergency_agent,
        async_execution=True,
    )
    t_predict = Task(
        description=f"Using analysis data, predict congestion at {intersection_id} for next 10-15 minutes.",
        expected_output='JSON: {"predicted_congestion": dict, "confidence_level": float}',
        agent=prediction_agent,
        context=[t_analyze],
    )
    t_optimize = Task(
        description=f"Calculate optimal signal timing for {intersection_id} based on analysis and predictions.",
        expected_output='JSON: {"signal_timing": dict, "cycle_length": int, "emergency_override": bool, "optimization_reason": str}',
        agent=signal_optimizer,
        context=[t_analyze, t_predict, t_emergency],
    )
    t_feedback = Task(
        description=f"Analyze system performance from {feedback_source} and generate improvement insights for {intersection_id}.",
        expected_output='JSON: {"performance_metrics": dict, "learning_insights": list, "recommendations": list}',
        agent=feedback_agent,
        context=[t_optimize],
    )

    return Crew(
        agents=[traffic_analyzer, prediction_agent, signal_optimizer, emergency_agent, feedback_agent],
        tasks=[t_analyze, t_emergency, t_predict, t_optimize, t_feedback],
        process=Process.sequential,
        verbose=False,
    )

# ─── API Routes ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "SmartFlow API", "timestamp": datetime.now().isoformat()}


@app.get("/api/intersections")
def get_intersections():
    return {"intersections": [i.dict() for i in INTERSECTIONS.values()]}


@app.get("/api/intersections/{intersection_id}")
def get_intersection(intersection_id: str):
    inter = INTERSECTIONS.get(intersection_id)
    if not inter:
        raise HTTPException(status_code=404, detail=f"Intersection {intersection_id} not found")
    return inter.dict()


@app.post("/api/crew/analyze")
async def run_crew_analysis(req: IntersectionRequest):
    """Run the full 5-agent CrewAI crew for a given intersection."""
    if req.intersection_id not in INTERSECTIONS:
        raise HTTPException(status_code=404, detail="Intersection not found")

    # In production, kick off the crew asynchronously
    # For hackathon demo with OPENAI_API_KEY set, enable the real crew below:
    use_real_crew = bool(os.getenv("OPENAI_API_KEY"))

    if use_real_crew:
        try:
            crew = build_crew(req.intersection_id, req.traffic_data_source, req.feedback_source)
            result = crew.kickoff(inputs={
                "intersection_id": req.intersection_id,
                "traffic_data_source": req.traffic_data_source,
                "feedback_source": req.feedback_source,
            })
            raw_output = str(result)
        except Exception as e:
            raw_output = f"Crew error: {str(e)}"
    else:
        # Simulated output for demo when no API key
        raw_output = (
            f"[SIMULATED] Traffic Analyzer: High congestion at {req.intersection_id}. "
            "Density: N=18, S=12, E=22, W=9. Avg speed 18 km/h. "
            "Prediction Agent: Congestion will increase 15% in 10 mins. "
            "Signal Optimizer: Extended northbound green by +12s. "
            "Emergency Agent: No active emergency detected. "
            "Feedback Agent: System efficiency improved 8.2% this session."
        )

    # Update intersection state with simulated optimized timings
    inter = INTERSECTIONS[req.intersection_id]
    inter.congestion = random.choice(["Low", "Medium", "High"])
    inter.last_updated = datetime.now().isoformat()

    # Broadcast updated state to all WebSocket clients
    await manager.broadcast({
        "type": "intersection_update",
        "intersection_id": req.intersection_id,
        "data": inter.dict(),
    })

    return {
        "intersection_id": req.intersection_id,
        "crew_output": raw_output,
        "updated_state": inter.dict(),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/crew/emergency")
async def trigger_emergency(req: EmergencyRequest):
    """Immediately activate emergency green corridor for an intersection."""
    if req.intersection_id not in INTERSECTIONS:
        raise HTTPException(status_code=404, detail="Intersection not found")

    inter = INTERSECTIONS[req.intersection_id]
    inter.emergency_override = True
    inter.last_updated = datetime.now().isoformat()

    # Set all signals to max green in emergency direction, red elsewhere
    direction_map = {"north": 0, "south": 1, "east": 2, "west": 3}
    for i, timing in enumerate(inter.signal_timings):
        if timing.direction == req.approach_direction:
            timing.green = 120
            timing.yellow = 5
            timing.red = 0
        else:
            timing.green = 0
            timing.yellow = 5
            timing.red = 120

    route_id = req.route_id or f"EM-{random.randint(1000, 9999)}"

    # Broadcast emergency event
    await manager.broadcast({
        "type": "emergency_activated",
        "intersection_id": req.intersection_id,
        "vehicle_type": req.vehicle_type,
        "approach_direction": req.approach_direction,
        "route_id": route_id,
        "data": inter.dict(),
    })

    return {
        "status": "emergency_corridor_activated",
        "intersection_id": req.intersection_id,
        "route_id": route_id,
        "vehicle_type": req.vehicle_type,
        "approach_direction": req.approach_direction,
        "confirmation": (
            f"🚨 Green corridor activated at {inter.name}. "
            f"{req.vehicle_type.replace('_', ' ').title()} approaching from {req.approach_direction}. "
            f"All signals cleared for {req.estimated_arrival_seconds}s. Route ID: {route_id}"
        ),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/crew/emergency/clear")
async def clear_emergency(req: IntersectionRequest):
    """Clear emergency override and restore normal signal timing."""
    if req.intersection_id not in INTERSECTIONS:
        raise HTTPException(status_code=404, detail="Intersection not found")

    inter = INTERSECTIONS[req.intersection_id]
    inter.emergency_override = False
    inter.last_updated = datetime.now().isoformat()

    # Restore balanced timings
    for timing in inter.signal_timings:
        timing.green = 30
        timing.yellow = 5
        timing.red = 85

    await manager.broadcast({
        "type": "emergency_cleared",
        "intersection_id": req.intersection_id,
        "data": inter.dict(),
    })

    return {"status": "emergency_cleared", "intersection_id": req.intersection_id}


@app.post("/api/signals/optimize")
def optimize_signals(req: SignalOptimizationRequest):
    """Compute optimized green-phase durations from vehicle density."""
    total_density = sum(req.vehicle_density.values()) or 1
    directions = list(req.vehicle_density.keys())

    if req.emergency_active:
        # All green during emergency
        optimized = {d: {"green": 120, "yellow": 5, "red": 0} for d in directions}
        reason = "Emergency override — all signals set to green."
    else:
        # Weighted allocation: higher density = longer green
        optimized = {}
        total_green_budget = 120  # seconds per direction in the cycle
        for d in directions:
            density = req.vehicle_density.get(d, 0)
            weight = density / total_density
            green = max(10, min(60, int(weight * total_green_budget * 2)))
            yellow = 5
            red = req.current_cycle_length - green - yellow
            optimized[d] = {"green": green, "yellow": yellow, "red": max(0, red)}

        reason = (
            f"Weighted by vehicle density. Highest priority: "
            f"{max(req.vehicle_density, key=req.vehicle_density.get)} direction."
        )

    if req.intersection_id in INTERSECTIONS:
        inter = INTERSECTIONS[req.intersection_id]
        inter.signal_timings = [
            SignalTiming(direction=d, **optimized[d])
            for d in directions
            if d in optimized
        ] or inter.signal_timings
        inter.last_updated = datetime.now().isoformat()

    return {
        "intersection_id": req.intersection_id,
        "optimized_timings": optimized,
        "optimization_reason": reason,
        "cycle_length": req.current_cycle_length,
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/predict")
def predict_congestion(req: PredictionRequest):
    """Return 10-15 min traffic prediction for an intersection."""
    # Rule-based simulation (replace with ML model in production)
    peak_hours = [8, 9, 17, 18, 19]
    is_peak = req.current_hour in peak_hours
    is_weekend = req.day_of_week.lower() in ["saturday", "sunday"]

    base_congestion = "High" if is_peak and not is_weekend else "Medium" if is_peak else "Low"
    congestion_10 = base_congestion
    congestion_15 = "High" if congestion_10 == "Medium" and is_peak else congestion_10

    weather_impact = "+10% density" if req.weather in ["rain", "storm"] else "no impact"

    return {
        "intersection_id": req.intersection_id,
        "prediction_timeframe": "10-15 minutes",
        "predicted_congestion": {"10min": congestion_10, "15min": congestion_15},
        "confidence_level": 0.85 if is_peak else 0.72,
        "weather_impact": weather_impact,
        "peak_hours_active": is_peak,
        "recommendation": (
            "Consider alternate route via OMR" if congestion_15 == "High"
            else "Current route optimal"
        ),
        "timestamp": datetime.now().isoformat(),
    }


# ─── WebSocket ──────────────────────────────────────────────────────────────────

@app.websocket("/ws/signals/{session_id}")
async def websocket_signal_updates(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for live signal state updates.
    Sends full intersection updates every 5 seconds.
    Frontend can also send JSON commands: {"type": "subscribe", "intersection_id": "INT-001"}
    """
    await manager.connect(session_id, websocket)
    try:
        # Send initial state
        await websocket.send_json({
            "type": "initial_state",
            "intersections": [i.dict() for i in INTERSECTIONS.values()],
        })

        # Start background ticker
        async def tick():
            while True:
                await asyncio.sleep(5)
                # Simulate small signal timer changes
                for inter in INTERSECTIONS.values():
                    if not inter.emergency_override:
                        for timing in inter.signal_timings:
                            timing.green = max(10, min(60, timing.green + random.randint(-2, 2)))
                    inter.last_updated = datetime.now().isoformat()

                await websocket.send_json({
                    "type": "signal_tick",
                    "intersections": [i.dict() for i in INTERSECTIONS.values()],
                    "timestamp": datetime.now().isoformat(),
                })

        ticker_task = asyncio.create_task(tick())

        # Listen for client commands
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg.get("type") == "trigger_emergency":
                inter_id = msg.get("intersection_id", "INT-001")
                if inter_id in INTERSECTIONS:
                    INTERSECTIONS[inter_id].emergency_override = True
                    await manager.broadcast({
                        "type": "emergency_activated",
                        "intersection_id": inter_id,
                        "data": INTERSECTIONS[inter_id].dict(),
                    })

            elif msg.get("type") == "clear_emergency":
                inter_id = msg.get("intersection_id", "INT-001")
                if inter_id in INTERSECTIONS:
                    INTERSECTIONS[inter_id].emergency_override = False

    except WebSocketDisconnect:
        manager.disconnect(session_id)
        if "ticker_task" in dir():
            ticker_task.cancel()
    except Exception as e:
        manager.disconnect(session_id)


# ─── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
