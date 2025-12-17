import { useMemo } from 'react';
import type { SensorData } from '../types';

interface SensorChartProps {
  data: SensorData[];
  type: 'accelerometer' | 'gyroscope';
}

export function SensorChart({ data, type }: SensorChartProps) {
  const chartData = useMemo(() => {
    const lastNPoints = data.slice(-50);
    return lastNPoints.map((d, index) => ({
      index,
      x: type === 'accelerometer' ? d.accelerometer.x : d.gyroscope.x,
      y: type === 'accelerometer' ? d.accelerometer.y : d.gyroscope.y,
      z: type === 'accelerometer' ? d.accelerometer.z : d.gyroscope.z,
    }));
  }, [data, type]);

  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 10;
    const allValues = chartData.flatMap(d => [Math.abs(d.x), Math.abs(d.y), Math.abs(d.z)]);
    return Math.max(...allValues, 1);
  }, [chartData]);

  const normalizeY = (value: number) => {
    const height = 100;
    const normalized = (value / maxValue) * (height / 2);
    return height / 2 - normalized;
  };

  const createPath = (values: number[]) => {
    if (values.length === 0) return '';
    const width = 100;
    const step = width / Math.max(values.length - 1, 1);
    
    return values
      .map((val, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${normalizeY(val)}`)
      .join(' ');
  };

  const xPath = createPath(chartData.map(d => d.x));
  const yPath = createPath(chartData.map(d => d.y));
  const zPath = createPath(chartData.map(d => d.z));

  const latestValues = chartData[chartData.length - 1] || { x: 0, y: 0, z: 0 };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700 capitalize">
          {type === 'accelerometer' ? '📊 Accelerometer' : '🔄 Gyroscope'}
        </h2>
        <span className="text-xs text-gray-500">
          {type === 'accelerometer' ? 'm/s²' : '°/s'}
        </span>
      </div>

      {/* Chart */}
      <div className="relative h-32 md:h-40 bg-gray-50 rounded-lg overflow-hidden">
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          preserveAspectRatio="none"
        >
          {/* Grid lines */}
          <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="0.5" />
          <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="#e5e7eb" strokeWidth="0.3" strokeDasharray="2,2" />
          
          {/* Data lines */}
          <path d={xPath} fill="none" stroke="#ef4444" strokeWidth="1.5" />
          <path d={yPath} fill="none" stroke="#22c55e" strokeWidth="1.5" />
          <path d={zPath} fill="none" stroke="#3b82f6" strokeWidth="1.5" />
        </svg>
      </div>

      {/* Legend & Current Values */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div>
            <p className="text-xs text-gray-500">X</p>
            <p className="text-sm font-semibold text-gray-700">{latestValues.x.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div>
            <p className="text-xs text-gray-500">Y</p>
            <p className="text-sm font-semibold text-gray-700">{latestValues.y.toFixed(2)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <div>
            <p className="text-xs text-gray-500">Z</p>
            <p className="text-sm font-semibold text-gray-700">{latestValues.z.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
