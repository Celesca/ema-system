import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ActivityCard,
  SensorChart,
  VitalsCard,
  LogsPanel,
  PatientInfoModal,
  StatsCard,
} from './components';
import type {
  SensorData,
  VitalsData,
  ActivityLog,
  PatientInfo,
  Stats,
} from './types';
import './App.css';

// Mock data generator for simulation when backend is not available
const ACTIVITY_LABELS: Record<number, { th: string; en: string; severity: string }> = {
  0: { th: 'ล้ม (เป็นลม/สะดุด)', en: 'Fall (faint/trip)', severity: 'critical' },
  1: { th: 'กระโดด', en: 'Jump', severity: 'warning' },
  2: { th: '(ตั้งใจ) ลงไปนอนบนที่นอน', en: 'Lying down on bed', severity: 'normal' },
  3: { th: 'วิ่ง', en: 'Running', severity: 'warning' },
  4: { th: 'จากยืน/เดินลงไปนั่ง', en: 'Stand/Walk to Sit', severity: 'normal' },
  5: { th: 'จากนั่งลุกขึ้นมายืน/เดิน', en: 'Sit to Stand/Walk', severity: 'normal' },
  6: { th: 'เดิน', en: 'Walking', severity: 'normal' },
};

function generateMockSensorData(): SensorData {
  const activityWeights = [0.02, 0.05, 0.12, 0.08, 0.18, 0.18, 0.37];
  const random = Math.random();
  let cumulative = 0;
  let activity = 6;
  
  for (let i = 0; i < activityWeights.length; i++) {
    cumulative += activityWeights[i];
    if (random < cumulative) {
      activity = i;
      break;
    }
  }

  const patterns: Record<number, { acc: number[]; gyro: number[] }> = {
    0: { acc: [15, 20, 15], gyro: [300, 300, 200] },
    1: { acc: [2, 20, 3], gyro: [50, 30, 20] },
    2: { acc: [1, 2, 10], gyro: [20, 30, 10] },
    3: { acc: [8, 12, 5], gyro: [100, 80, 60] },
    4: { acc: [2, 5, 3], gyro: [40, 20, 15] },
    5: { acc: [2, 5, 3], gyro: [40, 20, 15] },
    6: { acc: [4, 5, 2], gyro: [40, 30, 25] },
  };

  const p = patterns[activity];
  
  return {
    timestamp: new Date().toISOString(),
    accelerometer: {
      x: (Math.random() - 0.5) * 2 * p.acc[0],
      y: (Math.random() - 0.5) * 2 * p.acc[1],
      z: (Math.random() - 0.5) * 2 * p.acc[2],
    },
    gyroscope: {
      x: (Math.random() - 0.5) * 2 * p.gyro[0],
      y: (Math.random() - 0.5) * 2 * p.gyro[1],
      z: (Math.random() - 0.5) * 2 * p.gyro[2],
    },
    activity,
    activity_label: ACTIVITY_LABELS[activity].th,
    activity_label_en: ACTIVITY_LABELS[activity].en,
    severity: ACTIVITY_LABELS[activity].severity as 'normal' | 'warning' | 'critical',
    confidence: 0.85 + Math.random() * 0.14,
  };
}

function generateMockVitals(): VitalsData {
  return {
    heart_rate: 65 + Math.floor(Math.random() * 30),
    heart_rate_status: 'normal',
    battery: 70 + Math.floor(Math.random() * 20),
    battery_status: 'normal',
    signal_strength: 70 + Math.floor(Math.random() * 30),
    device_status: 'connected',
    last_sync: new Date().toISOString(),
  };
}

