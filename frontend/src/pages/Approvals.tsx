import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { requestsAPI, budgetsAPI } from '../lib/supabaseApi';
import StatusBadge from '../components/StatusBadge';
import type { RequestWithRelations, Budget } from '../types/database';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  AlertTriangle,
  Clock
} from 'lucide-react';

const Approvals = () => {
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rejectModal, setRejectModal] = useState<{ show: boolean; id: string | null; reason: string }>({ 
    show: false, 
    id: null, 
    reason: '' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [requestsData, budgetData] = await Promise.all([
        requestsAPI.getPending(),
        budgetsAPI.getCurrent()
      ]);
      setRequests(requestsData);
      setBudget(budgetData);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setError('');
    
    try {
      await requestsAPI.approve(id);
      setSuccess('Request approved successfully');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.id) return;
    
    setActionLoading(rejectModal.id);
    setError('');
    
    try {
      await requestsAPI.reject(rejectModal.id, rejectModal.reason);
      setSuccess('Request rejected');
      setRejectModal({ show: false, id: null, reason: '' });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setActionLoading(null);
    }
  };

  const wouldExceedBudget = (totalPrice: number) => {
    return budget && totalPrice > budget.remaining_amount;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-wmsu-black">Pending Approvals</h1>
          <p className="text-base text-gray-500 mt-1">Review and approve procurement requests</p>
        </div>
        {budget && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Available Budget</p>
            <p className="text-xl font-bold text-red-900">₱{budget.remaining_amount.toLocaleString()}</p>
          </div>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No pending requests to approve</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div 
              key={request.id}
              className={`bg-white rounded-xl shadow-sm border p-6 ${
                wouldExceedBudget(request.total_price) 
                  ? 'border-orange-200 bg-orange-50/30' 
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-wmsu-black">{request.item_name}</h3>
                    <StatusBadge status={request.status} size="sm" />
                    {wouldExceedBudget(request.total_price) && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Exceeds Budget
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Requester</p>
                      <p className="font-medium text-wmsu-black">{request.requester?.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium text-wmsu-black">{request.category?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-medium text-wmsu-black">{request.quantity} units</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Unit Price</p>
                      <p className="font-medium text-wmsu-black">₱{request.unit_price.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="font-bold text-lg text-wmsu-black">₱{request.total_price?.toLocaleString()}</p>
                    </div>
                  </div>

                  {request.description && (
                    <p className="text-sm text-gray-600 mt-3">{request.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <span className="text-sm text-gray-500">
                  Submitted {new Date(request.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/requests/${request.id}`}
                    className="px-4 py-2 text-gray-600 hover:text-wmsu-black hover:bg-gray-100 rounded-lg font-medium flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Link>
                  <button
                    onClick={() => setRejectModal({ show: true, id: request.id, reason: '' })}
                    disabled={actionLoading === request.id}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={actionLoading === request.id || wouldExceedBudget(request.total_price)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={wouldExceedBudget(request.total_price) ? 'Budget exceeded' : ''}
                  >
                    {actionLoading === request.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-wmsu-black mb-4">Reject Request</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason for rejecting this request.</p>
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Enter reason for rejection..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
              rows={4}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setRejectModal({ show: false, id: null, reason: '' })}
                className="px-4 py-2 text-gray-600 hover:text-wmsu-black"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!!actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;

