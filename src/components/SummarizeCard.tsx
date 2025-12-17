import type { ActivityLog } from '../types';

interface SummarizeCardProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
}

function generateMockSummary(logs: ActivityLog[]): string {
  if (!logs || logs.length === 0) return 'No logs available to summarize.';
  const total = logs.length;
  const critical = logs.filter(l => l.severity === 'critical').length;
  const warnings = logs.filter(l => l.severity === 'warning').length;
  const byAction: Record<string, number> = {};
  logs.forEach(l => {
    const a = (l.action || l.activity_label_en || 'unknown').toString();
    byAction[a] = (byAction[a] || 0) + 1;
  });
  const topActions = Object.entries(byAction)
    .sort((a,b) => b[1]-a[1])
    .slice(0,3)
    .map(([a,c]) => `${a} (${c})`)
    .join(', ');

  return `Summary (mock):\n- Total log entries: ${total}\n- Critical events: ${critical}\n- Warnings: ${warnings}\n- Top actions: ${topActions}\n\nRecommendation (mock):\nMonitor periods with frequent critical events and check device placement for noisy readings. Consider scheduling a nurse check when falls are detected.`;
}

export function SummarizeCard({ isOpen, onClose, logs }: SummarizeCardProps) {
  if (!isOpen) return null;

  const summary = generateMockSummary(logs);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="bg-white rounded-xl shadow-xl w-[90%] max-w-2xl p-6 z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Summarize Activity Logs (mock)</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">Close</button>
        </div>
        <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded">{summary}</div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded">Done</button>
        </div>
      </div>
    </div>
  );
}

export default SummarizeCard;