function generateMockPatient(): PatientInfo {
  return {
    id: 'P-2024-001',
    name: 'สมชาย ใจดี',
    name_en: 'Somchai Jaidee',
    age: 72,
    gender: 'ชาย',
    blood_type: 'O+',
    weight: 68.5,
    height: 165,
    room: 'ICU-302',
    doctor: 'นพ. สุรชัย แพทย์ดี',
    emergency_contact: 'นางสาว สมหญิง ใจดี (ลูกสาว)',
    emergency_phone: '081-234-5678',
    conditions: ['ความดันโลหิตสูง', 'เบาหวานชนิดที่ 2', 'โรคหัวใจ'],
    conditions_en: ['Hypertension', 'Type 2 Diabetes', 'Heart Disease'],
    medications: ['Metformin 500mg', 'Amlodipine 5mg', 'Aspirin 81mg'],
    admission_date: '2024-12-10',
    notes: 'ผู้ป่วยต้องการการดูแลอย่างใกล้ชิด มีประวัติหกล้มบ่อย',
  };
}

function generateInitialLogs(): ActivityLog[] {
  const logs: ActivityLog[] = [];
  const now = new Date();
  
  for (let i = 0; i < 15; i++) {
    const activity = Math.floor(Math.random() * 7);
    logs.push({
      id: `log-${i}`,
      timestamp: new Date(now.getTime() - i * 5 * 60000).toISOString(),
      activity,
      activity_label: ACTIVITY_LABELS[activity].th,
      activity_label_en: ACTIVITY_LABELS[activity].en,
      severity: ACTIVITY_LABELS[activity].severity as 'normal' | 'warning' | 'critical',
      confidence: 0.85 + Math.random() * 0.14,
      acknowledged: activity !== 0 ? Math.random() > 0.5 : false,
    });
  }
  
  return logs;
}

// Pre-generate initial data to avoid calling setState synchronously inside effects
const INITIAL_LOGS: ActivityLog[] = generateInitialLogs();
const INITIAL_HISTORY: SensorData[] = (() => {
  const h: SensorData[] = [];
  for (let i = 0; i < 50; i++) h.push(generateMockSensorData());
  return h;
})();
const INITIAL_VITALS: VitalsData = generateMockVitals();
const INITIAL_PATIENT: PatientInfo = generateMockPatient();

// Pure statistics calculator usable outside the component
function computeStats(currentLogs: ActivityLog[]): Stats {
  const activityCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  currentLogs.forEach((log) => {
    activityCounts[log.activity]++;
  });

  return {
    total_activities: currentLogs.length,
    activity_breakdown: Object.entries(activityCounts).map(([activity, count]) => ({
      activity: parseInt(activity),
      label: ACTIVITY_LABELS[parseInt(activity)].th,
      label_en: ACTIVITY_LABELS[parseInt(activity)].en,
      count,
      percentage: currentLogs.length > 0 ? Math.round((count / currentLogs.length) * 100) : 0,
    })),
    critical_events: currentLogs.filter((l) => l.severity === 'critical').length,
    warnings: currentLogs.filter((l) => l.severity === 'warning').length,
  };
}

