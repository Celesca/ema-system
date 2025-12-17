from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import asyncio
import random
import math
import json

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

# Sensor data generation based on activity type
def generate_sensor_data_for_activity(activity: int) -> dict:
    """Generate realistic sensor data based on activity type"""
    timestamp = datetime.now().isoformat()
    
    # Base patterns for different activities
    patterns = {
        0: {  # Fall - sudden spike then stillness
            "acc_x": random.uniform(-15, 15),
            "acc_y": random.uniform(-20, 5),
            "acc_z": random.uniform(-10, 15),
            "gyro_x": random.uniform(-300, 300),
            "gyro_y": random.uniform(-300, 300),
            "gyro_z": random.uniform(-200, 200),
        },
        1: {  # Jump - vertical motion
            "acc_x": random.uniform(-2, 2),
            "acc_y": random.uniform(-15, 20),
            "acc_z": random.uniform(-3, 3),
            "gyro_x": random.uniform(-50, 50),
            "gyro_y": random.uniform(-30, 30),
            "gyro_z": random.uniform(-20, 20),
        },
        2: {  # Lying down - gradual change
            "acc_x": random.uniform(-1, 1),
            "acc_y": random.uniform(-2, 0),
            "acc_z": random.uniform(8, 10),
            "gyro_x": random.uniform(-20, 20),
            "gyro_y": random.uniform(-30, 30),
            "gyro_z": random.uniform(-10, 10),
        },
        3: {  # Running - rhythmic high amplitude
            "acc_x": random.uniform(-5, 5) + 3 * math.sin(random.random() * 6.28),
            "acc_y": random.uniform(-8, 8) + 5 * math.sin(random.random() * 6.28),
            "acc_z": random.uniform(-3, 3),
            "gyro_x": random.uniform(-100, 100),
            "gyro_y": random.uniform(-80, 80),
            "gyro_z": random.uniform(-60, 60),
        },
        4: {  # Stand to sit - downward motion
            "acc_x": random.uniform(-1, 1),
            "acc_y": random.uniform(-5, 0),
            "acc_z": random.uniform(-2, 2),
            "gyro_x": random.uniform(-40, 40),
            "gyro_y": random.uniform(-20, 20),
            "gyro_z": random.uniform(-15, 15),
        },
        5: {  # Sit to stand - upward motion
            "acc_x": random.uniform(-1, 1),
            "acc_y": random.uniform(0, 5),
            "acc_z": random.uniform(-2, 2),
            "gyro_x": random.uniform(-40, 40),
            "gyro_y": random.uniform(-20, 20),
            "gyro_z": random.uniform(-15, 15),
        },
        6: {  # Walking - rhythmic moderate amplitude
            "acc_x": random.uniform(-2, 2) + 1.5 * math.sin(random.random() * 6.28),
            "acc_y": random.uniform(-3, 3) + 2 * math.sin(random.random() * 6.28),
            "acc_z": random.uniform(-1, 1),
            "gyro_x": random.uniform(-40, 40),
            "gyro_y": random.uniform(-30, 30),
            "gyro_z": random.uniform(-25, 25),
        },
    }
    
    data = patterns.get(activity, patterns[6])
    
    return {
        "timestamp": timestamp,
        "accelerometer": {
            "x": round(data["acc_x"], 3),
            "y": round(data["acc_y"], 3),
            "z": round(data["acc_z"], 3),
        },
        "gyroscope": {
            "x": round(data["gyro_x"], 3),
            "y": round(data["gyro_y"], 3),
            "z": round(data["gyro_z"], 3),
        },
        "activity": activity,
        "activity_label": ACTIVITY_LABELS[activity],
        "activity_label_en": ACTIVITY_LABELS_EN[activity],
        "severity": ACTIVITY_SEVERITY[activity],
        "confidence": round(random.uniform(0.85, 0.99), 2),
    }


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


def generate_historical_data(hours: int = 24) -> List[dict]:
    """Generate historical sensor data for charts"""
    data = []
    now = datetime.now()
    
    # Generate data points every 5 minutes
    for i in range(hours * 12):
        timestamp = now - timedelta(minutes=i * 5)
        activity = random.choices(
            [0, 1, 2, 3, 4, 5, 6],
            weights=[0.02, 0.05, 0.15, 0.08, 0.15, 0.15, 0.40]  # Walking is most common
        )[0]
        
        sensor_data = generate_sensor_data_for_activity(activity)
        sensor_data["timestamp"] = timestamp.isoformat()
        data.append(sensor_data)
    
    return list(reversed(data))


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
    activity = random.choices(
        [0, 1, 2, 3, 4, 5, 6],
        weights=[0.02, 0.05, 0.15, 0.08, 0.15, 0.15, 0.40]
    )[0]
    return generate_sensor_data_for_activity(activity)


@app.get("/api/sensor-data/history")
async def get_sensor_history(hours: int = 24):
    """Get historical sensor data"""
    return {"data": generate_historical_data(hours)}


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
    await websocket.accept()
    connected_websockets.append(websocket)
    
    try:
        while True:
            # Generate new sensor data
            activity = random.choices(
                [0, 1, 2, 3, 4, 5, 6],
                weights=[0.01, 0.03, 0.12, 0.06, 0.18, 0.18, 0.42]
            )[0]
            
            sensor_data = generate_sensor_data_for_activity(activity)
            vitals = generate_vitals()
            
            # Add to logs occasionally
            if random.random() < 0.3:  # 30% chance to log
                new_log = {
                    "id": f"log-{len(activity_logs)}",
                    "timestamp": sensor_data["timestamp"],
                    "activity": activity,
                    "activity_label": ACTIVITY_LABELS[activity],
                    "activity_label_en": ACTIVITY_LABELS_EN[activity],
                    "severity": ACTIVITY_SEVERITY[activity],
                    "confidence": sensor_data["confidence"],
                    "acknowledged": False,
                }
                activity_logs.insert(0, new_log)
                
                # Keep only last 100 logs
                if len(activity_logs) > 100:
                    activity_logs.pop()
            
            # Send data to client
            await websocket.send_json({
                "type": "update",
                "sensor_data": sensor_data,
                "vitals": vitals,
                "latest_log": activity_logs[0] if activity_logs else None,
            })
            
            # Wait before next update (simulate real-time)
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
