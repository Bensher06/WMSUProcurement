import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { collegesAPI, requestsAPI } from '../lib/supabaseApi';
import type { College, RequestWithRelations } from '../types/database';
import { Bell, Building2, Loader2, PlusCircle, Printer, Wallet } from 'lucide-react';
import AnalyticsPanel from '../components/AnalyticsPanel';
import RequisitionViewModal from '../components/RequisitionViewModal';
import DashboardSummaryModal from '../components/DashboardSummaryModal';

/** Home for signed-in DeptHead users. */
export default function DeptHeadHome() {
  const { profile } = useAuth();
  const [colleges, setColleges] = useState<College[]>([]);
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loadingCollege, setLoadingCollege] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);
  const [budgetSummaryOpen, setBudgetSummaryOpen] = useState(false);
  const [cardHint, setCardHint] = useState('');

  useEffect(() => {
    let mounted = true;
    const loadCollege = async () => {
      setLoadingCollege(true);
      try {
        const data = await collegesAPI.getAll();
        if (!mounted) return;
        setColleges(data);
      } catch {
        if (!mounted) return;
        setColleges([]);
      } finally {
        if (mounted) setLoadingCollege(false);
      }
    };
    
    const loadRequests = async () => {
      setLoadingRequests(true);
      try {
        if (!profile?.id) {
          if (!mounted) return;
          setRequests([]);
          return;
        }
        const { requests: data } = await requestsAPI.getForHandledCollege(profile.id);
        if (!mounted) return;
        setRequests(data);
      } catch {
        if (!mounted) return;
        setRequests([]);
      } finally {
        if (mounted) setLoadingRequests(false);
      }
    };
    void loadCollege();
    void loadRequests();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const handledCollege = useMemo(() => {
    if (!profile?.id) return null;
    return colleges.find((c) => c.handler_id === profile.id) ?? null;
  }, [colleges, profile?.id]);

  const budgetTotal = Number(profile?.approved_budget || 0);
  const committed = useMemo(
    () =>
      requests
        .filter((r) =>
          ['Approved', 'Procuring', 'ProcurementDone', 'Received', 'Completed'].includes(r.status)
        )
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
    [requests]
  );
  const budgetRemaining = Math.max(0, budgetTotal - committed);
  const notifications = useMemo(
    () => requests.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status)).length,
    [requests]
  );
  const newRequests = useMemo(
    () => requests.filter((r) => r.status === 'Pending').length,
    [requests]
  );
  const isLoading = loadingCollege || loadingRequests;

  const firstNotificationRequest = requests.find((r) => ['Rejected', 'ProcurementFailed'].includes(r.status));
  const firstPendingRequest = requests.find((r) => r.status === 'Pending');

  const reloadRequests = async () => {
    if (!profile?.id) return;
    try {
      const { requests: data } = await requestsAPI.getForHandledCollege(profile.id);
      setRequests(data);
    } catch {
      /* keep */
    }
  };

  const openBudgetSummary = () => {
    setCardHint('');
    setBudgetSummaryOpen(true);
  };

  const openNotificationForm = () => {
    setCardHint('');
    if (!firstNotificationRequest) {
      setCardHint('No rejected or failed requests right now.');
      return;
    }
    setViewing(firstNotificationRequest);
  };

  const openPendingForm = () => {
    setCardHint('');
    if (!firstPendingRequest) {
      setCardHint('No pending requests right now.');
      return;
    }
    setViewing(firstPendingRequest);
  };

  return (
    <div className="space-y-6 print-dashboard-root">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">College Admin Dashboard</h1>
          <p className="text-base text-gray-500 mt-1">
            Normal dashboard view for budget, notifications, and request updates.
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

      {isLoading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <>
          {cardHint ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{cardHint}</div>
          ) : null}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <p className="text-sm text-gray-500">Handling College</p>
            <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
              <Building2 className="w-5 h-5 text-red-900" />
              {handledCollege?.name || profile?.department || 'Not assigned yet'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={openBudgetSummary}
              className="text-left w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Budget</p>
                <Wallet className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">₱{budgetRemaining.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                Remaining from ₱{budgetTotal.toLocaleString()} allocation — click for printable summary
              </p>
            </button>

            <button
              type="button"
              onClick={openNotificationForm}
              className="text-left w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Notification</p>
                <Bell className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{notifications}</p>
              <p className="text-xs text-gray-500 mt-1">Items need your attention — click to open form</p>
            </button>

            <button
              type="button"
              onClick={openPendingForm}
              className="text-left w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">New Request View</p>
                <PlusCircle className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{newRequests}</p>
              <p className="text-xs text-gray-500 mt-1">Pending requests — click to open form</p>
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Manage money and full lists on{' '}
            <Link to="/dept-head/budget" className="text-red-900 hover:underline">
              Budget
            </Link>{' '}
            or{' '}
            <Link to="/dept-head/request-history" className="text-red-900 hover:underline">
              Request &amp; History
            </Link>
            .
          </p>

          <AnalyticsPanel
            requests={requests}
            budgetTotal={budgetTotal}
            subheading="Budget utilization, pipeline health, spend trend, and top categories for your college."
          />


          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold text-gray-900">Quick Links</h2>
            <div className="flex flex-wrap gap-3 mt-3">
              <Link to="/dept-head/budget" className="px-4 py-2 rounded-lg bg-red-900 text-white text-sm hover:bg-red-800">
                Open Budget
              </Link>
              <Link to="/dept-head/request-history" className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Open Requests & History
              </Link>
            </div>
          </div>

          <DashboardSummaryModal
            open={budgetSummaryOpen}
            onClose={() => setBudgetSummaryOpen(false)}
            title="College budget summary"
            filenameBase="college-admin-budget-summary"
            lines={[
              { label: 'College', value: handledCollege?.name || profile?.department || '—' },
              { label: 'Total allocation', value: `₱${budgetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: 'Committed (approved pipeline)', value: `₱${committed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
              { label: 'Remaining', value: `₱${budgetRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
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