function App() {
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>(INITIAL_HISTORY);
  const [vitals, setVitals] = useState<VitalsData | null>(INITIAL_VITALS);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [patient, ] = useState<PatientInfo | null>(INITIAL_PATIENT);
  const [stats, setStats] = useState<Stats | null>(() => computeStats(INITIAL_LOGS));
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [useSimulation, setUseSimulation] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const logIdCounter = useRef(100);

  // Wrap the pure stats function so we can pass it around as before
  const calculateStats = useCallback((currentLogs: ActivityLog[]): Stats => computeStats(currentLogs), []);

  // initial state is set via module-level constants to avoid synchronous setState in effect

  // Try to connect to WebSocket
  useEffect(() => {
    if (!useSimulation) {
      try {
        const ws = new WebSocket('ws://localhost:8000/ws/realtime');
        
        ws.onopen = () => {
          setIsConnected(true);
          console.log('Connected to WebSocket');
        };

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'update') {
            setSensorData(data.sensor_data);
            setVitals(data.vitals);
            setSensorHistory(prev => [...prev.slice(-49), data.sensor_data]);
            
            if (data.latest_log) {
              setLogs(prev => {
                const exists = prev.find(l => l.id === data.latest_log.id);
                if (!exists) {
                  const newLogs = [data.latest_log, ...prev.slice(0, 49)];
                  setStats(calculateStats(newLogs));
                  return newLogs;
                }
                return prev;
              });
            }
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log('WebSocket disconnected');
        };

        ws.onerror = () => {
          setIsConnected(false);
          setUseSimulation(true);
        };

        wsRef.current = ws;

        return () => {
          ws.close();
        };
      } catch {
        // Defer state update to avoid synchronous setState inside effect
        setTimeout(() => setUseSimulation(true), 0);
      }
    }
  }, [useSimulation, calculateStats]);

  // Simulation mode
  useEffect(() => {
    if (useSimulation) {
      const interval = setInterval(() => {
        const newData = generateMockSensorData();
        setSensorData(newData);
        setVitals(generateMockVitals());
        setSensorHistory(prev => [...prev.slice(-49), newData]);

        // Add new log occasionally
        if (Math.random() < 0.25) {
          const newLog: ActivityLog = {
            id: `log-${logIdCounter.current++}`,
            timestamp: newData.timestamp,
            activity: newData.activity,
            activity_label: newData.activity_label,
            activity_label_en: newData.activity_label_en,
            severity: newData.severity,
            confidence: newData.confidence,
            acknowledged: false,
          };
          
          setLogs(prev => {
            const newLogs = [newLog, ...prev.slice(0, 49)];
            setStats(calculateStats(newLogs));
            return newLogs;
          });
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [useSimulation, calculateStats]);

  // Acknowledge log
  const handleAcknowledge = useCallback((logId: string) => {
    setLogs(prev => 
      prev.map(log => 
        log.id === logId ? { ...log, acknowledged: true } : log
      )
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl md:text-2xl shadow-lg">
                🏥
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-gray-800">
                  EMA System
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Human Activity Recognition & Anomaly Detection
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 md:gap-4">
              {/* Connection Status */}
              <div className={`flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full text-xs font-medium ${
                isConnected || useSimulation 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isConnected || useSimulation ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></span>
                <span className="hidden sm:inline">
                  {useSimulation ? 'Simulating' : isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>

              {/* Patient Info Button */}
              <button
                onClick={() => setIsPatientModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-md"
              >
                <span>👤</span>
                <span className="hidden sm:inline">Patient Info</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        {/* Alert Banner for Critical Events */}
        {sensorData?.severity === 'critical' && (
          <div className="mb-4 bg-red-500 text-white px-4 py-3 rounded-xl flex items-center gap-3 animate-pulse shadow-lg">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="font-bold">CRITICAL ALERT: Fall Detected!</p>
              <p className="text-sm opacity-90">Immediate attention required - {new Date(sensorData.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left Column - Activity & Vitals */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Activity Card */}
            <ActivityCard sensorData={sensorData} />

            {/* Sensor Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SensorChart data={sensorHistory} type="accelerometer" />
              <SensorChart data={sensorHistory} type="gyroscope" />
            </div>

            {/* Stats */}
            <StatsCard stats={stats} />
          </div>

          {/* Right Column - Vitals & Logs */}
          <div className="space-y-4 md:space-y-6">
            <VitalsCard vitals={vitals} />
            <LogsPanel logs={logs} onAcknowledge={handleAcknowledge} />
          </div>
        </div>
      </main>

      {/* Patient Info Modal */}
      <PatientInfoModal
        patient={patient}
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
      />

      {/* Footer */}
      <footer className="mt-8 py-4 text-center text-xs text-gray-400">
        <p>EMA System - Human Activity Recognition © 2024</p>
        <p className="mt-1">
          {useSimulation ? '🔄 Running in simulation mode' : '🔌 Connected to backend server'}
        </p>
      </footer>
    </div>
  );
}

export default App;
