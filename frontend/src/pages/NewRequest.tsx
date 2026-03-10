import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestsAPI, budgetsAPI } from '../lib/supabaseApi';
import type { Budget, RequestStatus } from '../types/database';
import { 
  Package, 
  FileText, 
  DollarSign, 
  Hash, 
  Loader2,
  AlertTriangle,
  Save,
  Send
} from 'lucide-react';

const NewRequest = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState('');
  const [budgetWarning, setBudgetWarning] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    quantity: 1,
    unit_price: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const budgetData = await budgetsAPI.getCurrent();
      setBudget(budgetData);
    } catch (err: any) {
      setError(err.message || 'Failed to load form data');
      console.error(err);
    }
  };

  const totalPrice = (formData.quantity || 0) * (parseFloat(formData.unit_price) || 0);

  useEffect(() => {
    if (budget && totalPrice > budget.remaining_amount) {
      setBudgetWarning(`This request (₱${totalPrice.toLocaleString()}) exceeds the remaining budget (₱${budget.remaining_amount.toLocaleString()})`);
    } else {
      setBudgetWarning(null);
    }
  }, [totalPrice, budget]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (status: RequestStatus) => {
    setError('');
    setLoading(true);

    try {
      if (!formData.item_name || !formData.quantity || !formData.unit_price) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      await requestsAPI.create({
        item_name: formData.item_name,
        description: formData.description || undefined,
        quantity: parseInt(formData.quantity.toString()),
        unit_price: parseFloat(formData.unit_price),
        status
      });

      navigate('/requests', { 
        state: { message: `Request ${status === 'Draft' ? 'saved as draft' : 'submitted'} successfully` }
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-wmsu-black">New Procurement Request</h1>
        <p className="text-base text-gray-500 mt-1">Fill in the details for your procurement request</p>
      </div>

      {/* Budget Info */}
      {budget && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-900 font-medium">Available Budget ({budget.academic_year})</p>
              <p className="text-2xl font-bold text-red-800">₱{budget.remaining_amount.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-red-900">Request Total</p>
              <p className="text-2xl font-bold text-red-800">₱{totalPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Budget Warning */}
      {budgetWarning && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0" />
          <p className="text-sm text-orange-700">{budgetWarning}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
          {error}
        </div>
      )}

      <form className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
        {/* Item Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Package className="w-4 h-4 inline mr-2" />
            Item Name *
          </label>
          <input
            type="text"
            name="item_name"
            value={formData.item_name}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
            placeholder="e.g., Laptop Computer, Printer Paper"
            required
          />
        </div>

        {/* Quantity & Unit Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-2" />
              Quantity *
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              min="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-2" />
              Unit Price (₱) *
            </label>
            <input
              type="number"
              name="unit_price"
              value={formData.unit_price}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FileText className="w-4 h-4 inline mr-2" />
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600"
            placeholder="Add any additional details about the item..."
          />
        </div>

        {/* Total */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Total Price:</span>
            <span className="text-2xl font-bold text-wmsu-black">₱{totalPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="px-6 py-2.5 text-gray-600 hover:text-wmsu-black font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('Draft')}
            disabled={loading}
            className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('Pending')}
            disabled={loading || !!budgetWarning}
            className="px-6 py-2.5 bg-red-900 hover:bg-red-800 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Submit for Approval
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewRequest;

