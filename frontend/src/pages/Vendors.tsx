import { useState, useEffect } from 'react';
import { suppliersAPI } from '../lib/supabaseApi';
import type { Supplier } from '../types/database';
import {
  Loader2,
  Trash2,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink
} from 'lucide-react';

const Vendors = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await suppliersAPI.getAll();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleQualify = async (id: string) => {
    if (!confirm('Are you sure you want to qualify this supplier?')) return;
    
    try {
      await suppliersAPI.update(id, { status: 'Qualified' });
      setSuccess('Supplier qualified successfully');
      fetchSuppliers();
    } catch (err: any) {
      setError(err.message || 'Failed to qualify supplier');
    }
  };

  const handleDisqualify = async (id: string) => {
    if (!confirm('Are you sure you want to disqualify this supplier? This will remove them from the system.')) return;
    
    try {
      await suppliersAPI.delete(id);
      setSuccess('Supplier disqualified and removed successfully');
      fetchSuppliers();
    } catch (err: any) {
      setError(err.message || 'Failed to disqualify supplier');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      Pending: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        icon: Clock,
        label: 'Pending'
      },
      Qualified: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        icon: CheckCircle,
        label: 'Qualified'
      },
      Disqualified: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        icon: XCircle,
        label: 'Disqualified'
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.Pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-wmsu-black">Suppliers</h1>
          <p className="text-base text-gray-500 mt-1">View and manage supplier qualifications</p>
        </div>
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
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map((supplier) => {
          const isExpanded = expandedId === supplier.id;
          return (
            <div
              key={supplier.id}
              role="button"
              tabIndex={0}
              onClick={() => setExpandedId(isExpanded ? null : supplier.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedId(isExpanded ? null : supplier.id);
                }
              }}
              className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 p-6 ${isExpanded ? 'ring-2 ring-red-500 ring-offset-2' : 'border-gray-100'}`}
              aria-expanded={isExpanded}
              aria-label={`${supplier.name}, ${supplier.status || 'Pending'}. Click to ${isExpanded ? 'collapse' : 'expand'} details`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col items-start gap-1.5">
                  <span className="text-xs font-medium text-gray-500">Company logo</span>
                  {supplier.image_url && !imageErrors.has(supplier.id) ? (
                    <img
                      src={supplier.image_url}
                      alt={`${supplier.name} company logo`}
                      className={`rounded-lg object-cover object-center border-2 border-gray-200 bg-gray-50 shrink-0 ${isExpanded ? 'w-24 h-24 sm:w-32 sm:h-32' : 'w-16 h-16'}`}
                      loading="eager"
                      decoding="async"
                      onError={() => setImageErrors((prev) => new Set(prev).add(supplier.id))}
                    />
                  ) : (
                    <div
                      className={`bg-red-100 rounded-lg flex flex-col items-center justify-center shrink-0 ${isExpanded ? 'w-24 h-24 sm:w-32 sm:h-32' : 'w-16 h-16'}`}
                      title={supplier.image_url && imageErrors.has(supplier.id) ? 'Logo could not be loaded (check storage)' : 'No logo uploaded'}
                    >
                      <Building2 className="w-8 h-8 text-red-900" />
                      {isExpanded && (
                        <span className="text-[10px] text-red-800 mt-1 px-1 text-center">
                          {supplier.image_url && imageErrors.has(supplier.id) ? 'Logo unavailable' : 'No logo uploaded'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
                  {getStatusBadge(supplier.status || 'Pending')}
                  <div className="flex items-center gap-1">
                    {supplier.status !== 'Qualified' && (
                      <button
                        type="button"
                        onClick={() => handleQualify(supplier.id)}
                        className="p-2.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                        title="Qualify Supplier"
                        aria-label="Qualify supplier"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDisqualify(supplier.id)}
                      className="p-2.5 text-[#98111E] hover:bg-red-50 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      title="Disqualify Supplier"
                      aria-label="Disqualify supplier"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-wmsu-black mb-3 flex items-center gap-2">
                {supplier.name}
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </h3>

              {supplier.category && (
                <div className="mb-3">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {supplier.category}
                  </span>
                </div>
              )}

              <div className="space-y-2 text-sm">
                {supplier.contact_person && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4 shrink-0" />
                    <span>{supplier.contact_person}</span>
                  </div>
                )}
                {supplier.contact_number && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4 shrink-0" />
                    <a
                      href={`tel:${supplier.contact_number.replace(/\s/g, '')}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-red-900 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                    >
                      {supplier.contact_number}
                    </a>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="w-4 h-4 shrink-0" />
                    <a
                      href={`mailto:${supplier.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-red-900 hover:text-red-700 hover:underline break-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                    >
                      {supplier.email}
                    </a>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{supplier.address}</span>
                  </div>
                )}
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                  {supplier.image_url && !imageErrors.has(supplier.id) && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Image uploaded at registration</p>
                      <a
                        href={supplier.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block rounded-lg overflow-hidden border border-gray-200 bg-gray-50 max-w-xs"
                      >
                        <img
                          src={supplier.image_url}
                          alt={`${supplier.name} uploaded image`}
                          className="w-full h-40 object-contain"
                          onError={() => setImageErrors((prev) => new Set(prev).add(supplier.id))}
                        />
                      </a>
                    </div>
                  )}
                  {Array.isArray(supplier.portfolio_urls) && supplier.portfolio_urls.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Attached files (portfolio)</p>
                      <ul className="space-y-1.5">
                        {supplier.portfolio_urls.map((url, i) => (
                          <li key={i}>
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-sm text-red-900 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded"
                            >
                              <FileText className="w-4 h-4 shrink-0" />
                              <span>Document {i + 1}</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(supplier.tin_number || supplier.business_registration_no || supplier.business_type) && (
                    <div className="space-y-1.5 text-xs">
                      <p className="font-medium text-gray-600">Business credentials</p>
                      {supplier.tin_number && <p><span className="text-gray-500">TIN:</span> {supplier.tin_number}</p>}
                      {supplier.business_registration_no && <p><span className="text-gray-500">DTI/SEC:</span> {supplier.business_registration_no}</p>}
                      {supplier.business_type && <p><span className="text-gray-500">Type:</span> {supplier.business_type}</p>}
                    </div>
                  )}
                  <div className="space-y-2 text-xs text-gray-500">
                    <p>Submitted: {formatDate(supplier.created_at)}</p>
                    <p>Last updated: {formatDate(supplier.updated_at)}</p>
                    <p className="font-mono text-gray-400">ID: {supplier.id}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No suppliers found</p>
        </div>
      )}
    </div>
  );
};

export default Vendors;
