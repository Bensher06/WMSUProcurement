import { useState, useEffect } from 'react';
import { activityAPI } from '../lib/supabaseApi';
import type { ActivityWithActor } from '../types/database';
import { Loader2, ScrollText } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

type Row = ActivityWithActor & {
  request?: { id: string; item_name: string; status: string } | null;
};

export default function Logs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await activityAPI.getAllRecent(200);
        if (!cancelled) setRows(data as Row[]);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load activity log');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatAction = (action: string) => {
    switch (action) {
      case 'created': return 'Created';
      case 'status_changed': return 'Status changed';
      case 'delegated': return 'Delegated';
      case 'comment_added': return 'Comment';
      default: return action;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <ScrollText className="w-8 h-8 text-red-900" />
          Logs
        </h1>
        <p className="text-base text-gray-500 mt-1">
          Recent procurement request activity (audit trail).
        </p>
      </div>

      <CenteredAlert error={error || undefined} onClose={() => setError('')} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">When</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Request</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    No activity yet. Actions on requests will appear here.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {r.actor?.full_name || r.actor?.email || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded bg-red-50 text-red-900 text-xs font-medium">
                        {formatAction(r.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {r.request?.item_name ? (
                        <span className="truncate block" title={r.request.item_name}>
                          {r.request.item_name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-md">
                      <pre className="text-xs whitespace-pre-wrap break-words font-sans">
                        {r.details != null ? JSON.stringify(r.details, null, 0) : '—'}
                      </pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
