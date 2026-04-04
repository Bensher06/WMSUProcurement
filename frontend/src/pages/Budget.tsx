import React, { useState, useEffect, type FormEvent } from 'react';
import { budgetsAPI, profilesAPI, collegesAPI } from '../lib/supabaseApi';
import type { Budget, College, Profile } from '../types/database';
import { Loader2, Plus, Wallet, Building2, Save, X } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

export default function Budget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [year, setYear] = useState('');
  const [totalAmount, setTotalAmount] = useState('');

  const [allocations, setAllocations] = useState<Record<string, string>>({});

  const load = async () => {
    setError('');
    try {
      const [bRows, pRows] = await Promise.all([
        budgetsAPI.getAll(),
        profilesAPI.getAll(),
      ]);
      setBudgets(bRows);
      setProfiles(pRows);
      try {
        const cRows = await collegesAPI.getAll();
        setColleges(cRows.filter((c) => c.is_active));
      } catch {
        // Keep page usable if colleges table is temporarily misconfigured.
        setColleges([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deptHeadByCollege = (college: College) => {
    // Primary source of truth: explicit assignment from Colleges page
    if (college.handler_id) {
      const assigned = profiles.find((p) => p.id === college.handler_id && p.role === 'DeptHead');
      if (assigned) return assigned;
    }
    // Backward compatibility for older rows that relied on department name matching
    return profiles.find((p) => p.department === college.name && p.role === 'DeptHead');
  };

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

  const sanitizeCurrencyInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot === -1) return cleaned;
    return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  };

  const formatCurrencyInput = (value: string) => {
    const raw = value.trim();
    if (!raw) return '';
    const n = Number(raw);
    if (Number.isNaN(n)) return raw;
    const decimalPlaces = raw.includes('.') ? Math.min((raw.split('.')[1] || '').length, 2) : 0;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: 2,
    });
  };

  const handleSaveAllocations = async () => {
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      let distributedTotal = 0;
      for (const college of colleges) {
        const raw = allocations[college.id]?.trim() ?? '';
        const deptHead = deptHeadByCollege(college);
        const value = raw === '' ? null : parseFloat(raw);
        if (value != null && (Number.isNaN(value) || value < 0)) {
          setError(`Invalid amount for ${college.name}.`);
          setSubmitting(false);
          return;
        }
        if (value != null && value > 0 && !deptHead) {
          setError(`No College Admin assigned for ${college.name}. Create one under Users first.`);
          setSubmitting(false);
          return;
        }
        distributedTotal += value ?? 0;
      }

      const currentYearRows = await budgetsAPI.getCurrentYearBudgets();
      if (currentYearRows.length === 0) {
        setError('No current-year budget found to deduct from.');
        setSubmitting(false);
        return;
      }
      const currentYearTotal = currentYearRows.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
      if (distributedTotal > currentYearTotal) {
        setError(
          `Total college distribution (₱${distributedTotal.toLocaleString()}) exceeds current-year budget (₱${currentYearTotal.toLocaleString()}).`
        );
        setSubmitting(false);
        return;
      }

      for (const college of colleges) {
        const raw = allocations[college.id]?.trim() ?? '';
        const deptHead = deptHeadByCollege(college);
        if (!deptHead) continue;
        const value = raw === '' ? null : parseFloat(raw);
        await profilesAPI.update(deptHead.id, { approved_budget: value });
      }

      // Keep the current-year aggregate consistent: store total spent on the latest row, zero on older rows.
      await Promise.all(
        currentYearRows.map((row, idx) =>
          budgetsAPI.update(row.id, { spent_amount: idx === 0 ? distributedTotal : 0 })
        )
      );

      setSuccess(
        `College allocations saved. Distributed ₱${distributedTotal.toLocaleString()} and deducted it from current-year budget.`
      );
      await load();
    } catch (e: any) {
      setError(e?.message || 'Could not save allocations');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const next: Record<string, string> = {};
    const referenceTotal = budgets[0]?.total_amount ?? 0;
    for (const college of colleges) {
      const h = deptHeadByCollege(college);
      if (h?.approved_budget != null) {
        next[college.id] = String(h.approved_budget);
        continue;
      }
      const computed =
        college.allocation_mode === 'percentage'
          ? (referenceTotal * Number(college.allocation_value || 0)) / 100
          : Number(college.allocation_value || 0);
      next[college.id] = computed > 0 ? String(Number(computed.toFixed(2))) : '';
    }
    setAllocations(next);
  }, [profiles, colleges, budgets]);

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
          Add institutional budgets and distribute amounts to colleges (College Admin users).
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
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatCurrencyInput(totalAmount)}
                    onChange={(e) => setTotalAmount(sanitizeCurrencyInput(e.target.value))}
                    className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    placeholder="0.00"
                  />
                </div>
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
              <p className="text-xs text-gray-600 mb-1">Distributed</p>
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
          Set each college&apos;s approved budget for its College Admin user. Base configuration comes from the Colleges page (percentage or direct amount), and you can still adjust here before saving.
        </p>
        <div className="space-y-4">
          {colleges.map((college) => {
            const deptHead = deptHeadByCollege(college);
            return (
              <div key={college.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 border border-gray-100 rounded-lg p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{college.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Method: {college.allocation_mode === 'percentage' ? `Percentage (${college.allocation_value}%)` : `Direct amount (₱${Number(college.allocation_value).toLocaleString()})`}
                  </p>
                  {!deptHead ? (
                    <p className="text-xs text-amber-700 mt-1">No College Admin assigned for this college yet. Create one under Users.</p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1 truncate">{deptHead.full_name} · {deptHead.email}</p>
                  )}
                </div>
                <div className="w-full sm:w-48">
                  <label className="sr-only">Amount (₱)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      disabled={!deptHead}
                      value={formatCurrencyInput(allocations[college.id] ?? '')}
                      onChange={(e) =>
                        setAllocations((prev) => ({ ...prev, [college.id]: sanitizeCurrencyInput(e.target.value) }))
                      }
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {colleges.length === 0 && (
          <p className="text-sm text-amber-700 mt-4">
            No active colleges found. Add one first in the Colleges page.
          </p>
        )}
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
