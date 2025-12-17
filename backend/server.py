from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
import random
import json
import csv
import os
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except Exception:
    PANDAS_AVAILABLE = False

app = FastAPI(title="EMA System - Human Activity Recognition API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Activity labels (Thai)
ACTIVITY_LABELS = {
    0: "ล้ม (เป็นลม/สะดุด)",  # Fall
    1: "กระโดด",              # Jump
    2: "(ตั้งใจ) ลงไปนอนบนที่นอน",  # Intentionally lying down on bed
    3: "วิ่ง",                 # Run
    4: "จากยืน/เดินลงไปนั่ง",   # Standing/walking to sitting
    5: "จากนั่งลุกขึ้นมายืน/เดิน",  # Sitting to standing/walking
    6: "เดิน",                 # Walk
}

ACTIVITY_LABELS_EN = {
    0: "Fall (faint/trip)",
    1: "Jump",
    2: "Lying down on bed",
    3: "Running",
    4: "Stand/Walk to Sit",
    5: "Sit to Stand/Walk",
    6: "Walking",
}

# Severity levels for activities
ACTIVITY_SEVERITY = {
    0: "critical",   # Fall is critical
    1: "warning",    # Jump needs attention
    2: "normal",     # Lying down is normal
    3: "warning",    # Running might need attention
    4: "normal",     # Normal transition
    5: "normal",     # Normal transition
    6: "normal",     # Walking is normal
}

# Patient information
PATIENT_INFO = {
    "id": "P-2024-001",
    "name": "สมชาย ใจดี",
    "name_en": "Somchai Jaidee",
    "age": 72,
    "gender": "ชาย",
    "blood_type": "O+",
    "weight": 68.5,
    "height": 165,
    "room": "ICU-302",
    "doctor": "นพ. สุรชัย แพทย์ดี",
    "emergency_contact": "นางสาว สมหญิง ใจดี (ลูกสาว)",
    "emergency_phone": "081-234-5678",
    "conditions": ["ความดันโลหิตสูง", "เบาหวานชนิดที่ 2", "โรคหัวใจ"],
    "conditions_en": ["Hypertension", "Type 2 Diabetes", "Heart Disease"],
    "medications": ["Metformin 500mg", "Amlodipine 5mg", "Aspirin 81mg"],
    "admission_date": "2024-12-10",
    "notes": "ผู้ป่วยต้องการการดูแลอย่างใกล้ชิด มีประวัติหกล้มบ่อย"
}

# Store for activity logs
activity_logs: List[dict] = []
connected_websockets: List[WebSocket] = []

# Load scenario CSV files from backend/data
SCENARIOS = {}
CURRENT_SCENARIO = None
CURRENT_SCENARIO_INDEX = 0
SCENARIO_PLAYING = False
LAST_ACTIVITY = None

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")

def load_scenarios_from_folder(folder: str = None):
    global SCENARIOS
    SCENARIOS = {}
    if folder is None:
        folder = DATA_DIR
    print(f"Loading scenarios from: {folder}")
    if not os.path.isdir(folder):
        print(f"ERROR: Data folder not found: {folder}")
        return
    for fname in os.listdir(folder):
        if not fname.lower().endswith('.csv'):
            continue
        full = os.path.join(folder, fname)
        name = os.path.splitext(fname)[0]
        rows = []
        try:
            # Prefer pandas for robust CSV parsing when available
            if PANDAS_AVAILABLE:
                df = pd.read_csv(full)
                rows = df.fillna('').to_dict(orient='records')
            else:
                with open(full, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        rows.append(r)
            # store by base name and also with normalized key variants
            SCENARIOS[name] = rows
            print(f"  Loaded scenario '{name}' with {len(rows)} rows")
        except Exception as e:
            print(f"Failed to load scenario {fname}: {e}")


def find_scenario_key(sid: str) -> Optional[str]:
    """Find the best matching scenario key for a given id or path."""
    if not sid:
        return None
    # direct match
    if sid in SCENARIOS:
        return sid
    # basename match (remove path and extension)
    b = os.path.splitext(os.path.basename(sid))[0]
    if b in SCENARIOS:
        return b
    # lower-case match
    low = sid.lower()
    for k in SCENARIOS.keys():
        if k.lower() == low:
            return k
    # substring match
    for k in SCENARIOS.keys():
        if low in k.lower() or k.lower() in low:
            return k
    return None

# load at startup
load_scenarios_from_folder()
print(f"Available scenarios: {list(SCENARIOS.keys())}")

# Sensor data now comes only from CSV scenarios. The old random generator was removed.


def generate_vitals() -> dict:
    """Generate vital signs data"""
    return {
        "heart_rate": random.randint(65, 95),
        "heart_rate_status": "normal" if 60 <= random.randint(65, 95) <= 100 else "warning",
        "battery": max(10, min(100, 75 + random.randint(-5, 5))),
        "battery_status": "normal",
        "signal_strength": random.randint(70, 100),
        "device_status": "connected",
        "last_sync": datetime.now().isoformat(),
    }


def generate_historical_data_from_scenario(scenario_id: str) -> List[dict]:
    """Return mapped historical data from a loaded CSV scenario"""
    rows = SCENARIOS.get(scenario_id, [])
    mapped = []
    for row in rows:
        def fval(key, default=0.0):
            v = row.get(key, '')
            try:
                return float(v)
            except:
                return default
        action = (row.get('Action') or row.get('Action ') or '').strip().lower()
        if 'fall' in action:
            activity = 0
        elif 'jump' in action:
            activity = 1
        elif 'lie' in action or 'sleep' in action:
            activity = 2
        elif 'run' in action:
            activity = 3
        elif 'sit' in action and 'stand' not in action:
            activity = 4
        elif 'sit' in action and 'stand' in action:
            activity = 5
        elif 'walk' in action:
            activity = 6
        else:
            activity = 6

        mapped.append({
            "timestamp": row.get('Timestamp') or datetime.now().isoformat(),
            "accelerometer": {"x": round(fval('acc_x'),3), "y": round(fval('acc_y'),3), "z": round(fval('acc_z'),3)},
            "gyroscope": {"x": round(fval('gyro_x'),3), "y": round(fval('gyro_y'),3), "z": round(fval('gyro_z'),3)},
            "activity": activity,
            "activity_label": ACTIVITY_LABELS[activity],
            "activity_label_en": ACTIVITY_LABELS_EN[activity],
            "severity": ACTIVITY_SEVERITY[activity],
            "confidence": round(random.uniform(0.85,0.99),2),
            "battery": fval('Battery Level',0),
            "temperature": fval('Temperature',0),
            "step": int(fval('Step',0)),
            "calorie": fval('Calorie',0),
            "sleep_state": row.get('Sleep State') or row.get('Sleep',''),
            "device": row.get('Device') or '',
            "action": (row.get('Action') or row.get('Action ') or '').strip(),
        })
    return mapped


# Generate initial logs
def generate_initial_logs(count: int = 20) -> List[dict]:
    """Generate initial activity logs"""
    logs = []
    now = datetime.now()
    
    for i in range(count):
        timestamp = now - timedelta(minutes=random.randint(1, 480))
        activity = random.choices(
            [0, 1, 2, 3, 4, 5, 6],
            weights=[0.05, 0.08, 0.15, 0.10, 0.15, 0.15, 0.32]
        )[0]
        
        logs.append({
            "id": f"log-{i}",
            "timestamp": timestamp.isoformat(),
            "activity": activity,
            "activity_label": ACTIVITY_LABELS[activity],
            "activity_label_en": ACTIVITY_LABELS_EN[activity],
            "severity": ACTIVITY_SEVERITY[activity],
            "confidence": round(random.uniform(0.85, 0.99), 2),
            "acknowledged": random.choice([True, False]) if activity != 0 else False,
        })
    
    return sorted(logs, key=lambda x: x["timestamp"], reverse=True)

# Initialize logs
activity_logs = generate_initial_logs()


# Models
class SensorData(BaseModel):
    timestamp: str
    accelerometer: dict
    gyroscope: dict
    activity: int
    activity_label: str
    activity_label_en: str
    severity: str
    confidence: float


class VitalsData(BaseModel):
    heart_rate: int
    heart_rate_status: str
    battery: int
    battery_status: str
    signal_strength: int
    device_status: str
    last_sync: str


# API Endpoints
@app.get("/")
async def root():
    return {"message": "EMA System - Human Activity Recognition API", "version": "1.0.0"}


@app.get("/api/patient")
async def get_patient_info():
    """Get patient information"""
    return PATIENT_INFO


@app.get("/api/activities")
async def get_activities():
    """Get all activity labels"""
    return {
        "activities": [
            {"id": k, "label": v, "label_en": ACTIVITY_LABELS_EN[k], "severity": ACTIVITY_SEVERITY[k]}
            for k, v in ACTIVITY_LABELS.items()
        ]
    }


@app.get("/api/vitals")
async def get_vitals():
    """Get current vital signs"""
    return generate_vitals()


@app.get("/api/sensor-data")
async def get_sensor_data():
    """Get current sensor data"""
    # If a scenario is playing, return the current row mapped to sensor_data
    if SCENARIO_PLAYING and CURRENT_SCENARIO in SCENARIOS:
        rows = SCENARIOS[CURRENT_SCENARIO]
        if rows:
            idx = max(0, (CURRENT_SCENARIO_INDEX - 1) % len(rows))
            row = rows[idx]
            def fval(key, default=0.0):
                v = row.get(key, '')
                try:
                    return float(v)
                except:
                    return default

            action = (row.get('Action') or row.get('Action ') or '').strip().lower()
            if 'fall' in action:
                activity = 0
            elif 'jump' in action:
                activity = 1
            elif 'lie' in action or 'sleep' in action:
                activity = 2
            elif 'run' in action:
                activity = 3
            elif 'sit' in action and 'stand' not in action:
                activity = 4
            elif 'sit' in action and 'stand' in action:
                activity = 5
            elif 'walk' in action:
                activity = 6
            else:
                activity = 6

            sensor_data = {
                "timestamp": row.get('Timestamp') or datetime.now().isoformat(),
                "accelerometer": {"x": round(fval('acc_x'),3), "y": round(fval('acc_y'),3), "z": round(fval('acc_z'),3)},
                "gyroscope": {"x": round(fval('gyro_x'),3), "y": round(fval('gyro_y'),3), "z": round(fval('gyro_z'),3)},
                "activity": activity,
                "activity_label": ACTIVITY_LABELS[activity],
                "activity_label_en": ACTIVITY_LABELS_EN[activity],
                "severity": ACTIVITY_SEVERITY[activity],
                "confidence": round(random.uniform(0.85, 0.99), 2),
                "battery": fval('Battery Level', 0),
                "temperature": fval('Temperature', 0),
                "step": int(fval('Step', 0)),
                "calorie": fval('Calorie', 0),
                "sleep_state": row.get('Sleep State') or row.get('Sleep', ''),
                "device": row.get('Device') or '',
                "action": (row.get('Action') or row.get('Action ') or '').strip(),
            }
            return {"sensor_data": sensor_data}

    return {"sensor_data": None, "message": "no scenario playing"}


@app.get('/api/scenarios')
async def list_scenarios():
    """List available CSV scenarios"""
    # return only unique base keys to avoid duplicates from normalization
    seen = set()
    scenarios_list = []
    for k, v in SCENARIOS.items():
        base = os.path.splitext(os.path.basename(k))[0]
        if base in seen:
            continue
        seen.add(base)
        scenarios_list.append({"id": base, "rows": len(v)})
    return {"scenarios": scenarios_list}


@app.post('/api/scenarios/reload')
async def reload_scenarios():
    """Reload scenarios from disk"""
    load_scenarios_from_folder()
    return {"success": True, "count": len(SCENARIOS)}


@app.post('/api/scenarios/{scenario_id}/start')
async def start_scenario(scenario_id: str):
    """Start playing a scenario (affects websocket streams)"""
    global CURRENT_SCENARIO, CURRENT_SCENARIO_INDEX, SCENARIO_PLAYING, LAST_ACTIVITY
    print(f"Attempting to start scenario: '{scenario_id}'")
    print(f"Available scenarios: {list(SCENARIOS.keys())}")
    key = find_scenario_key(scenario_id)
    print(f"Matched key: {key}")
    if not key:
        return {"success": False, "message": "scenario not found", "available": list(SCENARIOS.keys())}
    CURRENT_SCENARIO = key
    CURRENT_SCENARIO_INDEX = 0
    # reset last activity so first row of new scenario is logged
    LAST_ACTIVITY = None
    SCENARIO_PLAYING = True
    return {"success": True, "scenario": CURRENT_SCENARIO, "rows": len(SCENARIOS[key])}


@app.post('/api/scenarios/stop')
async def stop_scenario():
    """Stop scenario playback"""
    global CURRENT_SCENARIO, SCENARIO_PLAYING, LAST_ACTIVITY
    CURRENT_SCENARIO = None
    SCENARIO_PLAYING = False
    LAST_ACTIVITY = None
    return {"success": True}


@app.get("/api/sensor-data/history")
async def get_sensor_history(hours: int = 24, scenario_id: Optional[str] = None):
    """Get historical sensor data; if scenario_id provided return that scenario mapping"""
    sid = scenario_id or CURRENT_SCENARIO
    if sid and sid in SCENARIOS:
        return {"data": generate_historical_data_from_scenario(sid)}
    return {"data": []}


@app.get("/api/logs")
async def get_activity_logs(limit: int = 50):
    """Get activity logs"""
    return {"logs": activity_logs[:limit]}


@app.post("/api/logs/{log_id}/acknowledge")
async def acknowledge_log(log_id: str):
    """Acknowledge an activity log"""
    for log in activity_logs:
        if log["id"] == log_id:
            log["acknowledged"] = True
            return {"success": True, "log": log}
    return {"success": False, "message": "Log not found"}


@app.get("/api/stats")
async def get_stats():
    """Get activity statistics"""
    activity_counts = {i: 0 for i in range(7)}
    for log in activity_logs:
        activity_counts[log["activity"]] += 1
    
    return {
        "total_activities": len(activity_logs),
        "activity_breakdown": [
            {
                "activity": i,
                "label": ACTIVITY_LABELS[i],
                "label_en": ACTIVITY_LABELS_EN[i],
                "count": count,
                "percentage": round(count / len(activity_logs) * 100, 1) if activity_logs else 0
            }
            for i, count in activity_counts.items()
        ],
        "critical_events": sum(1 for log in activity_logs if log["severity"] == "critical"),
        "warnings": sum(1 for log in activity_logs if log["severity"] == "warning"),
    }


# WebSocket for real-time updates
@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    global CURRENT_SCENARIO_INDEX, LAST_ACTIVITY
    await websocket.accept()
    connected_websockets.append(websocket)
    
    try:
        while True:
            # Generate new sensor data
            # If a scenario is playing use its preloaded CSV data
            if SCENARIO_PLAYING and CURRENT_SCENARIO in SCENARIOS:
                rows = SCENARIOS[CURRENT_SCENARIO]
                if rows:
                    row = rows[CURRENT_SCENARIO_INDEX % len(rows)]
                    CURRENT_SCENARIO_INDEX += 1

                    # Map CSV row to sensor_data structure
                    def fval(key, default=0.0):
                        v = row.get(key, '')
                        try:
                            return float(v)
                        except:
                            return default

                    # Map action string to activity id
                    action = (row.get('Action') or row.get('Action ' ) or '').strip().lower()
                    if 'fall' in action or 'falling' in action or 'fall' == action:
                        activity = 0
                    elif 'jump' in action:
                        activity = 1
                    elif 'lie' in action or 'sleep' in action:
                        activity = 2
                    elif 'run' in action or 'running' in action:
                        activity = 3
                    elif 'sit' in action and 'stand' not in action:
                        activity = 4
                    elif 'sit' in action and 'stand' in action:
                        activity = 5
                    elif 'walk' in action:
                        activity = 6
                    else:
                        activity = 6

                    sensor_data = {
                        "timestamp": row.get('Timestamp') or datetime.now().isoformat(),
                        "accelerometer": {
                            "x": round(fval('acc_x'), 3),
                            "y": round(fval('acc_y'), 3),
                            "z": round(fval('acc_z'), 3),
                        },
                        "gyroscope": {
                            "x": round(fval('gyro_x'), 3),
                            "y": round(fval('gyro_y'), 3),
                            "z": round(fval('gyro_z'), 3),
                        },
                        "activity": activity,
                        "activity_label": ACTIVITY_LABELS[activity],
                        "activity_label_en": ACTIVITY_LABELS_EN[activity],
                        "severity": ACTIVITY_SEVERITY[activity],
                        "confidence": round(random.uniform(0.85, 0.99), 2),
                        # additional fields from CSV
                        "battery": fval('Battery Level', 0),
                        "temperature": fval('Temperature', 0),
                        "step": int(fval('Step', 0)),
                        "calorie": fval('Calorie', 0),
                        "sleep_state": row.get('Sleep State') or row.get('Sleep', ''),
                        "device": row.get('Device') or '',
                    }

                    vitals = {
                        "heart_rate": random.randint(60, 95) if activity in (6,3) else random.randint(55,85),
                        "heart_rate_status": "normal",
                        "battery": int(round(sensor_data.get('battery', 75))),
                        "battery_status": "normal",
                        "signal_strength": random.randint(70, 100),
                        "device_status": "connected",
                        "last_sync": datetime.now().isoformat(),
                    }

                    # Add to logs when activity changes or critical events occur
                    raw_action = (row.get('Action') or row.get('Action ') or '').strip()
                    should_log = False
                    if LAST_ACTIVITY is None:
                        should_log = True
                    elif activity != LAST_ACTIVITY:
                        should_log = True
                    # always log critical events (falls)
                    if activity == 0:
                        should_log = True

                    if should_log:
                        new_log = {
                            "id": f"log-{len(activity_logs)}",
                            "timestamp": sensor_data["timestamp"],
                            "activity": activity,
                            "activity_label": ACTIVITY_LABELS[activity],
                            "activity_label_en": ACTIVITY_LABELS_EN[activity],
                            "severity": ACTIVITY_SEVERITY[activity],
                            "confidence": sensor_data["confidence"],
                            "acknowledged": False,
                            # include additional fields from CSV
                            "action": raw_action,
                            "temperature": sensor_data.get('temperature'),
                            "step": sensor_data.get('step'),
                            "calorie": sensor_data.get('calorie'),
                            "device": sensor_data.get('device'),
                        }
                        activity_logs.insert(0, new_log)
                        # trim logs to reasonable size
                        if len(activity_logs) > 200:
                            activity_logs.pop()
                        LAST_ACTIVITY = activity

                    await websocket.send_json({
                        "type": "update",
                        "sensor_data": { **sensor_data, "action": raw_action },
                        "vitals": vitals,
                        "latest_log": activity_logs[0] if activity_logs else None,
                    })
                    await asyncio.sleep(1)
                    continue

            # No scenario playing: send vitals heartbeat and no sensor data
            vitals = generate_vitals()
            await websocket.send_json({
                "type": "update",
                "sensor_data": None,
                "vitals": vitals,
                "latest_log": activity_logs[0] if activity_logs else None,
            })
            await asyncio.sleep(1)
            
    except WebSocketDisconnect:
        connected_websockets.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in connected_websockets:
            connected_websockets.remove(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
