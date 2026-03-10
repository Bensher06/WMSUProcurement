import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { budgetsAPI, budgetFundSourcesAPI } from '../lib/supabaseApi';
import { useAuth } from '../context/AuthContext';
import type { Budget as BudgetType } from '../types/database';
import {
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  AlertCircle,
  X,
  Info
} from 'lucide-react';

const Budget = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [currentBudget, setCurrentBudget] = useState<BudgetType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    academic_year: '',
    total_amount: '',
    funds_for: '',
    source: '',
    date_received: '',
    span: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [budgetsData, currentData] = await Promise.all([
        budgetsAPI.getAll(),
        budgetsAPI.getCurrent()
      ]);
      setBudgets(budgetsData);
      setCurrentBudget(currentData);
    } catch (err: any) {
      setError(err.message || 'Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const amount = parseFloat(formData.total_amount);
    try {
      const hasFundSource =
        formData.funds_for.trim() ||
        formData.source.trim() ||
        formData.date_received ||
        formData.span.trim();

      const newBudget = await budgetsAPI.create({
        academic_year: formData.academic_year,
        total_amount: amount
      });

      if (hasFundSource) {
        await budgetFundSourcesAPI.create({
          budget_id: newBudget.id,
          amount,
          funds_for: formData.funds_for.trim() || null,
          source: formData.source.trim() || null,
          date_received: formData.date_received || null,
          span: formData.span.trim() || null
        });
      }

      setSuccess('Budget added. It appears in the history list below.');
      setShowModal(false);
      setFormData({
        academic_year: '',
        total_amount: '',
        funds_for: '',
        source: '',
        date_received: '',
        span: ''
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to save budget');
    }
  };

  const openNewBudgetModal = () => {
    setFormData({
      academic_year: '',
      total_amount: '',
      funds_for: '',
      source: '',
      date_received: '',
      span: ''
    });
    setShowModal(true);
  };

  const goToFundSources = (budget: BudgetType) => {
    navigate(`/budget/${budget.id}/funds`);
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-orange-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  const utilizationPercentage = currentBudget 
    ? ((currentBudget.spent_amount / currentBudget.total_amount) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold text-wmsu-black">Budget Management</h1>
          <p className="text-base text-gray-500 mt-1">Track and manage department budgets</p>
        </div>
        {isAdmin() && (
          <button
            onClick={openNewBudgetModal}
            className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors font-medium flex items-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Add Budget
          </button>
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
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">×</button>
        </div>
      )}

      {/* Current Academic Year */}
      {currentBudget && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-red-900" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-wmsu-black">Current Academic Year</h2>
                <p className="text-gray-500">{currentBudget.academic_year}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              type="button"
              onClick={() => goToFundSources(currentBudget)}
              className="p-4 bg-green-50 rounded-lg text-left hover:bg-green-100 transition-colors cursor-pointer border border-transparent hover:border-green-200"
              title="Click to see where funds were accumulated"
            >
              <div className="flex items-center gap-3 mb-2">
                <Wallet className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-600 font-medium">Total Budget</span>
                <Info className="w-4 h-4 text-green-500 ml-auto" />
              </div>
              <p className="text-2xl font-bold text-green-700">
                ₱{currentBudget.total_amount.toLocaleString()}
              </p>
            </button>

            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-sm text-orange-600 font-medium">Spent Amount</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">
                ₱{currentBudget.spent_amount.toLocaleString()}
              </p>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-5 h-5 text-blue-600" />
                <span className="text-sm text-blue-600 font-medium">Remaining</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                ₱{currentBudget.remaining_amount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-500">Budget Utilization</span>
              <span className={`font-bold ${getUtilizationColor(parseFloat(utilizationPercentage))}`}>
                {utilizationPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  parseFloat(utilizationPercentage) >= 90 ? 'bg-red-500' :
                  parseFloat(utilizationPercentage) >= 75 ? 'bg-orange-500' :
                  parseFloat(utilizationPercentage) >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(parseFloat(utilizationPercentage), 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Budget History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-lg font-semibold text-wmsu-black mb-4">Budget History</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Academic Year</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Spent</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Remaining</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {budgets.map((budget) => {
                const util = ((budget.spent_amount / budget.total_amount) * 100).toFixed(1);
                return (
                  <tr key={budget.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-wmsu-black">{budget.academic_year}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => goToFundSources(budget)}
                        className="text-green-700 font-medium hover:underline flex items-center gap-1"
                        title="Click to see where funds were accumulated"
                      >
                        ₱{budget.total_amount.toLocaleString()}
                        <Info className="w-4 h-4 text-green-600" />
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">₱{budget.spent_amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">₱{budget.remaining_amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              parseFloat(util) >= 90 ? 'bg-red-500' :
                              parseFloat(util) >= 75 ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(parseFloat(util), 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium ${getUtilizationColor(parseFloat(util))}`}>
                          {util}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-wmsu-black">Add New Budget</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={formData.academic_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, academic_year: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="e.g., 2025-2026"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Budget Amount (₱)
                </label>
                <input
                  type="number"
                  value={formData.total_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="border-t border-gray-200 pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">
                      Fund source (shown on Total Budget page)
                    </p>
                    <p className="text-xs text-gray-500 mb-3">
                      Optional. This will appear under “Where the funds were accumulated” when the total budget is clicked.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Funds for</label>
                        <input
                          type="text"
                          value={formData.funds_for}
                          onChange={(e) => setFormData(prev => ({ ...prev, funds_for: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600"
                          placeholder="e.g. Operations, Equipment"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Source (e.g. fund-101)</label>
                        <input
                          type="text"
                          value={formData.source}
                          onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600"
                          placeholder="fund-101"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date received</label>
                        <input
                          type="date"
                          value={formData.date_received}
                          onChange={(e) => setFormData(prev => ({ ...prev, date_received: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Span (e.g. year)</label>
                        <input
                          type="text"
                          value={formData.span}
                          onChange={(e) => setFormData(prev => ({ ...prev, span: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-600"
                          placeholder="e.g. 2025-2026"
                        />
                      </div>
                    </div>
                  </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-wmsu-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800"
                >
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budget;

