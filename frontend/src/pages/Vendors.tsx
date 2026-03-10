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
  Clock
} from 'lucide-react';

const Vendors = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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
        {filteredSuppliers.map((supplier) => (
          <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between mb-4">
              {supplier.image_url ? (
                <img
                  src={supplier.image_url}
                  alt={supplier.name}
                  className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-red-900" />
                </div>
              )}
              <div className="flex flex-col items-end gap-2">
                {getStatusBadge(supplier.status || 'Pending')}
                <div className="flex items-center gap-1">
                  {supplier.status !== 'Qualified' && (
                    <button
                      onClick={() => handleQualify(supplier.id)}
                      className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                      title="Qualify Supplier"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDisqualify(supplier.id)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Disqualify Supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-wmsu-black mb-3">{supplier.name}</h3>

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
                  <User className="w-4 h-4" />
                  <span>{supplier.contact_person}</span>
                </div>
              )}
              {supplier.contact_number && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{supplier.contact_number}</span>
                </div>
              )}
              {supplier.email && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="break-all">{supplier.email}</span>
                </div>
              )}
              {supplier.address && (
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>{supplier.address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
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
