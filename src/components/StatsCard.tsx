import type { Stats } from '../types';

interface StatsCardProps {
  stats: Stats | null;
}

const activityColors: Record<number, string> = {
  0: 'bg-red-500',
  1: 'bg-orange-500',
  2: 'bg-purple-500',
  3: 'bg-yellow-500',
  4: 'bg-blue-500',
  5: 'bg-cyan-500',
  6: 'bg-green-500',
};

export function StatsCard({ stats }: StatsCardProps) {
  if (!stats) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">📈 Activity Statistics</h2>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total_activities}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">{stats.critical_events}</p>
          <p className="text-xs text-gray-500">Critical</p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
          <p className="text-xs text-gray-500">Warnings</p>
        </div>
      </div>

      {/* Action Breakdown (if available) */}
      {stats.action_breakdown && stats.action_breakdown.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Action Breakdown</h3>
          <div className="space-y-2">
            {stats.action_breakdown.map((a) => (
              <div key={a.action} className="flex items-center justify-between text-xs text-gray-600">
                <div className="truncate mr-2">{a.action}</div>
                <div className="text-gray-500">{a.count} ({a.percentage}%)</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Breakdown */}
      <div className="space-y-2">
        {stats.activity_breakdown.map((stat) => (
          <div key={stat.activity} className="flex items-center gap-2">
            <div className="w-24 text-xs text-gray-600 truncate" title={stat.label}>
              {stat.label_en}
            </div>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${activityColors[stat.activity]} transition-all duration-500`}
                style={{ width: `${Math.max(stat.percentage, 2)}%` }}
              />
            </div>
            <div className="w-12 text-xs text-gray-500 text-right">
              {stat.count} ({stat.percentage}%)
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
