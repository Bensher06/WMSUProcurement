import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestsAPI } from '../lib/supabaseApi';
import type { RequestWithRelations } from '../types/database';
import { Bell, Building2, Loader2, PlusCircle, Printer } from 'lucide-react';
import AnalyticsPanel from '../components/AnalyticsPanel';
import RequisitionViewModal from '../components/RequisitionViewModal';

export default function FacultyDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<RequestWithRelations | null>(null);
  const [cardHint, setCardHint] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await requestsAPI.getMyRequests();
        if (!mounted) return;
        setRequests(data);
      } catch {
        if (!mounted) return;
        setRequests([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const notifications = useMemo(
    () => requests.filter((r) => ['Rejected', 'ProcurementFailed'].includes(r.status)).length,
    [requests]
  );
  const newRequests = useMemo(
    () => requests.filter((r) => ['Draft', 'Pending'].includes(r.status)).length,
    [requests]
  );

  const firstNotificationRequest = useMemo(
    () => requests.find((r) => ['Rejected', 'ProcurementFailed'].includes(r.status)),
    [requests]
  );
  const firstPipelineRequest = useMemo(() => {
    const pending = requests.find((r) => r.status === 'Pending');
    if (pending) return pending;
    return requests.find((r) => r.status === 'Draft');
  }, [requests]);

  const openNotificationForm = () => {
    setCardHint('');
    if (!firstNotificationRequest) {
      setCardHint('No rejected or failed requests yet. Open Request & History when they appear.');
      return;
    }
    setViewing(firstNotificationRequest);
  };

  const openPipelineForm = () => {
    setCardHint('');
    if (!firstPipelineRequest) {
      setCardHint('No draft or pending request yet. Start one from New Request.');
      return;
    }
    setViewing(firstPipelineRequest);
  };

  return (
    <div className="space-y-6 print-dashboard-root">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Dashboard</h1>
          <p className="text-base text-gray-500 mt-1">Notifications and quick actions.</p>
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
            <div>
              <p className="text-sm text-gray-500">College</p>
              <p className="text-lg font-semibold text-gray-900 mt-1 inline-flex items-center gap-2">
                <Building2 className="w-5 h-5 text-red-900" />
                {profile?.department || 'Not set'}
              </p>
            </div>
            {profile?.faculty_department?.trim() ? (
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="text-base font-medium text-gray-900 mt-0.5">{profile.faculty_department}</p>
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <p className="text-xs text-gray-500 mt-1">Rejected / Procurement failed — click to open form (print / download)</p>
            </button>

            <button
              type="button"
              onClick={openPipelineForm}
              className="text-left w-full bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">New Request View</p>
                <PlusCircle className="w-5 h-5 text-red-900" />
              </div>
              <p className="text-xl font-bold text-gray-900 mt-2">{newRequests}</p>
              <p className="text-xs text-gray-500 mt-1">Draft / Pending — click to open form (print / download)</p>
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Need the full list?{' '}
            <Link to="/faculty/request-history" className="text-red-900 hover:underline">
              Request &amp; History
            </Link>{' '}
            ·{' '}
            <Link to="/faculty/new-request" className="text-red-900 hover:underline">
              New Request
            </Link>
          </p>

          <AnalyticsPanel
            requests={requests}
            subheading="A visual summary of your own procurement requests."
          />

          <RequisitionViewModal
            request={viewing}
            onClose={() => setViewing(null)}
            onRecorded={async () => {
              try {
                const data = await requestsAPI.getMyRequests();
                setRequests(data);
              } catch {
                /* keep list */
              }
            }}
          />
        </>
      )}
    </div>
  );
}
