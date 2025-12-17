// Sensor data types
export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

export interface GyroscopeData {
  x: number;
  y: number;
  z: number;
}

export interface SensorData {
  timestamp: string;
  accelerometer: AccelerometerData;
  gyroscope: GyroscopeData;
  activity: number;
  activity_label: string;
  activity_label_en: string;
  severity: 'normal' | 'warning' | 'critical';
  confidence: number;
  // optional CSV fields
  battery?: number;
  temperature?: number;
  step?: number;
  calorie?: number;
  sleep_state?: string;
  device?: string;
}

// Vitals types
export interface VitalsData {
  heart_rate: number;
  heart_rate_status: 'normal' | 'warning' | 'critical';
  battery: number;
  battery_status: 'normal' | 'warning' | 'critical';
  signal_strength: number;
  device_status: 'connected' | 'disconnected';
  last_sync: string;
}

// Activity types
export interface Activity {
  id: number;
  label: string;
  label_en: string;
  severity: 'normal' | 'warning' | 'critical';
}

// Log types
export interface ActivityLog {
  id: string;
  timestamp: string;
  activity: number;
  activity_label: string;
  activity_label_en: string;
  severity: 'normal' | 'warning' | 'critical';
  confidence: number;
  acknowledged: boolean;
}

// Patient types
export interface PatientInfo {
  id: string;
  name: string;
  name_en: string;
  age: number;
  gender: string;
  blood_type: string;
  weight: number;
  height: number;
  room: string;
  doctor: string;
  emergency_contact: string;
  emergency_phone: string;
  conditions: string[];
  conditions_en: string[];
  medications: string[];
  admission_date: string;
  notes: string;
}

// Stats types
export interface ActivityStat {
  activity: number;
  label: string;
  label_en: string;
  count: number;
  percentage: number;
}

export interface Stats {
  total_activities: number;
  activity_breakdown: ActivityStat[];
  critical_events: number;
  warnings: number;
}

// WebSocket message type
export interface WebSocketMessage {
  type: 'update';
  sensor_data: SensorData;
  vitals: VitalsData;
  latest_log: ActivityLog | null;
}
