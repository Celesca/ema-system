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

// Activity labels for display
const ACTIVITY_LABELS: Record<number, { th: string; en: string; severity: string }> = {
  0: { th: 'ล้ม (เป็นลม/สะดุด)', en: 'Fall (faint/trip)', severity: 'critical' },
  1: { th: 'กระโดด', en: 'Jump', severity: 'warning' },
  2: { th: '(ตั้งใจ) ลงไปนอนบนที่นอน', en: 'Lying down on bed', severity: 'normal' },
  3: { th: 'วิ่ง', en: 'Running', severity: 'warning' },
  4: { th: 'จากยืน/เดินลงไปนั่ง', en: 'Stand/Walk to Sit', severity: 'normal' },
  5: { th: 'จากนั่งลุกขึ้นมายืน/เดิน', en: 'Sit to Stand/Walk', severity: 'normal' },
  6: { th: 'เดิน', en: 'Walking', severity: 'normal' },
};

// Empty initial state - data comes from backend scenarios only
const INITIAL_LOGS: ActivityLog[] = [];
const INITIAL_HISTORY: SensorData[] = [];
const INITIAL_VITALS: VitalsData = {
  heart_rate: 0,
  heart_rate_status: 'normal',
  battery: 0,
  battery_status: 'normal',
  signal_strength: 0,
  device_status: 'disconnected',
  last_sync: new Date().toISOString(),
};
const INITIAL_PATIENT: PatientInfo = {
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

// Pure statistics calculator usable outside the component
function computeStats(currentLogs: ActivityLog[]): Stats {
  const activityCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const actionCounts: Record<string, number> = {};
  currentLogs.forEach((log) => {
    activityCounts[log.activity]++;
    const act = (log.action || 'unknown').toString();
    actionCounts[act] = (actionCounts[act] || 0) + 1;
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
    action_breakdown: Object.entries(actionCounts).map(([action, count]) => ({ action, count, percentage: currentLogs.length > 0 ? Math.round((count / currentLogs.length) * 100) : 0 }))
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
  const [scenarios, setScenarios] = useState<Array<{id:string; rows:number}>>([]);
  const [currentScenario, setCurrentScenario] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Scenario mapping for buttons
  const scenarioMapping: Record<string, string> = {
    "Scenario 1": "elder_normal_scenario_60rows",
    "Scenario 2": "elder_sleeping_scenario_60rows", 
    "Scenario 3": "elder_walk_run_fall_60rows"
  };

  // Wrap the pure stats function so we can pass it around as before
  const calculateStats = useCallback((currentLogs: ActivityLog[]): Stats => computeStats(currentLogs), []);

  // initial state is set via module-level constants to avoid synchronous setState in effect

  // Connect to WebSocket for real-time backend updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/realtime');
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket received:', data);  // Debug log
      if (data.type === 'update') {
        // Only update sensor data if backend sent actual data (scenario playing)
        if (data.sensor_data) {
          setSensorData(data.sensor_data);
          setSensorHistory(prev => [...prev.slice(-49), data.sensor_data]);
        }
        if (data.vitals) {
          setVitals(data.vitals);
        }
        
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
      console.log('WebSocket error - ensure backend is running');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [calculateStats]);

  // Load scenario list at startup
  useEffect(() => {
    fetch('/api/scenarios')
      .then(r => r.json())
      .then(data => setScenarios(data.scenarios || []))
      .catch(() => setScenarios([]));
  }, []);

  const startScenario = async (id: string) => {
    try {
      console.log('Starting scenario:', id);  // Debug log
      const res = await fetch(`/api/scenarios/${encodeURIComponent(id)}/start`, { method: 'POST' });
      const body = await res.json();
      console.log('Start scenario response:', body);  // Debug log
      if (body.success) {
        setCurrentScenario(id);
      }
    } catch (e) {
      console.error('Error starting scenario:', e);
    }
  };

  const stopScenario = async () => {
    try {
      await fetch('/api/scenarios/stop', { method: 'POST' });
      setCurrentScenario(null);
    } catch (e) {
      console.error(e);
    }
  };

  // No frontend simulation - all data comes from backend scenarios

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
                isConnected 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></span>
                <span className="hidden sm:inline">
                  {isConnected ? (currentScenario ? `Playing: ${currentScenario}` : 'Connected') : 'Disconnected'}
                </span>
              </div>

              {/* Patient Info Button */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2">
                  {Object.keys(scenarioMapping).map(buttonName => (
                    <button
                      key={buttonName}
                      onClick={() => startScenario(scenarioMapping[buttonName])}
                      className={`px-2 py-1 rounded-md text-xs ${currentScenario === scenarioMapping[buttonName] ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                      {buttonName}
                    </button>
                  ))}
                </div>
                {currentScenario ? (
                  <button
                    onClick={stopScenario}
                    className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium shadow-md"
                  >
                    Stop Scenario
                  </button>
                ) : (
                  <button
                    onClick={() => setIsPatientModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium shadow-md"
                  >
                    <span>👤</span>
                    <span className="hidden sm:inline">Patient Info</span>
                  </button>
                )}
              </div>
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
          {isConnected ? (currentScenario ? `🎬 Playing scenario: ${currentScenario}` : '🔌 Connected - Select a scenario to start') : '⚠️ Backend not connected'}
        </p>
      </footer>
    </div>
  );
}

export default App;
