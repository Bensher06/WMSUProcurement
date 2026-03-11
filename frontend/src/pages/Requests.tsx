import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { requestsAPI } from '../lib/supabaseApi';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import type { RequestWithRelations, RequestStatus } from '../types/database';
import {
  Plus,
  Search,
  Filter,
  Loader2,
  Eye,
  Trash2,
  Send,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Requests = () => {
  const { canApprove } = useAuth();
  const location = useLocation();
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState((location.state as any)?.message || '');
  const [filterStatus, setFilterStatus] = useState<RequestStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRequests();
    // Clear location state
    window.history.replaceState({}, document.title);
  }, [filterStatus]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await requestsAPI.getMyRequests();
      setRequests(filterStatus ? data.filter(r => r.status === filterStatus) : data);
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (id: string) => {
    try {
      await requestsAPI.submit(id);
      setSuccess('Request submitted for approval');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    
    try {
      await requestsAPI.delete(id);
      setSuccess('Request deleted successfully');
      fetchRequests();
    } catch (err: any) {
      setError(err.message || 'Failed to delete request');
    }
  };

  const filteredRequests = requests.filter(req =>
    req.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.category?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statuses: (RequestStatus | '')[] = ['', 'Draft', 'Pending', 'Approved', 'Rejected', 'Ordered', 'Received', 'Completed'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-wmsu-black">My Requests</h1>
          <p className="text-base text-gray-500 mt-1">Manage your procurement requests</p>
        </div>
        <Link
          to="/requests/new"
          className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors font-medium flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Request
        </Link>
      </div>

      {/* Alerts */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as RequestStatus | '')}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
            >
              <option value="">All Statuses</option>
              {statuses.filter(s => s).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No requests found</p>
            <Link to="/requests/new" className="text-red-900 hover:text-red-800 mt-2 inline-block">
              Create your first request
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-wmsu-black">{request.item_name}</p>
                        {request.supplier && (
                          <p className="text-sm text-gray-500">{request.supplier.name}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{request.category?.name}</td>
                    <td className="px-6 py-4 text-gray-600">{request.quantity}</td>
                    <td className="px-6 py-4 font-medium text-wmsu-black">₱{request.total_price?.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">
                      {new Date(request.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/requests/${request.id}`}
                          className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {request.status === 'Draft' && (
                          <>
                            <button
                              onClick={() => handleSubmit(request.id)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Submit for Approval"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(request.id)}
                              className="p-2 text-[#98111E] hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Requests;

