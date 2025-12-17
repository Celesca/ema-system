import type { SensorData } from '../types';

interface ActivityCardProps {
  sensorData: SensorData | null;
}

const activityIcons: Record<number, string> = {
  0: '⚠️', // Fall
  1: '🦘', // Jump
  2: '🛏️', // Lying down
  3: '🏃', // Running
  4: '🪑', // Stand to sit
  5: '🧍', // Sit to stand
  6: '🚶', // Walking
};

const severityColors: Record<string, string> = {
  normal: 'bg-green-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

const severityBgColors: Record<string, string> = {
  normal: 'bg-green-50 border-green-200',
  warning: 'bg-yellow-50 border-yellow-200',
  critical: 'bg-red-50 border-red-200 animate-pulse',
};

export function ActivityCard({ sensorData }: ActivityCardProps) {
  if (!sensorData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Current Activity</h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl shadow-lg p-4 md:p-6 border-2 transition-all duration-300 ${severityBgColors[sensorData.severity]}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">Current Activity</h2>
        <span className={`px-3 py-1 rounded-full text-white text-xs font-medium ${severityColors[sensorData.severity]}`}>
          {sensorData.severity.toUpperCase()}
        </span>
      </div>
      
      <div className="flex items-center gap-4 mb-4">
        <div className="text-5xl md:text-6xl">
          {activityIcons[sensorData.activity]}
        </div>
        <div className="flex-1">
          <p className="text-xl md:text-2xl font-bold text-gray-800">
            {sensorData.activity_label}
          </p>
          <p className="text-sm text-gray-500">
            {sensorData.activity_label_en}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-gray-500">Confidence:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${sensorData.confidence * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-700">
              {Math.round(sensorData.confidence * 100)}%
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Temperature</div>
          <div className="text-sm font-medium text-gray-800">{sensorData.temperature ?? '-'} °C</div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Step</div>
          <div className="text-sm font-medium text-gray-800">{sensorData.step ?? '-'}</div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Calorie</div>
          <div className="text-sm font-medium text-gray-800">{sensorData.calorie ?? '-'}</div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-gray-500">Device</div>
          <div className="text-sm font-medium text-gray-800">{sensorData.device ?? '-'}</div>
        </div>
      </div>
        {sensorData.action && (
          <div className="mt-3 text-sm text-gray-600">
            <span className="text-xs text-gray-500">Action:</span>{' '}
            <span className="font-medium text-gray-800">{sensorData.action}</span>
          </div>
        )}

      {sensorData.severity === 'critical' && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-red-500 text-xl">🚨</span>
            <div>
              <p className="text-red-700 font-semibold text-sm">Alert: Fall Detected!</p>
              <p className="text-red-600 text-xs">Immediate attention required</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
