import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI, requestsAPI } from '../lib/supabaseApi';
import StatusBadge from '../components/StatusBadge';
import { CircleDot, Loader2, FileText, Wallet, RefreshCw, ChevronRight, Check } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const REQUEST_PROGRESS_STAGES: { key: string; label: string }[] = [
  { key: 'Draft', label: 'Draft' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Negotiating', label: 'Negotiating' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Ordered', label: 'Gathering supplies' },
  { key: 'Received', label: 'Delivering' },
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
  const location = useLocation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hiddenCompletedRequestId, setHiddenCompletedRequestId] = useState<string | null>(null);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const fetchStats = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const data = await dashboardAPI.getStats();
      setHiddenCompletedRequestId(null);
      setStats({
        requestsByStatus: data.requestsByStatus || {},
        recentRequests: data.recentRequests || []
      });
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Failed to load request progress');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (!stats?.recentRequests?.length || canApprove()) return;
    const completed = stats.recentRequests.find((r: any) => r.status === 'Completed');
    if (!completed || hiddenCompletedRequestId === completed.id) return;
    const timer = setTimeout(() => setHiddenCompletedRequestId(completed.id), 10_000);
    return () => clearTimeout(timer);
  }, [stats?.recentRequests, hiddenCompletedRequestId, canApprove]);

  useEffect(() => {
    if (location.pathname === '/request-progress' && stats != null) {
      fetchStats(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    const onFocus = () => fetchStats(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  const approvedBudget = profile?.approved_budget != null ? Number(profile.approved_budget) : null;

  return (
    <div className="space-y-6">
      <CenteredAlert error={error || undefined} success={undefined} onClose={() => { setError(''); fetchStats(); }} />
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

      {/* Approved budget (faculty only) */}
      {!canApprove() && approvedBudget != null && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-red-800 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">Your approved budget</p>
            <p className="text-2xl font-bold text-red-800">₱{approvedBudget.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Pipeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <p className="text-sm text-gray-500 mb-4">
          Pipeline: Draft → Pending → Negotiating → Approved → Gathering supplies → Delivering → Completed
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2">
          {REQUEST_PROGRESS_STAGES.map((stage, index) => {
            let count = stats?.requestsByStatus?.[stage.key] || 0;
            if (stage.key === 'Completed' && hiddenCompletedRequestId) count = Math.max(0, count - 1);
            const isCurrent = count > 0;
            const isLast = index === REQUEST_PROGRESS_STAGES.length - 1;
            return (
              <div key={stage.key} className="flex items-center gap-1 sm:gap-2">
                <Link
                  to={`/requests?status=${encodeURIComponent(stage.key)}`}
                  className={`flex flex-col items-center gap-2 min-w-0 group cursor-pointer shrink-0 rounded-lg p-2 -m-2 hover:bg-gray-100 transition-colors ${isLast ? '' : 'mr-0'}`}
                  title={`View ${stage.label} requests`}
                >
                  <div
                    className={`w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-green-500 border-green-600 text-white group-hover:bg-green-600'
                        : 'bg-gray-100 border-gray-200 group-hover:bg-gray-200 group-hover:border-gray-300'
                    }`}
                  >
                    <span className={`text-xs font-semibold ${isCurrent ? 'text-white' : 'text-gray-600'}`}>
                      {count}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs text-center leading-tight min-h-[2rem] flex items-center justify-center ${
                      isCurrent ? 'text-green-700 font-medium' : 'text-gray-600'
                    }`}
                  >
                    {stage.label}
                  </span>
                </Link>
                {!isLast && (
                  <ChevronRight
                    className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 ${
                      isCurrent ? 'text-green-500' : 'text-gray-300'
                    }`}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>
        {(stats?.requestsByStatus?.Rejected ?? 0) > 0 && (
          <Link
            to="/requests?status=Rejected"
            className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 w-fit hover:opacity-80 transition-opacity cursor-pointer"
            title="View rejected requests"
          >
            <StatusBadge status="Rejected" size="sm" />
            <span className="text-sm text-gray-600">{stats?.requestsByStatus?.Rejected} rejected</span>
          </Link>
        )}
      </div>

      {/* Requests list with progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-wmsu-black">Your requests</h3>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => fetchStats()} disabled={loading} className="text-sm text-red-900 hover:text-red-800 disabled:opacity-50 flex items-center gap-1" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link to="/requests" className="text-sm text-red-900 hover:text-red-800">
              View all
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          {(stats?.recentRequests?.filter((r: any) => r.id !== hiddenCompletedRequestId)?.length ?? 0) > 0 ? (
            stats.recentRequests.filter((r: any) => r.id !== hiddenCompletedRequestId).map((request: any) => {
              const stepIndex = getStatusStepIndex(request.status);
              const totalSteps = REQUEST_PROGRESS_STAGES.length;
              const isNegotiating = request.status === 'Negotiating';
              const hasNotes = isNegotiating && request.negotiating_notes?.trim();
              return (
                <div key={request.id} className="rounded-lg border border-gray-100 overflow-hidden">
                  <Link
                    to={`/requests/${request.id}`}
                    className="block p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                    title="View request progress"
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
                  {isNegotiating && (
                    <div className="px-4 pb-4 pt-0">
                      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3">
                        {hasNotes && (
                          <p className="text-sm text-amber-900 mb-3">
                            <span className="font-medium text-amber-800">Admin note:</span>{' '}
                            {request.negotiating_notes}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            if (acceptingId) return;
                            setAcceptingId(request.id);
                            try {
                              await requestsAPI.agreeToProceed(request.id);
                              await fetchStats();
                            } catch (err: any) {
                              setError(err?.message || 'Failed to accept');
                            } finally {
                              setAcceptingId(null);
                            }
                          }}
                          disabled={!!acceptingId}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60 text-sm font-medium"
                        >
                          {acceptingId === request.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Accept
                        </button>
                      </div>
                    </div>
                  )}
                </div>
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
