import type { ActivityLog } from '../types';

interface LogsPanelProps {
  logs: ActivityLog[];
  onAcknowledge?: (logId: string) => void;
}

const severityColors: Record<string, string> = {
  normal: 'border-l-green-500 bg-green-50',
  warning: 'border-l-yellow-500 bg-yellow-50',
  critical: 'border-l-red-500 bg-red-50',
};

const activityIcons: Record<number, string> = {
  0: '⚠️',
  1: '🦘',
  2: '🛏️',
  3: '🏃',
  4: '🪑',
  5: '🧍',
  6: '🚶',
};

export function LogsPanel({ logs, onAcknowledge }: LogsPanelProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('th-TH', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">📋 Activity Logs</h2>
        <span className="text-xs text-gray-400">{logs.length} entries</span>
      </div>

      <div className="space-y-2 max-h-80 md:max-h-96 overflow-y-auto pr-2 scrollbar-thin">
        {logs.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No activity logs yet
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`border-l-4 rounded-r-lg p-3 transition-all duration-200 ${severityColors[log.severity]} ${
                !log.acknowledged && log.severity === 'critical' ? 'animate-pulse' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{activityIcons[log.activity]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 text-sm truncate">
                      {log.activity_label}
                    </span>
                    {log.severity === 'critical' && !log.acknowledged && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {log.activity_label_en}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{formatDate(log.timestamp)}</span>
                    <span>•</span>
                    <span>{formatTime(log.timestamp)}</span>
                    <span>•</span>
                    <span>{Math.round(log.confidence * 100)}%</span>
                  </div>
                </div>
                {log.severity === 'critical' && !log.acknowledged && onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge(log.id)}
                    className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors shrink-0"
                  >
                    ACK
                  </button>
                )}
                {log.acknowledged && (
                  <span className="text-green-500 text-xs shrink-0">✓</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
