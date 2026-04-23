import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePopoverStayInViewport } from '../hooks/usePopoverStayInViewport';
import { budgetsAPI, collegesAPI, departmentsAPI, requestsAPI } from '../lib/supabaseApi';
import {
  displayRequesterFacultyDepartment,
  displayRequesterFullName,
  type Budget,
  type College,
  type RequestWithRelations,
} from '../types/database';
import { Download, Eye, Filter, Loader2, X } from 'lucide-react';
import RequisitionViewModal from '../components/RequisitionViewModal';

const SCHOOL_YEAR_PATTERN = /^SY (\d{4})-(\d{4})$/;

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

const parseSchoolYearRange = (academicYear: string | null | undefined): { startYear: number; endYear: number } | null => {
  const match = String(academicYear || '').trim().toUpperCase().match(SCHOOL_YEAR_PATTERN);
  if (!match) return null;
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear !== startYear + 1) return null;
  return { startYear, endYear };
};

const requestInSchoolYear = (request: RequestWithRelations, range: { startYear: number; endYear: number } | null): boolean => {
  if (!range) return true;
  const year = new Date(request.created_at).getFullYear();
  return year >= range.startYear && year <= range.endYear;
};

const FILTER_OPTIONS = [
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

export default function AdminRequestCenter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [departmentsByCollegeId, setDepartmentsByCollegeId] = useState<Record<string, string[]>>({});
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);
  const [dateFilter, setDateFilter] = useState<(typeof DATE_OPTIONS)[number]['id']>('any');
  const [amountFilter, setAmountFilter] = useState<(typeof AMOUNT_OPTIONS)[number]['id']>('any');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['id']>('relevance');
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  usePopoverStayInViewport(showAdvancedFilters, filterPanelRef);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [requestRows, collegeRows, budget, departmentRows] = await Promise.all([
          requestsAPI.getAll(),
          collegesAPI.getAll(),
          budgetsAPI.getLatestSession().catch(() => null),
          departmentsAPI.getAll().catch(() => []),
        ]);
        setRequests(requestRows);
        setColleges((collegeRows || []).filter((c) => c.is_active));
        setCurrentBudget(budget);
        const byCollege: Record<string, string[]> = {};
        for (const row of departmentRows) {
          if (!row.is_active) continue;
          if (!byCollege[row.college_id]) byCollege[row.college_id] = [];
          byCollege[row.college_id].push(row.name);
        }
        Object.keys(byCollege).forEach((id) => {
          byCollege[id] = Array.from(new Set(byCollege[id])).sort((a, b) => a.localeCompare(b));
        });
        setDepartmentsByCollegeId(byCollege);
      } catch (e: any) {
        setError(e?.message || 'Failed to load admin requests.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

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

  const filterParamIds = (searchParams.get('filters') || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const validFilterIds = new Set(FILTER_OPTIONS.map((o) => o.id));
  const selectedFilterIds = filterParamIds.filter((id) => validFilterIds.has(id as any));
  const effectiveFilterIds = selectedFilterIds.length > 0 ? selectedFilterIds : FILTER_OPTIONS.map((o) => o.id);
  const effectiveFilterIdSet = new Set(effectiveFilterIds);

  const sessionOnly = searchParams.get('session') !== 'all';
  const schoolYearRange = useMemo(() => parseSchoolYearRange(currentBudget?.academic_year), [currentBudget?.academic_year]);

  const setFilterIds = (nextIds: string[]) => {
    const next = new URLSearchParams(searchParams);
    if (nextIds.length === FILTER_OPTIONS.length) next.delete('filters');
    else next.set('filters', nextIds.join(','));
    setSearchParams(next);
  };

  const setSessionOnly = (nextValue: boolean) => {
    const next = new URLSearchParams(searchParams);
    if (nextValue) next.delete('session');
    else next.set('session', 'all');
    setSearchParams(next);
  };

  const collegeNameById = useMemo(() => {
    const map = new Map<string, string>();
    colleges.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [colleges]);

  const allowedStatuses = useMemo(() => {
    const s = new Set<string>();
    FILTER_OPTIONS.forEach((o) => {
      if (!effectiveFilterIdSet.has(o.id)) return;
      o.statuses.forEach((status) => s.add(status));
    });
    return s;
  }, [effectiveFilterIdSet]);

  const departments = useMemo(() => {
    const d = new Set<string>();
    if (selectedCollegeId) {
      (departmentsByCollegeId[selectedCollegeId] || []).forEach((name) => {
        const trimmed = name.trim();
        if (trimmed) d.add(trimmed);
      });
    }
    requests
      .filter((r) => {
        if (!selectedCollegeId) return true;
        return (r.college_budget_type?.college_id || '') === selectedCollegeId;
      })
      .forEach((r) => {
        const name = displayRequesterFacultyDepartment(r);
        if (name) d.add(name);
      });
    return Array.from(d).sort((a, b) => a.localeCompare(b));
  }, [requests, selectedCollegeId, departmentsByCollegeId]);

  useEffect(() => {
    if (!selectedDepartment) return;
    if (!departments.includes(selectedDepartment)) {
      setSelectedDepartment('');
    }
  }, [departments, selectedDepartment]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(startOfToday - now.getDay() * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    const result = requests
      .filter((r) => r.status !== 'Draft' && allowedStatuses.has(r.status))
      .filter((r) => (sessionOnly ? requestInSchoolYear(r, schoolYearRange) : true))
      .filter((r) => {
        if (!selectedCollegeId) return true;
        const collegeId = r.college_budget_type?.college_id || '';
        return collegeId === selectedCollegeId;
      })
      .filter((r) => {
        if (!selectedDepartment) return true;
        return displayRequesterFacultyDepartment(r).toLowerCase() === selectedDepartment.toLowerCase();
      })
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
        const collegeLabel = collegeNameById.get(r.college_budget_type?.college_id || '') || '';
        const requester = `${displayRequesterFullName(r)} ${displayRequesterFacultyDepartment(r)}`.toLowerCase();
        const rowText = `${r.item_name} ${r.ris_no || ''} ${r.sai_no || ''} ${r.status} ${collegeLabel}`.toLowerCase();
        return rowText.includes(q) || requester.includes(q);
      });
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'highest') return Number(b.total_price || 0) - Number(a.total_price || 0);
      return 0;
    });
    return result;
  }, [requests, allowedStatuses, sessionOnly, schoolYearRange, selectedCollegeId, selectedDepartment, dateFilter, amountFilter, sortBy, search, collegeNameById]);

  const pendingCount = useMemo(() => filteredRows.filter((r) => r.status === 'Pending').length, [filteredRows]);
  const attentionCount = useMemo(
    () => filteredRows.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status)).length,
    [filteredRows]
  );

  const handleExportCsv = () => {
    const headers = ['RIS No', 'SAI No', 'Subject', 'Requester', 'Department', 'College', 'Status', 'Amount', 'Date'];
    const rowsForCsv = filteredRows.map((r) => [
      r.ris_no || '',
      r.sai_no || '',
      r.item_name || '',
      displayRequesterFullName(r),
      displayRequesterFacultyDepartment(r),
      collegeNameById.get(r.college_budget_type?.college_id || '') || 'Unassigned',
      r.status || '',
      Number(r.total_price || 0).toFixed(2),
      new Date(r.created_at).toLocaleDateString(),
    ]);
    const dateTag = new Date().toISOString().slice(0, 10);
    downloadCsv(`admin-request-center-${dateTag}.csv`, headers, rowsForCsv);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Requests & Notifications</h1>
        <p className="text-base text-gray-500 mt-1">
          Cross-college queue for pending approvals, attention items, and request history.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Pending Requests</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{pendingCount}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Attention Items</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{attentionCount}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search RIS/SAI, requester, department, item, college..."
            className="w-full lg:w-[420px] px-3 py-2 rounded-lg border border-gray-300 text-sm"
          />
          <select
            value={selectedCollegeId}
            onChange={(e) => setSelectedCollegeId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white"
          >
            <option value="">All colleges</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {college.name}
              </option>
            ))}
          </select>
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
                    <p className="text-xs uppercase tracking-wide text-gray-400">Session</p>
                    <button
                      type="button"
                      onClick={() => setSessionOnly(true)}
                      className={`block text-left text-sm ${sessionOnly ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
                    >
                      Current session
                    </button>
                    <button
                      type="button"
                      onClick={() => setSessionOnly(false)}
                      className={`block text-left text-sm ${!sessionOnly ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'}`}
                    >
                      All sessions
                    </button>
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
        <p className="text-xs text-gray-500">
          Session scope: {sessionOnly ? 'Current session only' : 'All sessions'}
          {currentBudget?.academic_year ? <span> ({currentBudget.academic_year})</span> : null}
        </p>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div> : null}

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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Department</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">College</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Form</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-500">
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
                    <td className="px-4 py-3 text-sm text-gray-700">{displayRequesterFullName(r)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {displayRequesterFacultyDepartment(r) || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {collegeNameById.get(r.college_budget_type?.college_id || '') || 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.status}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      ₱{Number(r.total_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setViewing(r)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-50 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        View form
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Full admin pages:{' '}
        <Link to="/admin/dashboard" className="text-red-900 hover:underline">
          Dashboard
        </Link>{' '}
        ·{' '}
        <Link to="/budget" className="text-red-900 hover:underline">
          Budget
        </Link>{' '}
        ·{' '}
        <Link to="/colleges" className="text-red-900 hover:underline">
          Colleges
        </Link>
        .
      </p>

      <RequisitionViewModal request={viewing} onClose={() => setViewing(null)} onRecorded={() => undefined} />
    </div>
  );
}
