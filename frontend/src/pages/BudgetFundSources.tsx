import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { budgetsAPI, budgetFundSourcesAPI } from '../lib/supabaseApi';
import { useAuth } from '../context/AuthContext';
import type { Budget as BudgetType, BudgetFundSource } from '../types/database';
import {
  Loader2,
  Wallet,
  FileText,
  Plus,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const BudgetFundSources = () => {
  const { budgetId } = useParams<{ budgetId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [budget, setBudget] = useState<BudgetType | null>(null);
  const [fundSources, setFundSources] = useState<BudgetFundSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddFundSource, setShowAddFundSource] = useState(false);
  const [fundSourceForm, setFundSourceForm] = useState({
    amount: '',
    funds_for: '',
    source: '',
    date_received: '',
    span: ''
  });

  useEffect(() => {
    if (!budgetId) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [budgetData, sourcesData] = await Promise.all([
          budgetsAPI.getById(budgetId),
          budgetFundSourcesAPI.getByBudgetId(budgetId)
        ]);
        setBudget(budgetData);
        setFundSources(sourcesData);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
        setBudget(null);
        setFundSources([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [budgetId]);

  const handleAddFundSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!budgetId) return;
    setError('');
    try {
      await budgetFundSourcesAPI.create({
        budget_id: budgetId,
        amount: parseFloat(fundSourceForm.amount) || 0,
        funds_for: fundSourceForm.funds_for || null,
        source: fundSourceForm.source || null,
        date_received: fundSourceForm.date_received || null,
        span: fundSourceForm.span || null
      });
      const list = await budgetFundSourcesAPI.getByBudgetId(budgetId);
      setFundSources(list);
      setFundSourceForm({ amount: '', funds_for: '', source: '', date_received: '', span: '' });
      setShowAddFundSource(false);
      setSuccess('Fund source added.');
    } catch (err: any) {
      setError(err.message || 'Failed to add fund source');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => navigate('/budget')}
          className="flex items-center gap-2 text-gray-600 hover:text-wmsu-black"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Budget
        </button>
        <p className="text-gray-500">Budget not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/budget')}
            className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
            title="Back to Budget Management"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-wmsu-black flex items-center gap-2">
              <Wallet className="w-8 h-8 text-green-600" />
              Where the funds were accumulated
            </h1>
            <p className="text-base text-gray-500 mt-1">
              Academic year: {budget.academic_year} · Total: ₱{budget.total_amount.toLocaleString()}
            </p>
          </div>
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        {fundSources.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No fund source entries yet.</p>
            {isAdmin() && (
              <p className="text-sm mt-1">Add one below to track where the budget came from.</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Funds for</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date received</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Span</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fundSources.map((fs) => (
                  <tr key={fs.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-wmsu-black">{fs.funds_for ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{fs.source ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {fs.date_received ? new Date(fs.date_received).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{fs.span ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      ₱{fs.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin() && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            {!showAddFundSource ? (
              <button
                type="button"
                onClick={() => setShowAddFundSource(true)}
                className="flex items-center gap-2 px-3 py-2 text-red-900 hover:bg-red-50 rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add fund source
              </button>
            ) : (
              <form onSubmit={handleAddFundSource} className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Funds for</label>
                    <input
                      type="text"
                      value={fundSourceForm.funds_for}
                      onChange={(e) => setFundSourceForm((p) => ({ ...p, funds_for: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g. Operations, Equipment"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Source (e.g. fund-101)</label>
                    <input
                      type="text"
                      value={fundSourceForm.source}
                      onChange={(e) => setFundSourceForm((p) => ({ ...p, source: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="fund-101"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date received</label>
                    <input
                      type="date"
                      value={fundSourceForm.date_received}
                      onChange={(e) => setFundSourceForm((p) => ({ ...p, date_received: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Span (e.g. year)</label>
                    <input
                      type="text"
                      value={fundSourceForm.span}
                      onChange={(e) => setFundSourceForm((p) => ({ ...p, span: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g. 2025-2026"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₱)</label>
                    <input
                      type="number"
                      value={fundSourceForm.amount}
                      onChange={(e) => setFundSourceForm((p) => ({ ...p, amount: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="0"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-red-900 text-white rounded-lg text-sm hover:bg-red-800"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddFundSource(false)}
                    className="px-3 py-1.5 text-gray-600 hover:text-wmsu-black text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetFundSources;
