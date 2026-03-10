import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { requestsAPI } from '../lib/supabaseApi';
import StatusBadge from '../components/StatusBadge';
import type { RequestWithRelations } from '../types/database';
import { Loader2, Eye, Calendar, Package, User } from 'lucide-react';

const History = () => {
  const { canApprove } = useAuth();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [canApprove]);

  const fetchHistory = async () => {
    try {
      // Admin/DeptHead: all users' requests. Faculty: only current user's own requests.
      const data = canApprove()
        ? await requestsAPI.getAll()
        : await requestsAPI.getMyRequests();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load request history');
      console.error(err);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-wmsu-black">Request History</h1>
        <p className="text-base text-gray-500 mt-1">
          {canApprove()
            ? 'History of requests submitted by users to admin'
            : 'Your own request history only—other users\' requests are not shown.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">
            {canApprove() ? 'No requests have been submitted by users yet.' : 'No requests found'}
          </p>
          {!canApprove() && (
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-900 text-white text-sm font-medium rounded-lg hover:bg-red-800 transition-colors"
            >
              Create your first request
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div 
              key={request.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="text-lg font-semibold text-wmsu-black">{request.item_name}</h3>
                    <StatusBadge status={request.status} size="sm" />
                    {canApprove() && request.requester && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md">
                        <User className="w-4 h-4 text-gray-500" />
                        {request.requester.full_name}
                        {request.requester.email && (
                          <span className="text-gray-400 text-xs">({request.requester.email})</span>
                        )}
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-500">Category</p>
                      <p className="font-medium text-wmsu-black">{request.category?.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-medium text-wmsu-black">{request.quantity} units</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Price</p>
                      <p className="font-medium text-wmsu-black">₱{request.total_price?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium text-wmsu-black flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {request.description && (
                    <p className="text-sm text-gray-600 mt-3 line-clamp-2">{request.description}</p>
                  )}

                  {request.status === 'Rejected' && request.rejection_reason && (
                    <div className="mt-3 p-3 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">
                        <span className="font-medium">Rejection Reason:</span> {request.rejection_reason}
                      </p>
                    </div>
                  )}
                </div>

                <Link
                  to={`/requests/${request.id}`}
                  className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Eye className="w-5 h-5" />
                </Link>
              </div>

              {/* Timeline */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span>Created: {new Date(request.created_at).toLocaleString()}</span>
                  {request.approved_at && (
                    <>
                      <span>•</span>
                      <span>Reviewed: {new Date(request.approved_at).toLocaleString()}</span>
                    </>
                  )}
                  {request.ordered_at && (
                    <>
                      <span>•</span>
                      <span>Ordered: {new Date(request.ordered_at).toLocaleString()}</span>
                    </>
                  )}
                  {request.completed_at && (
                    <>
                      <span>•</span>
                      <span>Completed: {new Date(request.completed_at).toLocaleString()}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;

