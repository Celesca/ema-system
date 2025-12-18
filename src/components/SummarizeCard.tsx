import type { ActivityLog } from '../types';

interface SummarizeCardProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
}

function generateMockSummary(logs: ActivityLog[]) {
  if (!logs || logs.length === 0) return { text: 'No logs available to summarize.', stats: null };

  const total = logs.length;
  const critical = logs.filter(l => l.severity === 'critical').length;
  const warnings = logs.filter(l => l.severity === 'warning').length;

  // actions
  const byAction: Record<string, number> = {};
  let totalSteps = 0;
  let totalCalories = 0;
  let tempCount = 0;
  let tempSum = 0;

  logs.forEach(l => {
    const a = (l.action || l.activity_label_en || 'unknown').toString();
    byAction[a] = (byAction[a] || 0) + 1;
    if (typeof l.step === 'number') totalSteps += l.step;
    if (typeof l.calorie === 'number') totalCalories += l.calorie;
    if (typeof l.temperature === 'number') { tempSum += l.temperature; tempCount += 1; }
  });

  const topActions = Object.entries(byAction)
    .sort((a,b) => b[1]-a[1])
    .slice(0,5)
    .map(([a,c]) => ({ action: a, count: c }));

  const avgTemp = tempCount > 0 ? +(tempSum / tempCount).toFixed(2) : null;

  const text = `Summary (mock):\n- Total log entries: ${total}\n- Critical events: ${critical}\n- Warnings: ${warnings}\n- Top actions: ${topActions.map(t=>`${t.action} (${t.count})`).join(', ')}\n\nRecommendation (mock):\nMonitor periods with frequent critical events and check device placement for noisy readings.`;

  return {
    text,
    stats: {
      total,
      critical,
      warnings,
      totalSteps,
      totalCalories: Math.round(totalCalories * 100)/100,
      avgTemp,
      topActions,
    }
  };
}

export function SummarizeCard({ isOpen, onClose, logs }: SummarizeCardProps) {
  if (!isOpen) return null;

  const result = generateMockSummary(logs);
  const summary = typeof result === 'string' ? { text: result, stats: null } : result;

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl p-6 z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="3" stroke="#4F46E5" strokeWidth="0" fill="#EEF2FF"/>
                  <rect x="6" y="13" width="2" height="5" rx="0.5" fill="#4F46E5" />
                  <rect x="10" y="9" width="2" height="9" rx="0.5" fill="#4F46E5" />
                  <rect x="14" y="5" width="2" height="13" rx="0.5" fill="#4F46E5" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold">Summarize Activity Logs (mock)</h3>
              <p className="text-sm text-gray-500 mt-1">Quick insights generated from recent activity logs.</p>
            </div>
          </div>
          <div className="ml-auto">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800">Close ✕</button>
          </div>
        </div>

        {summary.stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500">Total Entries</div>
              <div className="text-2xl font-bold text-blue-600">{summary.stats.total}</div>
              <div className="text-xs text-gray-500">Critical: {summary.stats.critical} • Warnings: {summary.stats.warnings}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500">Steps (sum)</div>
              <div className="text-2xl font-bold text-green-600">{summary.stats.totalSteps}</div>
              <div className="text-xs text-gray-500">Calories: {summary.stats.totalCalories}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-xs text-gray-500">Average Temperature</div>
              <div className="text-2xl font-bold text-red-600">{summary.stats.avgTemp ?? '-' } °C</div>
              <div className="text-xs text-gray-500">Top actions</div>
              <div className="mt-2 text-sm text-gray-700">
                {summary.stats.topActions.map(t => (
                  <div key={t.action} className="flex items-center justify-between">
                    <div className="truncate">{t.action}</div>
                    <div className="text-gray-500 text-xs">{t.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 p-4 rounded">{summary.text}</div>
        )}

        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Recommendation</h4>
          <p className="text-sm text-gray-700">Monitor periods with frequent critical events and check device placement for noisy readings. Consider scheduling a nurse check when falls are detected. Review top actions and investigate high-calorie or high-step periods for anomalies.</p>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded">Done</button>
        </div>
      </div>
    </div>
  );
}

export default SummarizeCard;
