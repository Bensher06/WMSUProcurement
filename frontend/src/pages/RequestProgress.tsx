import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../lib/supabaseApi';
import StatusBadge from '../components/StatusBadge';
import { CircleDot, Loader2, FileText } from 'lucide-react';

const REQUEST_PROGRESS_STAGES: { key: string; label: string }[] = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Ordered', label: 'Ordered' },
  { key: 'Received', label: 'Received' },
  { key: 'Completed', label: 'Completed' }
];

function getStatusStepIndex(status: string): number {
  const i = REQUEST_PROGRESS_STAGES.findIndex(s => s.key === status);
  return i >= 0 ? i : -1;
}

interface DashboardStats {
  requestsByStatus: Record<string, number>;
  recentRequests: any[];
}

const RequestProgress = () => {
  const { profile, canApprove } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await dashboardAPI.getStats();
      setStats({
        requestsByStatus: data.requestsByStatus || {},
        recentRequests: data.recentRequests || []
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load request progress');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-wmsu-black flex items-center gap-2">
            <CircleDot className="w-8 h-8 text-red-900" />
            Request progress
          </h1>
          <p className="text-base text-gray-500 mt-1">
            {canApprove() ? 'Overview of requests' : `Progress of your requests, ${profile?.full_name}`}
          </p>
        </div>
        <Link
          to="/requests/new"
          className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors font-medium flex items-center gap-2"
        >
          <FileText className="w-5 h-5" />
          New Request
        </Link>
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm text-gray-500 mb-4">
          Pipeline: Draft → Pending → Approved → Ordered → Received → Completed
        </p>
        <div className="flex flex-wrap items-end gap-2 sm:gap-0 sm:flex-nowrap sm:justify-between">
          {REQUEST_PROGRESS_STAGES.map((stage, index) => {
            const count = stats?.requestsByStatus?.[stage.key] || 0;
            return (
              <div key={stage.key} className="flex flex-col items-center flex-1 min-w-[4rem]">
                <div className="flex items-center gap-0.5 w-full justify-center">
                  {index > 0 && (
                    <div className="hidden sm:block flex-1 h-0.5 bg-gray-200 -mr-px max-w-[20px]" style={{ minWidth: 8 }} />
                  )}
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                      <span className="text-xs font-semibold text-gray-600">{count}</span>
                    </div>
                    <span className="text-xs text-gray-600 mt-1 text-center leading-tight">{stage.label}</span>
                  </div>
                  {index < REQUEST_PROGRESS_STAGES.length - 1 && (
                    <div className="hidden sm:block flex-1 h-0.5 bg-gray-200 -ml-px max-w-[20px]" style={{ minWidth: 8 }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {(stats?.requestsByStatus?.Rejected ?? 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
            <StatusBadge status="Rejected" size="sm" />
            <span className="text-sm text-gray-600">{stats?.requestsByStatus?.Rejected} rejected</span>
          </div>
        )}
      </div>

      {/* Requests list with progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-wmsu-black">Your requests</h3>
          <Link to="/requests" className="text-sm text-red-900 hover:text-red-800">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {stats?.recentRequests?.length > 0 ? (
            stats.recentRequests.map((request: any) => {
              const stepIndex = getStatusStepIndex(request.status);
              const totalSteps = REQUEST_PROGRESS_STAGES.length;
              return (
                <Link
                  key={request.id}
                  to={`/requests/${request.id}`}
                  className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-wmsu-black truncate">{request.item_name}</p>
                      <p className="text-sm text-gray-500">
                        {request.category?.name} • ₱{request.total_price?.toLocaleString()}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                          {REQUEST_PROGRESS_STAGES.map((_, i) => (
                            <div
                              key={i}
                              className={`flex-1 ${i <= stepIndex ? 'bg-red-600' : 'bg-gray-200'}`}
                              style={{ minWidth: 4 }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {stepIndex >= 0 ? `${stepIndex + 1}/${totalSteps}` : ''} {request.status}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={request.status} size="sm" showIcon={false} />
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-center text-gray-400 py-8">No requests yet. Create one to see progress here.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestProgress;
