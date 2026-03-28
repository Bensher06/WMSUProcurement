import React, { useState, useEffect, type FormEvent } from 'react';
import { budgetsAPI, profilesAPI } from '../lib/supabaseApi';
import type { Budget, Profile } from '../types/database';
import { Loader2, Plus, Wallet, Building2, Save, X } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const COLLEGES = [
  'College of Computing Science',
  'College of Nursing',
  'College of Engineering'
] as const;

export default function Budget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [year, setYear] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  const [allocations, setAllocations] = useState<Record<string, string>>(() =>
    Object.fromEntries(COLLEGES.map((c) => [c, '']))
  );

  const load = async () => {
    setError('');
    try {
      const [bRows, pRows] = await Promise.all([budgetsAPI.getAll(), profilesAPI.getAll()]);
      setBudgets(bRows);
      setProfiles(pRows);
    } catch (e: any) {
      setError(e?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const facultyByCollege = (college: string) =>
    profiles.find((p) => p.department === college && p.role === 'Faculty');

  const handleCreateBudget = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const y = year.trim();
    const amt = parseFloat(totalAmount);
    if (!y) {
      setError('Enter an academic year (e.g. 2025-2026).');
      return;
    }
    if (Number.isNaN(amt) || amt < 0) {
      setError('Enter a valid total amount.');
      return;
    }
    setSubmitting(true);
    try {
      await budgetsAPI.create({ academic_year: y, total_amount: amt });
      setSuccess('Budget added.');
      setYear('');
      setTotalAmount('');
      setShowAddBudgetModal(false);
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not create budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAllocations = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      for (const college of COLLEGES) {
        const raw = allocations[college]?.trim() ?? '';
        const faculty = facultyByCollege(college);
        if (!faculty) continue;
        const value = raw === '' ? null : parseFloat(raw);
        if (value != null && (Number.isNaN(value) || value < 0)) {
          setError(`Invalid amount for ${college}.`);
          setSubmitting(false);
          return;
        }
        await profilesAPI.update(faculty.id, { approved_budget: value });
      }
      setSuccess('College allocations saved. Faculty users will see their approved budget on their dashboard.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not save allocations');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const college of COLLEGES) {
      const f = profiles.find((p) => p.department === college && p.role === 'Faculty');
      next[college] = f?.approved_budget != null ? String(f.approved_budget) : '';
    }
    setAllocations(next);
  }, [profiles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  const overallTotals = budgets.reduce(
    (acc, b) => ({
      total: acc.total + Number(b.total_amount),
      spent: acc.spent + Number(b.spent_amount),
      remaining: acc.remaining + Number(b.remaining_amount),
    }),
    { total: 0, spent: 0, remaining: 0 }
  );

  const fmt = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget</h1>
          <p className="text-base text-gray-500 mt-1">
            Add institutional budgets and distribute amounts to colleges (faculty users).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setYear('');
            setTotalAmount('');
            setShowAddBudgetModal(true);
          }}
          className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-red-900 text-white rounded-lg hover:bg-red-800 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add budget
        </button>
      </div>

      <CenteredAlert error={error || undefined} success={success || undefined} onClose={() => { setError(''); setSuccess(''); }} />

      {showAddBudgetModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="presentation"
          onClick={() => !submitting && setShowAddBudgetModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-budget-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 id="add-budget-modal-title" className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-900" />
                Add budget
              </h2>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowAddBudgetModal(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateBudget} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Academic year</label>
                <input
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total amount (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowAddBudgetModal(false)}
                  className="px-4 py-2.5 text-gray-700 hover:text-gray-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                  Add budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {budgets.length > 0 && (
        <section
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
          aria-label="Overall budget summary"
        >
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
            Overall (all records)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-red-950/5 border border-red-900/10 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Total budget</p>
              <p className="text-2xl font-bold text-red-950 tabular-nums">₱{fmt(overallTotals.total)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Spent</p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">₱{fmt(overallTotals.spent)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-600 mb-1">Remaining</p>
              <p className="text-xl font-semibold text-gray-900 tabular-nums">₱{fmt(overallTotals.remaining)}</p>
            </div>
          </div>
        </section>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-red-900" />
            Budget records
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Academic year</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Total (₱)</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Spent (₱)</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Remaining (₱)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {budgets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No budgets yet. Use &quot;Add budget&quot; to create one.
                  </td>
                </tr>
              ) : (
                budgets.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{b.academic_year}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{b.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{b.spent_amount.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right tabular-nums">{b.remaining_amount.toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-2">
          <Building2 className="w-5 h-5 text-red-900" />
          Distribute to colleges
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Set each college&apos;s approved budget for its faculty user. Amounts are stored on the user profile (same as editing a user).
        </p>
        <div className="space-y-4">
          {COLLEGES.map((college) => {
            const faculty = facultyByCollege(college);
            return (
              <div key={college} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 border border-gray-100 rounded-lg p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{college}</p>
                  {!faculty ? (
                    <p className="text-xs text-amber-700 mt-1">No faculty user for this department yet. Create one under Users.</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1 truncate">{faculty.full_name} · {faculty.email}</p>
                  )}
                </div>
                <div className="w-full sm:w-48">
                  <label className="sr-only">Amount (₱)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={!faculty}
                    value={allocations[college] ?? ''}
                    onChange={(e) =>
                      setAllocations((prev) => ({ ...prev, [college]: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 disabled:bg-gray-50"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleSaveAllocations}
          disabled={submitting}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save college allocations
        </button>
      </section>
    </div>
  );
}
