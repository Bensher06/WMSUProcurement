import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePopoverStayInViewport } from '../hooks/usePopoverStayInViewport';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { commentsAPI, requestsAPI } from '../lib/supabaseApi';
import type { RequestWithRelations } from '../types/database';
import { Eye, Filter, Loader2, X } from 'lucide-react';
import RequisitionViewModal from '../components/RequisitionViewModal';
import RequestFormChooserModal from '../components/RequestFormChooserModal';
import InventoryCustodianSlipModal from '../components/InventoryCustodianSlipModal';
import { getRequestChatReadAt, markRequestChatReadNow } from '../lib/chatUnread';

const amount = (n: number) => `₱${Number(n || 0).toLocaleString()}`;
const getReuseCount = (r: RequestWithRelations): number => {
  const payload = r.requisition_payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 0;
  const meta = (payload as Record<string, unknown>).meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return 0;
  const raw = (meta as Record<string, unknown>).reuseCount;
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
};

const STATUS_OPTIONS = [
  { id: 'draft', label: 'Draft', statuses: ['Draft'] },
  { id: 'pending', label: 'Pending', statuses: ['Pending'] },
  { id: 'approved', label: 'Approved', statuses: ['Approved'] },
  { id: 'procuring', label: 'Procuring', statuses: ['Procuring'] },
  { id: 'completed', label: 'Procurement Completed', statuses: ['ProcurementDone', 'Received', 'Completed'] },
  { id: 'attention', label: 'Attention Items', statuses: ['Rejected', 'ProcurementFailed'] },
] as const;

const DATE_OPTIONS = [
  { id: 'any', label: 'Any time' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
] as const;

const AMOUNT_OPTIONS = [
  { id: 'any', label: 'Any amount' },
  { id: 'under10k', label: 'Under P10,000' },
  { id: '10kto50k', label: 'P10,000 - P50,000' },
  { id: '50kto200k', label: 'P50,000 - P200,000' },
  { id: 'over200k', label: 'Over P200,000' },
] as const;

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'highest', label: 'Highest amount' },
] as const;

