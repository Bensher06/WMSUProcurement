import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { requestsAPI, commentsAPI, activityAPI, budgetsAPI, profilesAPI, suppliersAPI } from '../lib/supabaseApi';
import { useAuth } from '../context/AuthContext';
import StatusBadge, { StatusDot } from '../components/StatusBadge';
import type { RequestWithRelations, CommentWithAuthor, ActivityWithActor, Budget, Profile, Supplier } from '../types/database';
import {
  ArrowLeft,
  Package,
  Building2,
  FolderOpen,
  User,
  Calendar,
  DollarSign,
  Hash,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Truck,
  CheckSquare,
  Send,
  MessageSquare,
  Clock,
  UserPlus,
  Award,
  FileImage,
  Download,
  ChevronRight,
  Wallet,
  AlertTriangle,
  X,
  Phone,
  Mail,
  MapPin,
  Pencil,
  Save
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const RequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, canApprove } = useAuth();
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  const [request, setRequest] = useState<RequestWithRelations | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [activities, setActivities] = useState<ActivityWithActor[]>([]);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [approvers, setApprovers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [delegateTo, setDelegateTo] = useState('');
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [negotiateNotes, setNegotiateNotes] = useState('');
  const [showDeliveringModal, setShowDeliveringModal] = useState(false);
  const [deliveringBidWinnerId, setDeliveringBidWinnerId] = useState('');
  const [deliveringNotes, setDeliveringNotes] = useState('');
  const [deliveringAttachmentFile, setDeliveringAttachmentFile] = useState<File | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [editForm, setEditForm] = useState({ item_name: '', description: '', quantity: 1, unit_price: '' });
  const [saveEditLoading, setSaveEditLoading] = useState(false);

  useEffect(() => {
    if (id) fetchAllData();
  }, [id]);

  useEffect(() => {
    if (!loading && !request && id) navigate('/requests', { replace: true });
  }, [loading, request, id, navigate]);

  const fetchAllData = async () => {
    try {
      const [requestData, commentsData, activitiesData, budgetData] = await Promise.all([
        requestsAPI.getById(id!),
        commentsAPI.getByRequestId(id!).catch(() => []),
        activityAPI.getByRequestId(id!).catch(() => []),
        budgetsAPI.getCurrentWithCommitted()
      ]);
      setRequest(requestData);
      setComments(commentsData);
      setActivities(activitiesData);
      setBudget(budgetData);
      
      // Fetch potential approvers (DeptHead and Admin)
      const allProfiles = await profilesAPI.getAll();
      setApprovers(allProfiles.filter(p => p.role === 'DeptHead' || p.role === 'Admin'));
      // Fetch suppliers for bid winner dropdown (admin only, when needed)
      const suppliersList = await suppliersAPI.getAll();
      setSuppliers(suppliersList);
    } catch (err: any) {
      setError(err.message || 'Failed to load request details');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    setActionLoading(true);
    setError('');
    
    try {
      switch (action) {
        case 'approve':
          await requestsAPI.approve(id!);
          break;
        case 'reject':
          await requestsAPI.reject(id!, rejectReason);
          setShowRejectModal(false);
          setRejectReason('');
          break;
        case 'delegate':
          await requestsAPI.delegate(id!, delegateTo);
          setShowDelegateModal(false);
          setDelegateTo('');
          break;
        case 'negotiate':
          await requestsAPI.setNegotiating(id!, negotiateNotes || undefined);
          setShowNegotiateModal(false);
          setNegotiateNotes('');
          break;
        case 'agree':
          await requestsAPI.agreeToProceed(id!);
          break;
        case 'order':
          await requestsAPI.markOrdered(id!);
          break;
        case 'receive':
          await requestsAPI.markReceived(id!);
          break;
        case 'delivering': {
          let attachmentUrl: string | null = null;
          if (deliveringAttachmentFile) attachmentUrl = await requestsAPI.uploadDeliveryAttachment(id!, deliveringAttachmentFile);
          await requestsAPI.markDelivering(id!, {
            bid_winner_supplier_id: deliveringBidWinnerId || null,
            delivery_notes: deliveringNotes.trim() || null,
            delivery_attachment_url: attachmentUrl
          });
          setShowDeliveringModal(false);
          setDeliveringBidWinnerId('');
          setDeliveringNotes('');
          setDeliveringAttachmentFile(null);
          break;
        }
        case 'complete':
          await requestsAPI.markCompleted(id!);
          break;
      }
      fetchAllData();
    } catch (err: any) {
      setError(err.message || `Failed to ${action} request`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setCommentLoading(true);
    try {
      const comment = await commentsAPI.create(id!, newComment.trim());
      setComments(prev => [...prev, comment]);
      setNewComment('');
      setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
  };

  const getActivityDescription = (activity: ActivityWithActor) => {
    const actorName = activity.actor?.full_name || 'System';
    const details = activity.details as Record<string, any> || {};

    switch (activity.action) {
      case 'created':
        return `${actorName} created this request`;
      case 'status_changed':
        return `${actorName} changed status from ${details.from} to ${details.to}`;
      case 'delegated':
        return `${actorName} delegated this request`;
      default:
        return `${actorName} performed ${activity.action}`;
    }
  };

  // Calculate budget impact
  const budgetImpact = budget && request ? {
    percentage: ((request.total_price / budget.remaining_amount) * 100).toFixed(1),
    remaining: budget.remaining_amount,
    afterApproval: budget.remaining_amount - request.total_price,
    exceeds: request.total_price > budget.remaining_amount
  } : null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin mx-auto" />
          <p className="mt-3 text-slate-500">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (!request) {
    return null;
  }

  return (
    <div className="min-h-screen -m-8 bg-slate-50">
      {/* Sticky Header with Actions */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-wmsu-black">{request.item_name}</h1>
                  <StatusBadge status={request.status} size="sm" />
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  Request #{request.id.slice(0, 8)} • {formatRelativeTime(request.created_at)}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {canApprove() && (
              <div className="flex items-center gap-2">
                {request.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => setShowDelegateModal(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <UserPlus className="w-4 h-4" />
                      Delegate
                    </button>
                    <button
                      onClick={() => setShowNegotiateModal(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Negotiate
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={actionLoading || budgetImpact?.exceeds}
                      className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                  </>
                )}

                {request.status === 'Approved' && (
                  <button
                    onClick={() => handleAction('order')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Mark as Gathering supplies
                  </button>
                )}

                {request.status === 'Ordered' && (
                  <button
                    onClick={() => setShowDeliveringModal(true)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <Truck className="w-4 h-4" />
                    Mark as Delivering
                  </button>
                )}

                {request.status === 'Received' && canApprove() && (
                  <button
                    onClick={() => handleAction('complete')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Complete
                  </button>
                )}
              </div>
            )}
            {/* Faculty actions: Negotiating (edit + agree) and Delivering (confirm received) */}
            {!canApprove() && request.requester_id === profile?.id && (
              <div className="flex items-center gap-2 flex-wrap">
                {request.status === 'Negotiating' && (
                  <>
                    <button
                      onClick={() => {
                        setEditForm({
                          item_name: request.item_name,
                          description: request.description || '',
                          quantity: request.quantity,
                          unit_price: String(request.unit_price)
                        });
                        setIsEditingRequest(true);
                      }}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit request
                    </button>
                    <button
                      onClick={() => handleAction('agree')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      I agree to proceed
                    </button>
                  </>
                )}
                {request.status === 'Received' && (
                  <button
                    onClick={() => handleAction('complete')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckSquare className="w-4 h-4" />}
                    Confirm I received the supplies
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <CenteredAlert error={error || undefined} success={undefined} onClose={() => setError('')} />

      {/* Main Content - Split Screen Layout */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column - Request Details (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Budget Impact Card */}
            {budgetImpact && request.status === 'Pending' && (
              <div className={`rounded-xl p-4 ${budgetImpact.exceeds ? 'bg-rose-50 border border-rose-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${budgetImpact.exceeds ? 'bg-rose-100' : 'bg-red-100'}`}>
                    <Wallet className={`w-5 h-5 ${budgetImpact.exceeds ? 'text-rose-600' : 'text-red-900'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${budgetImpact.exceeds ? 'text-rose-800' : 'text-indigo-800'}`}>
                      {budgetImpact.exceeds ? 'Budget Exceeded!' : 'Budget Impact'}
                    </p>
                    <p className={`text-sm ${budgetImpact.exceeds ? 'text-rose-600' : 'text-red-900'}`}>
                      {budgetImpact.exceeds 
                        ? `This request exceeds the remaining budget by ₱${(request.total_price - budgetImpact.remaining).toLocaleString()}`
                        : `If approved, this will use ${budgetImpact.percentage}% of your remaining ₱${budgetImpact.remaining.toLocaleString()} budget`
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${budgetImpact.exceeds ? 'text-rose-700' : 'text-red-800'}`}>
                      ₱{request.total_price.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500">Request total</p>
                  </div>
                </div>
              </div>
            )}

            {/* Rejection Reason */}
            {request.status === 'Rejected' && request.rejection_reason && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-rose-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-rose-800">Request Rejected</p>
                    <p className="text-rose-700 mt-1">{request.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Negotiation requested (faculty sees this when status is Negotiating) */}
            {request.status === 'Negotiating' && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-800">Admin requested negotiation</p>
                    {request.negotiating_notes && (
                      <p className="text-orange-700 mt-1">{request.negotiating_notes}</p>
                    )}
                    <p className="text-sm text-orange-600 mt-2">If you agree, click &quot;I agree to proceed&quot; above so the request returns to the admin for approval.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Delivery confirmation (bid winner + details + attachment – faculty sees when status is Delivering/Received) */}
            {request.status === 'Received' && (request.bid_winner_supplier || request.delivery_notes || request.delivery_attachment_url) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-800">Delivery confirmation</p>
                    {request.bid_winner_supplier && (
                      <p className="text-blue-700 mt-1">
                        <span className="font-medium">Bid winner: </span>
                        {request.bid_winner_supplier.name}
                      </p>
                    )}
                    {request.delivery_notes && (
                      <p className="text-blue-700 mt-2 whitespace-pre-wrap">{request.delivery_notes}</p>
                    )}
                    {request.delivery_attachment_url && (
                      <p className="mt-2">
                        <a href={request.delivery_attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline font-medium">
                          View attachment
                        </a>
                      </p>
                    )}
                    {!canApprove() && request.requester_id === profile?.id && (
                      <p className="text-sm text-blue-600 mt-2">Once you receive the supplies, click &quot;Confirm I received the supplies&quot; above to complete the request.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Item Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-wmsu-black">Request Details</h2>
                {isEditingRequest && (
                  <span className="text-sm text-amber-700 font-medium">Editing — save or cancel below</span>
                )}
              </div>
              <div className="p-6">
                {isEditingRequest ? (
                  /* Faculty edit form (when status is Negotiating) */
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const qty = Math.max(1, Math.floor(Number(editForm.quantity)) || 1);
                      const price = Math.max(0, parseFloat(editForm.unit_price) || 0);
                      if (!editForm.item_name.trim()) {
                        setError('Item name is required');
                        return;
                      }
                      setSaveEditLoading(true);
                      setError('');
                      try {
                        const updated = await requestsAPI.update(id!, {
                          item_name: editForm.item_name.trim(),
                          description: editForm.description.trim() || null,
                          quantity: qty,
                          unit_price: price,
                          total_price: qty * price
                        });
                        setRequest((prev) => (prev ? { ...prev, ...updated } : null));
                        setIsEditingRequest(false);
                      } catch (err: any) {
                        setError(err?.message || 'Failed to save changes');
                      } finally {
                        setSaveEditLoading(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Item name *</label>
                      <input
                        type="text"
                        value={editForm.item_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, item_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                        <input
                          type="number"
                          min={1}
                          value={editForm.quantity}
                          onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Unit price (₱) *</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editForm.unit_price}
                          onChange={(e) => setEditForm((f) => ({ ...f, unit_price: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-slate-500">
                      Total: ₱{((Math.max(1, Math.floor(Number(editForm.quantity)) || 1) * (parseFloat(editForm.unit_price) || 0)).toLocaleString()}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={saveEditLoading}
                        className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 font-medium flex items-center gap-2 disabled:opacity-50"
                      >
                        {saveEditLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingRequest(false)}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {/* Price Summary */}
                    <div className="bg-slate-50 rounded-xl p-5 mb-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-slate-500">Quantity</p>
                          <p className="text-xl font-bold text-wmsu-black">{request.quantity}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Unit Price</p>
                          <p className="text-xl font-bold text-wmsu-black">₱{request.unit_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Total Amount</p>
                          <p className="text-2xl font-bold text-red-900">₱{request.total_price.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-violet-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FolderOpen className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Category</p>
                          <p className="font-medium text-wmsu-black">{request.category?.name || 'Not specified'}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Requester</p>
                          <p className="font-medium text-wmsu-black">{request.requester?.full_name}</p>
                          <p className="text-sm text-slate-400">{request.requester?.email}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Submitted</p>
                          <p className="font-medium text-wmsu-black">{formatDate(request.created_at)}</p>
                        </div>
                      </div>

                      {request.delegated_to_profile && (
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-5 h-5 text-red-900" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Delegated To</p>
                            <p className="font-medium text-wmsu-black">{request.delegated_to_profile.full_name}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {request.description && (
                      <div className="mt-6 pt-6 border-t border-slate-100">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-500">Description</p>
                            <p className="text-slate-700 mt-1 leading-relaxed">{request.description}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Vendor Information Card */}
            {request.supplier && (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-wmsu-black flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-slate-400" />
                    Vendor Information
                  </h2>
                </div>
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-7 h-7 text-red-900" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-wmsu-black">{request.supplier.name}</h3>
                      <div className="mt-3 space-y-2">
                        {request.supplier.contact_person && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <User className="w-4 h-4 text-slate-400" />
                            {request.supplier.contact_person}
                          </div>
                        )}
                        {request.supplier.contact_number && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Phone className="w-4 h-4 text-slate-400" />
                            {request.supplier.contact_number}
                          </div>
                        )}
                        {request.supplier.email && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail className="w-4 h-4 text-slate-400" />
                            {request.supplier.email}
                          </div>
                        )}
                        {request.supplier.address && (
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            {request.supplier.address}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quotation Preview (Placeholder) */}
            {request.quotation_url ? (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-wmsu-black flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-slate-400" />
                    Quotation Document
                  </h2>
                  <button className="text-red-900 hover:text-red-800 text-sm font-medium flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <div className="p-6">
                  <div className="bg-slate-100 rounded-lg aspect-[4/3] flex items-center justify-center">
                    <div className="text-center">
                      <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">Preview not available</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 border-dashed overflow-hidden">
                <div className="p-8 text-center">
                  <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No quotation document attached</p>
                  <p className="text-sm text-slate-400 mt-1">The requester hasn't uploaded a quotation file</p>
                </div>
              </div>
            )}

            {/* Questions & Comments Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-lg font-semibold text-wmsu-black flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-slate-400" />
                  Questions & Comments
                </h2>
              </div>
              <div className="p-6">
                {/* Comments Thread */}
                <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
                  {comments.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No comments yet</p>
                      <p className="text-slate-400 text-xs mt-1">Start a conversation about this request</p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-semibold text-red-900">
                            {comment.author?.full_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="bg-slate-50 rounded-lg rounded-tl-none px-4 py-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm text-wmsu-black">
                                {comment.author?.full_name}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatRelativeTime(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-slate-600 text-sm">{comment.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Comment Input */}
                <form onSubmit={handleAddComment} className="flex gap-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-red-900">
                      {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Ask a question or add a comment..."
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={commentLoading || !newComment.trim()}
                      className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {commentLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* Right Column - Activity Timeline (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h2 className="text-lg font-semibold text-wmsu-black flex items-center gap-2">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Activity Timeline
                  </h2>
                </div>
                <div className="p-5">
                  {activities.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No activity recorded</p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-200" />
                      
                      <div className="space-y-6">
                        {activities.map((activity, index) => (
                          <div key={activity.id} className="relative flex gap-4">
                            {/* Timeline dot */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                              index === 0 ? 'bg-red-100' : 'bg-white border-2 border-slate-200'
                            }`}>
                              {activity.action === 'created' && (
                                <Package className={`w-4 h-4 ${index === 0 ? 'text-red-900' : 'text-slate-400'}`} />
                              )}
                              {activity.action === 'status_changed' && (
                                <ChevronRight className={`w-4 h-4 ${index === 0 ? 'text-red-900' : 'text-slate-400'}`} />
                              )}
                              {activity.action === 'delegated' && (
                                <UserPlus className={`w-4 h-4 ${index === 0 ? 'text-red-900' : 'text-slate-400'}`} />
                              )}
                            </div>
                            
                            <div className="flex-1 pb-2">
                              <p className="text-sm text-slate-700">{getActivityDescription(activity)}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {formatRelativeTime(activity.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-wmsu-black">Reject Request</h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Please provide a reason for rejecting this procurement request. This will be visible to the requester.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 resize-none"
                rows={4}
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-wmsu-black font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('reject')}
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-wmsu-black">Delegate Request</h3>
              <button
                onClick={() => setShowDelegateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Select another approver to review and act on this request.
              </p>
              <select
                value={delegateTo}
                onChange={(e) => setDelegateTo(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
              >
                <option value="">Select an approver...</option>
                {approvers
                  .filter(a => a.id !== profile?.id)
                  .map(approver => (
                    <option key={approver.id} value={approver.id}>
                      {approver.full_name} ({approver.role})
                    </option>
                  ))
                }
              </select>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => setShowDelegateModal(false)}
                className="px-4 py-2 text-slate-600 hover:text-wmsu-black font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('delegate')}
                disabled={actionLoading || !delegateTo}
                className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Delegate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Negotiate Modal */}
      {showNegotiateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-wmsu-black">Request negotiation</h3>
              <button onClick={() => setShowNegotiateModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">The faculty will be notified. You can add an optional note.</p>
              <textarea
                value={negotiateNotes}
                onChange={(e) => setNegotiateNotes(e.target.value)}
                placeholder="Optional note to faculty..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 resize-none"
                rows={3}
              />
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setShowNegotiateModal(false)} className="px-4 py-2 text-slate-600 hover:text-wmsu-black font-medium">Cancel</button>
              <button
                onClick={() => handleAction('negotiate')}
                disabled={actionLoading}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Send for negotiation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark as Delivering Modal (bid winner + confirmation details) */}
      {showDeliveringModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-wmsu-black">Mark as Delivering</h3>
              <button onClick={() => setShowDeliveringModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600">Confirm delivery to faculty: add the bid winner and any details to send to the requester.</p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bid winner (optional)</label>
                <select
                  value={deliveringBidWinnerId}
                  onChange={(e) => setDeliveringBidWinnerId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
                >
                  <option value="">Select supplier...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Details for faculty (optional)</label>
                <textarea
                  value={deliveringNotes}
                  onChange={(e) => setDeliveringNotes(e.target.value)}
                  placeholder="Request details, delivery info, etc."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 resize-none"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Attachment (optional)</label>
                <label className="flex flex-col gap-2 cursor-pointer group">
                  <span className="inline-flex items-center gap-2 px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium transition-all duration-200 cursor-pointer group-hover:bg-red-50 group-hover:border-red-200 group-hover:text-red-900 group-hover:shadow-sm min-w-0 max-w-full truncate" title={deliveringAttachmentFile?.name}>
                    {deliveringAttachmentFile?.name ?? 'Choose file'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={(e) => setDeliveringAttachmentFile(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                  {!deliveringAttachmentFile && (
                    <p className="text-xs text-slate-400">PDF, DOC, JPG, PNG (optional)</p>
                  )}
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => { setShowDeliveringModal(false); setDeliveringAttachmentFile(null); }} className="px-4 py-2 text-slate-600 hover:text-wmsu-black font-medium">Cancel</button>
              <button
                onClick={() => handleAction('delivering')}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                Mark as Delivering
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestDetail;

