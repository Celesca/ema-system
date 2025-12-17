import type { VitalsData } from '../types';

interface VitalsCardProps {
  vitals: VitalsData | null;
}

export function VitalsCard({ vitals }: VitalsCardProps) {
  if (!vitals) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  const getBatteryColor = (level: number) => {
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getBatteryIcon = (level: number) => {
    if (level > 75) return '🔋';
    if (level > 50) return '🔋';
    if (level > 25) return '🪫';
    return '🪫';
  };

  const getHeartRateColor = (status: string) => {
    if (status === 'normal') return 'text-green-500';
    if (status === 'warning') return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Device & Vitals</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Heart Rate */}
        <div className="bg-pink-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl animate-pulse">❤️</span>
            <span className="text-xs text-gray-500">Heart Rate</span>
          </div>
          <p className={`text-2xl font-bold ${getHeartRateColor(vitals.heart_rate_status)}`}>
            {vitals.heart_rate}
            <span className="text-sm font-normal text-gray-400 ml-1">bpm</span>
          </p>
        </div>

        {/* Battery */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{getBatteryIcon(vitals.battery)}</span>
            <span className="text-xs text-gray-500">Battery</span>
          </div>
          <p className={`text-2xl font-bold ${getBatteryColor(vitals.battery)}`}>
            {vitals.battery}
            <span className="text-sm font-normal text-gray-400 ml-1">%</span>
          </p>
        </div>

        {/* Signal Strength */}
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">📶</span>
            <span className="text-xs text-gray-500">Signal</span>
          </div>
          <p className="text-2xl font-bold text-blue-500">
            {vitals.signal_strength}
            <span className="text-sm font-normal text-gray-400 ml-1">%</span>
          </p>
        </div>

        {/* Device Status */}
        <div className="bg-green-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">
              {vitals.device_status === 'connected' ? '✅' : '❌'}
            </span>
            <span className="text-xs text-gray-500">Status</span>
          </div>
          <p className={`text-sm font-bold ${vitals.device_status === 'connected' ? 'text-green-500' : 'text-red-500'}`}>
            {vitals.device_status === 'connected' ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </div>

      {/* Last Sync */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Last sync: {new Date(vitals.last_sync).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