export default function FacultyRequestHistory() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);
  const [choosingFormFor, setChoosingFormFor] = useState<RequestWithRelations | null>(null);
  const [viewingInventory, setViewingInventory] = useState<RequestWithRelations | null>(null);
  const [unreadByRequestId, setUnreadByRequestId] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<(typeof DATE_OPTIONS)[number]['id']>('any');
  const [amountFilter, setAmountFilter] = useState<(typeof AMOUNT_OPTIONS)[number]['id']>('any');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['id']>('relevance');
  const [selectedStatusIds, setSelectedStatusIds] = useState<string[]>(STATUS_OPTIONS.map((s) => s.id));
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledRequestIdFromUrl = useRef<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  usePopoverStayInViewport(showAdvancedFilters, filterPanelRef);

  const loadRows = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await requestsAPI.getMyRequests();
      setRows(data);
      setViewing((v) => (v ? data.find((r) => r.id === v.id) ?? v : null));
      const latestComments = await commentsAPI.getLatestByRequestIds(data.map((r) => r.id));
      const nextUnread: Record<string, number> = {};
      for (const r of data) {
        const latestAt = latestComments[r.id];
        if (!latestAt) {
          nextUnread[r.id] = 0;
          continue;
        }
        const readAt = getRequestChatReadAt(user.id, r.id);
        nextUnread[r.id] = !readAt || new Date(latestAt).getTime() > new Date(readAt).getTime() ? 1 : 0;
      }
      setUnreadByRequestId(nextUnread);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'visible') return;
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(() => {
        void loadRows();
      }, 150);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [loadRows]);

  useEffect(() => {
    if (!showAdvancedFilters) return;
    const onDocClick = (event: MouseEvent) => {
      if (!filterMenuRef.current) return;
      if (!filterMenuRef.current.contains(event.target as Node)) {
        setShowAdvancedFilters(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showAdvancedFilters]);

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const channel = supabase
      .channel(`faculty-my-requests-${uid}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `requester_id=eq.${uid}`,
        },
        () => {
          if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(() => {
            void loadRows();
          }, 350);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [user?.id, loadRows]);

  const requestIdParam = searchParams.get('requestId');
  useEffect(() => {
    if (!requestIdParam) {
      handledRequestIdFromUrl.current = null;
      return;
    }
    if (loading || rows.length === 0 || !user?.id) return;
    if (handledRequestIdFromUrl.current === requestIdParam) return;
    const found = rows.find((r) => r.id === requestIdParam);
    if (!found) return;
    handledRequestIdFromUrl.current = requestIdParam;
    markRequestChatReadNow(user.id, found.id);
    setUnreadByRequestId((prev) => ({ ...prev, [found.id]: 0 }));
    setViewing(found);
  }, [requestIdParam, loading, rows, user?.id]);

  const allowedStatuses = useMemo(() => {
    const activeIds = selectedStatusIds.length ? selectedStatusIds : STATUS_OPTIONS.map((s) => s.id);
    const statusSet = new Set<string>();
    STATUS_OPTIONS.forEach((opt) => {
      if (!activeIds.includes(opt.id)) return;
      opt.statuses.forEach((status) => statusSet.add(status));
    });
    return statusSet;
  }, [selectedStatusIds]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(startOfToday - now.getDay() * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const result = rows
      .filter((r) => allowedStatuses.has(r.status))
      .filter((r) => {
        if (dateFilter === 'any') return true;
        const createdAt = new Date(r.created_at).getTime();
        if (dateFilter === 'today') return createdAt >= startOfToday;
        if (dateFilter === 'week') return createdAt >= startOfWeek;
        if (dateFilter === 'month') return createdAt >= startOfMonth;
        if (dateFilter === 'year') return createdAt >= startOfYear;
        return true;
      })
      .filter((r) => {
        if (amountFilter === 'any') return true;
        const total = Number(r.total_price || 0);
        if (amountFilter === 'under10k') return total < 10_000;
        if (amountFilter === '10kto50k') return total >= 10_000 && total <= 50_000;
        if (amountFilter === '50kto200k') return total > 50_000 && total <= 200_000;
        if (amountFilter === 'over200k') return total > 200_000;
        return true;
      })
      .filter((r) => {
        if (!q) return true;
        const rowText = `${r.item_name} ${r.ris_no || ''} ${r.sai_no || ''} ${r.status} ${r.description || ''}`.toLowerCase();
        return rowText.includes(q);
      });
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'highest') return Number(b.total_price || 0) - Number(a.total_price || 0);
      return 0;
    });
    return result;
  }, [rows, allowedStatuses, dateFilter, amountFilter, search, sortBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Request & History</h1>
        <p className="text-base text-gray-500 mt-1">
          Track your submitted procurement requests. Use <strong>View form</strong> to see the full requisition.
        </p>
      </div>
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RIS/SAI, item, status, description..."
            className="w-full md:w-[420px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
          <div className="relative inline-flex" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition"
            >
              <Filter className="w-4 h-4" />
              Filter
              <span className="text-xs text-gray-500">({selectedStatusIds.length || STATUS_OPTIONS.length}/{STATUS_OPTIONS.length})</span>
            </button>
            {showAdvancedFilters ? (
              <div
                ref={filterPanelRef}
                className="absolute top-full left-0 z-20 mt-2 w-[min(920px,calc(100vw-1.5rem))] rounded-xl border border-gray-700 bg-[#1f1f1f] p-4 shadow-2xl text-gray-200"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-300">Search filters</p>
                  <button
                    type="button"
                    onClick={() => setShowAdvancedFilters(false)}
                    className="rounded p-1 text-gray-300 hover:bg-gray-800 hover:text-white"
                    aria-label="Close filters"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
                    {STATUS_OPTIONS.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedStatusIds.length === 0 ? true : selectedStatusIds.includes(opt.id)}
                          onChange={(e) => {
                            const next = new Set(selectedStatusIds.length ? selectedStatusIds : STATUS_OPTIONS.map((s) => s.id));
                            if (e.target.checked) next.add(opt.id);
                            else next.delete(opt.id);
                            setSelectedStatusIds(Array.from(next));
                          }}
                        />
                        {opt.label}
                      </label>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Date posted</p>
                    {DATE_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDateFilter(opt.id)}
                        className={`block text-left text-sm ${dateFilter === opt.id ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Amount</p>
                    {AMOUNT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAmountFilter(opt.id)}
                        className={`block text-left text-sm ${amountFilter === opt.id ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Scope</p>
                    <p className="text-sm text-gray-300">My requests only</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Prioritize</p>
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSortBy(opt.id)}
                        className={`block text-left text-sm ${sortBy === opt.id ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>}

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">RIS / SAI No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Item</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Integrity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Request Again Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Form</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No requests found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 text-xs font-mono text-gray-700 whitespace-nowrap">
                      {r.ris_no ? (
                        <>
                          <span className="block text-gray-900">{r.ris_no}</span>
                          <span className="block text-gray-500">{r.sai_no || '—'}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">
                          {r.status === 'Draft' ? 'not sent' : 'pending'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{r.item_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.status}</td>
                    <td className="px-4 py-3 text-xs text-gray-700">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 ${
                          !r.submitted_payload_hash || r.last_integrity_reason === 'legacy_unhashed'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {!r.submitted_payload_hash || r.last_integrity_reason === 'legacy_unhashed'
                          ? 'Legacy'
                          : `v${r.integrity_version || 1}`}
                      </span>
                      <Link
                        to={`/faculty/requisition-integrity?requestId=${r.id}`}
                        className="ml-2 text-red-900 hover:underline"
                      >
                        Timeline
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{amount(r.total_price || 0)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {getReuseCount(r) > 0 ? (
                        <span className="inline-flex rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-medium">
                          {getReuseCount(r)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          markRequestChatReadNow(user.id, r.id);
                          setUnreadByRequestId((prev) => ({ ...prev, [r.id]: 0 }));
                          setChoosingFormFor(r);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View form
                        {unreadByRequestId[r.id] ? (
                          <span className="inline-flex w-2 h-2 rounded-full bg-red-600" title="Unread chat" />
                        ) : null}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <RequisitionViewModal
        request={viewing}
        onClose={() => setViewing(null)}
        onRecorded={() => void loadRows()}
      />
      <RequestFormChooserModal
        request={choosingFormFor}
        onClose={() => setChoosingFormFor(null)}
        onChooseRequisition={() => {
          setViewing(choosingFormFor);
          setChoosingFormFor(null);
        }}
        onChooseInventory={() => {
          setViewingInventory(choosingFormFor);
          setChoosingFormFor(null);
        }}
      />
      <InventoryCustodianSlipModal request={viewingInventory} onClose={() => setViewingInventory(null)} />
    </div>
  );
}
