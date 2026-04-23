import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { budgetsAPI, collegesAPI, requestsAPI } from '../lib/supabaseApi';
import type { Budget, College, RequestWithRelations } from '../types/database';
import {
  Bell,
  Building2,
  Loader2,
  Printer,
  PlusCircle,
  ScrollText,
  Wallet,
} from 'lucide-react';
import AnalyticsPanel from '../components/AnalyticsPanel';
import RequisitionViewModal from '../components/RequisitionViewModal';
import DashboardSummaryModal from '../components/DashboardSummaryModal';

/** System-wide dashboard for Admin users. */
export default function AdminDashboard() {
  const SCHOOL_YEAR_PATTERN = /^SY (\d{4})-(\d{4})$/;
  const navigate = useNavigate();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [currentBudget, setCurrentBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);
  const [budgetSummaryOpen, setBudgetSummaryOpen] = useState(false);
  const [collegesSummaryOpen, setCollegesSummaryOpen] = useState(false);
  const [cardHint, setCardHint] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const [reqRows, collegeRows, latestBudget] = await Promise.all([
          requestsAPI.getAll().catch(() => []),
          collegesAPI.getAll().catch(() => []),
          budgetsAPI.getLatestSession().catch(() => null),
        ]);
        if (!mounted) return;
        setRequests(reqRows);
        setColleges((collegeRows || []).filter((c) => c.is_active));
        setCurrentBudget(latestBudget);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const budgetTotal = Number(currentBudget?.total_amount || 0);
  const budgetRemaining = Number(currentBudget?.remaining_amount || 0);
  const schoolYearRange = useMemo(() => {
    const match = String(currentBudget?.academic_year || '').trim().toUpperCase().match(SCHOOL_YEAR_PATTERN);
    if (!match) return null;
    const startYear = Number(match[1]);
    const endYear = Number(match[2]);
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || endYear !== startYear + 1) return null;
    return { startYear, endYear };
  }, [currentBudget?.academic_year]);

  const sessionScopedRequests = useMemo(() => {
    if (!schoolYearRange) return requests;
    return requests.filter((request) => {
      const year = new Date(request.created_at).getFullYear();
      return year >= schoolYearRange.startYear && year <= schoolYearRange.endYear;
    });
  }, [requests, schoolYearRange]);

  const pendingCount = useMemo(
    () => sessionScopedRequests.filter((r) => r.status === 'Pending').length,
    [sessionScopedRequests]
  );
  const notificationsCount = useMemo(
    () => sessionScopedRequests.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status)).length,
    [sessionScopedRequests]
  );

  const reloadRequests = async () => {
    try {
      const reqRows = await requestsAPI.getAll().catch(() => []);
      setRequests(reqRows);
    } catch {
      /* keep */
    }
  };

  const openPendingQueue = () => {
    setCardHint('');
    if (!pendingCount) {
      setCardHint('No pending requests at the moment.');
      return;
    }
    navigate('/admin/request-center?filters=pending');
  };

  const openAttentionQueue = () => {
    setCardHint('');
    if (!notificationsCount) {
      setCardHint('No rejected or failed requests at the moment.');
      return;
    }
    navigate('/admin/request-center?filters=attention');
  };

  return (
    <div className="space-y-6 print-dashboard-root">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-base text-gray-500 mt-1">
            System-wide overview of procurement activity across all colleges.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="print-hide inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
        >
          <Printer className="w-4 h-4" />
          Print Dashboard
        </button>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <>
          {cardHint ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{cardHint}</div>
          ) : null}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Current Budget Session</p>
            <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
              <Wallet className="w-5 h-5 text-red-900" />
              {currentBudget?.academic_year
                ? `AY ${currentBudget.academic_year}`
                : 'No active session'}
            </p>
            {currentBudget ? (
              <p className="text-xs text-gray-500 mt-1">
                Remaining ₱{budgetRemaining.toLocaleString()} of ₱{budgetTotal.toLocaleString()}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => {
                setCardHint('');
                setBudgetSummaryOpen(true);
              }}
              className="text-left w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Budget</p>
                <Wallet className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">
                ₱{budgetRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Remaining from ₱{budgetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} allocation — click for printable summary
              </p>
            </button>

            <button
              type="button"
              onClick={openPendingQueue}
              className="text-left w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Pending Requests</p>
                <PlusCircle className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{pendingCount}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval — click to open pending queue</p>
            </button>

            <button
              type="button"
              onClick={openAttentionQueue}
              className="text-left w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Attention Items</p>
                <Bell className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{notificationsCount}</p>
              <p className="text-xs text-gray-500 mt-1">Rejected / Procurement failed — click to open queue</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setCardHint('');
                setCollegesSummaryOpen(true);
              }}
              className="text-left w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Active Colleges</p>
                <Building2 className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{colleges.length}</p>
              <p className="text-xs text-gray-500 mt-1">Managed colleges — click for printable list</p>
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Full admin pages:{' '}
            <Link to="/budget" className="text-red-900 hover:underline">
              Budget
            </Link>{' '}
            ·{' '}
            <Link to="/colleges" className="text-red-900 hover:underline">
              Colleges
            </Link>
            .
          </p>

          <AnalyticsPanel
            requests={requests}
            budgetTotal={budgetTotal}
            subheading="System-wide procurement analytics across all colleges."
          />

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link
                to="/budget"
                className="px-4 py-2 rounded-lg bg-red-900 text-white text-sm hover:bg-red-800 inline-flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Manage Budget
              </Link>
              <Link
                to="/colleges"
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <Building2 className="w-4 h-4" />
                Manage Colleges
              </Link>
              <Link
                to="/logs"
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 inline-flex items-center gap-2"
              >
                <ScrollText className="w-4 h-4" />
                View Activity Logs
              </Link>
            </div>
          </div>

          <DashboardSummaryModal
            open={budgetSummaryOpen}
            onClose={() => setBudgetSummaryOpen(false)}
            title="University budget session (summary)"
            filenameBase="admin-budget-summary"
            lines={[
              {
                label: 'Academic year',
                value: currentBudget?.academic_year || 'No active session',
              },
              {
                label: 'Total session budget',
                value: `₱${budgetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              },
              {
                label: 'Remaining',
                value: `₱${budgetRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              },
            ]}
          />

          <DashboardSummaryModal
            open={collegesSummaryOpen}
            onClose={() => setCollegesSummaryOpen(false)}
            title="Active colleges"
            filenameBase="active-colleges-list"
            lines={[
              { label: 'Count', value: String(colleges.length) },
              ...colleges.map((c) => ({
                label: c.name,
                value: c.handler_id ? 'Has college admin' : 'No handler',
              })),
            ]}
          />

          <RequisitionViewModal
            request={viewing}
            onClose={() => setViewing(null)}
            onRecorded={() => void reloadRequests()}
          />
        </>
      )}
    </div>
  );
}
