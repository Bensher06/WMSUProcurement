import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { collegeBudgetTypesAPI, commentsAPI, departmentsAPI, requestsAPI } from '../lib/supabaseApi';
import { supabase } from '../lib/supabaseClient';
import {
  displayRequesterFacultyDepartment,
  displayRequesterFullName,
  type College,
  type RequestWithRelations,
} from '../types/database';
import { Download, Eye, Filter, Loader2, X } from 'lucide-react';
import RequisitionViewModal from '../components/RequisitionViewModal';
import { Link, useSearchParams } from 'react-router-dom';
import { usePopoverStayInViewport } from '../hooks/usePopoverStayInViewport';
import { getRequestChatReadAt, markRequestChatReadNow } from '../lib/chatUnread';

const amount = (n: number) => `₱${Number(n || 0).toLocaleString()}`;
const escapeCsvCell = (value: unknown): string => {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const downloadCsv = (filename: string, headers: string[], rows: Array<Array<unknown>>) => {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  const csv = [headerLine, ...rowLines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const getReuseCount = (r: RequestWithRelations): number => {
  const payload = r.requisition_payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return 0;
  const meta = (payload as Record<string, unknown>).meta;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return 0;
  const raw = (meta as Record<string, unknown>).reuseCount;
  return typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
};

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

export default function DeptHeadRequestHistory() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rows, setRows] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [college, setCollege] = useState<College | null>(null);
  const [catalogDepartments, setCatalogDepartments] = useState<string[]>([]);
  const [typeRemainingById, setTypeRemainingById] = useState<Record<string, number>>({});
  const [collegeRemaining, setCollegeRemaining] = useState<number | null>(null);
  const [unreadByRequestId, setUnreadByRequestId] = useState<Record<string, number>>({});
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);
  const [search, setSearch] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [dateFilter, setDateFilter] = useState<(typeof DATE_OPTIONS)[number]['id']>('any');
  const [amountFilter, setAmountFilter] = useState<(typeof AMOUNT_OPTIONS)[number]['id']>('any');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['id']>('relevance');
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handledRequestIdFromUrl = useRef<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  usePopoverStayInViewport(showAdvancedFilters, filterPanelRef);

  const FILTER_OPTIONS = useMemo(
    () =>
      [
        { id: 'pending', label: 'Pending', statuses: ['Pending'] },
        { id: 'approved', label: 'Approved', statuses: ['Approved'] },
        { id: 'procuring', label: 'Procuring', statuses: ['Procuring'] },
        {
          id: 'completed',
          label: 'Procurement Completed',
          statuses: ['ProcurementDone', 'Received', 'Completed'],
        },
        { id: 'notifications', label: 'Notifications', statuses: ['Rejected', 'ProcurementFailed'] },
      ] as const,
    []
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!profile?.id) {
        setRows([]);
        setCollege(null);
        return;
      }
      const { college: handled, requests } = await requestsAPI.getForHandledCollege(profile.id);
      setCollege(handled);
      setRows(requests);
      if (handled?.id) {
        const deptRows = await departmentsAPI.getByCollegeId(handled.id, true);
        setCatalogDepartments(deptRows.map((d) => d.name));
      } else {
        setCatalogDepartments([]);
      }
      const committedStatuses = ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed'];
      const committed = requests
        .filter((r) => committedStatuses.includes(r.status))
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0);
      const overallCeiling = Number(profile.approved_budget || 0);
      setCollegeRemaining(Math.max(0, overallCeiling - committed));

      if (!handled?.id) {
        setTypeRemainingById({});
        return;
      }
      const types = (await collegeBudgetTypesAPI.getByCollegeId(handled.id)).filter((t) => t.is_active);
      const nextRemaining: Record<string, number> = {};
      for (const t of types) {
        const used = requests
          .filter((r) => committedStatuses.includes(r.status) && r.college_budget_type_id === t.id)
          .reduce((sum, r) => sum + Number(r.total_price || 0), 0);
        nextRemaining[t.id] = Math.max(0, Number(t.amount || 0) - used);
      }
      setTypeRemainingById(nextRemaining);
      const latestComments = await commentsAPI.getLatestByRequestIds(requests.map((r) => r.id));
      const nextUnread: Record<string, number> = {};
      for (const r of requests) {
        const latestAt = latestComments[r.id];
        if (!latestAt) {
          nextUnread[r.id] = 0;
          continue;
        }
        const readAt = getRequestChatReadAt(profile.id, r.id);
        nextUnread[r.id] = !readAt || new Date(latestAt).getTime() > new Date(readAt).getTime() ? 1 : 0;
      }
      setUnreadByRequestId(nextUnread);
    } catch (e: any) {
      setError(e?.message || 'Failed to load requests.');
      setTypeRemainingById({});
      setCollegeRemaining(null);
      setUnreadByRequestId({});
      setCatalogDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const channel = supabase
      .channel(`dept-head-requests-${profile?.id || 'anon'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requests' },
        () => {
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          refreshTimer.current = setTimeout(() => {
            void loadRows();
          }, 350);
        }
      )
      .subscribe();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, loadRows]);

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

  const departmentFilter = (searchParams.get('department') || '').trim();
  const filterParamIds = (searchParams.get('filters') || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const validFilterIds = new Set(FILTER_OPTIONS.map((o) => o.id));
  const selectedFilterIds = filterParamIds.filter((id) => validFilterIds.has(id as any));

  const legacyStatus = (searchParams.get('status') || '').toLowerCase();
  const fallbackFromLegacy: string[] =
    legacyStatus === 'pending'
      ? ['pending']
      : legacyStatus === 'approved'
      ? ['approved']
      : legacyStatus === 'procuring'
      ? ['procuring']
      : legacyStatus === 'history'
      ? ['completed']
      : legacyStatus === 'notifications'
      ? ['notifications']
      : FILTER_OPTIONS.map((o) => o.id);
  const effectiveFilterIds = selectedFilterIds.length > 0 ? selectedFilterIds : fallbackFromLegacy;
  const effectiveFilterIdSet = new Set(effectiveFilterIds);

  const setFilterIds = (nextIds: string[]) => {
    const next = new URLSearchParams(searchParams);
    next.delete('status');
    if (nextIds.length === FILTER_OPTIONS.length) next.delete('filters');
    else next.set('filters', nextIds.join(','));
    setSearchParams(next);
  };

  const allowedStatuses = useMemo(() => {
    const s = new Set<string>();
    FILTER_OPTIONS.forEach((o) => {
      if (!effectiveFilterIdSet.has(o.id)) return;
      o.statuses.forEach((status) => s.add(status));
    });
    return s;
  }, [FILTER_OPTIONS, effectiveFilterIdSet]);

  const departments = useMemo(() => {
    const d = new Set<string>();
    catalogDepartments.forEach((name) => {
      const trimmed = name.trim();
      if (trimmed) d.add(trimmed);
    });
    rows.forEach((r) => {
      const name = displayRequesterFacultyDepartment(r);
      if (name) d.add(name);
    });
    return Array.from(d).sort((a, b) => a.localeCompare(b));
  }, [rows, catalogDepartments]);

  useEffect(() => {
    if (!selectedDepartment) return;
    if (!departments.includes(selectedDepartment)) {
      setSelectedDepartment('');
    }
  }, [departments, selectedDepartment]);

  const statusFilteredRows = useMemo(
    () => rows.filter((r) => r.status !== 'Draft' && allowedStatuses.has(r.status)),
    [rows, allowedStatuses]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(startOfToday - now.getDay() * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const byUrlDepartment = departmentFilter
      ? statusFilteredRows.filter(
          (r) => displayRequesterFacultyDepartment(r).toLowerCase() === departmentFilter.toLowerCase()
        )
      : statusFilteredRows;
    const byDepartment = selectedDepartment
      ? byUrlDepartment.filter(
          (r) => displayRequesterFacultyDepartment(r).toLowerCase() === selectedDepartment.toLowerCase()
        )
      : byUrlDepartment;
    const byDateAmount = byDepartment
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
      });
    const bySearch = !q
      ? byDateAmount
      : byDateAmount.filter((r) => {
          const requester = `${displayRequesterFullName(r)} ${displayRequesterFacultyDepartment(r)}`.toLowerCase();
          const rowText = `${r.item_name} ${r.ris_no || ''} ${r.sai_no || ''} ${r.status}`.toLowerCase();
          return rowText.includes(q) || requester.includes(q);
        });
    bySearch.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'highest') return Number(b.total_price || 0) - Number(a.total_price || 0);
      return 0;
    });
    return bySearch;
  }, [statusFilteredRows, search, departmentFilter, selectedDepartment, dateFilter, amountFilter, sortBy]);

  const subtitle = useMemo(() => {
    if (!college?.name) return 'Track requests and status updates.';
    return `Requisitions from your college (${college.name}). Open a row to read the full submitted form.`;
  }, [college?.name]);

  const handleExportCsv = () => {
    const headers = [
      'RIS No',
      'SAI No',
      'Subject',
      'Requester',
      'Department',
      'Status',
      'Integrity',
      'Amount',
      'Request Again Count',
      'Type Remaining',
      'Date',
    ];

    const rowsForCsv = filteredRows.map((r) => {
      const integrity =
        !r.submitted_payload_hash || r.last_integrity_reason === 'legacy_unhashed'
          ? 'Legacy'
          : `v${r.integrity_version || 1}`;
      const typeRemaining = r.college_budget_type_id
        ? amount(typeRemainingById[r.college_budget_type_id] ?? 0)
        : 'General pool';
      return [
        r.ris_no || '',
        r.sai_no || '',
        r.item_name || '',
        displayRequesterFullName(r),
        displayRequesterFacultyDepartment(r),
        r.status || '',
        integrity,
        Number(r.total_price || 0).toFixed(2),
        getReuseCount(r),
        typeRemaining,
        new Date(r.created_at).toLocaleDateString(),
      ];
    });

    const dateTag = new Date().toISOString().slice(0, 10);
    downloadCsv(`dept-head-request-history-${dateTag}.csv`, headers, rowsForCsv);
  };

  const requestIdParam = searchParams.get('requestId');
  useEffect(() => {
    if (!requestIdParam) {
      handledRequestIdFromUrl.current = null;
      return;
    }
    if (loading || rows.length === 0 || !profile?.id) return;
    if (handledRequestIdFromUrl.current === requestIdParam) return;
    const found = rows.find((r) => r.id === requestIdParam);
    if (!found) return;
    handledRequestIdFromUrl.current = requestIdParam;
    markRequestChatReadNow(profile.id, found.id);
    setUnreadByRequestId((prev) => ({ ...prev, [found.id]: 0 }));
    setViewing(found);
  }, [requestIdParam, loading, rows, profile?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Request & History</h1>
        <p className="text-base text-gray-500 mt-1">{subtitle}</p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RIS/SAI, requester, department, item..."
            className="w-full md:w-[420px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
          >
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredRows.length === 0}
            className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-sm text-emerald-800 hover:bg-emerald-100 active:scale-[0.98] transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <div className="relative inline-flex" ref={filterMenuRef}>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((v) => !v)}
              className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 active:scale-[0.98] transition"
            >
              <Filter className="w-4 h-4" />
              Filter
              <span className="text-xs text-gray-500">
                ({effectiveFilterIds.length}/{FILTER_OPTIONS.length})
              </span>
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
                    {FILTER_OPTIONS.map((opt) => (
                      <label key={opt.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={effectiveFilterIdSet.has(opt.id)}
                          onChange={(e) => {
                            const next = new Set(effectiveFilterIds);
                            if (e.target.checked) next.add(opt.id);
                            else next.delete(opt.id);
                            setFilterIds(Array.from(next));
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
                    <p className="text-xs uppercase tracking-wide text-gray-400">Department scope</p>
                    <p className="text-sm text-gray-300">
                      {selectedDepartment
                        ? `Only ${selectedDepartment}`
                        : departmentFilter
                        ? `Only ${departmentFilter}`
                        : 'All departments'}
                    </p>
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
        {departmentFilter ? (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-800 px-3 py-1 text-xs">
              Department filter: {departmentFilter}
            </span>
            <button
              type="button"
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('department');
                setSearchParams(next);
              }}
              className="text-xs text-gray-600 underline hover:text-gray-900"
            >
              Clear
            </button>
          </div>
        ) : null}
        {collegeRemaining !== null ? (
          <div className="inline-flex items-center rounded-full bg-amber-50 text-amber-800 px-3 py-1 text-xs">
            Budget Ceiling: College remaining {amount(collegeRemaining)}
          </div>
        ) : null}
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Requester</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Integrity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Request Again Count</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Form</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-gray-500">
                    No requests match your current filters.
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
                        <span className="text-gray-400 italic">pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[240px]">
                      <span className="font-medium line-clamp-2">{r.item_name}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {displayRequesterFullName(r)}
                      {displayRequesterFacultyDepartment(r) ? (
                        <span className="block text-xs text-gray-500">{displayRequesterFacultyDepartment(r)}</span>
                      ) : null}
                    </td>
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
                        to={`/dept-head/requisition-integrity?requestId=${r.id}`}
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
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {r.college_budget_type_id ? (
                        <span className="inline-flex rounded-full bg-blue-50 text-blue-800 px-2 py-0.5">
                          Type rem: {amount(typeRemainingById[r.college_budget_type_id] ?? 0)}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 text-gray-700 px-2 py-0.5">
                          General pool
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (profile?.id) {
                            markRequestChatReadNow(profile.id, r.id);
                            setUnreadByRequestId((prev) => ({ ...prev, [r.id]: 0 }));
                          }
                          setViewing(r);
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
        onRecorded={() => {
          void loadRows();
        }}
      />
    </div>
  );
}
