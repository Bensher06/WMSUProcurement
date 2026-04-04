import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CenteredAlert } from '../components/CenteredAlert';
import { collegeBudgetTypesAPI, collegesAPI, profilesQueryAPI, requestsAPI } from '../lib/supabaseApi';
import type { College, CollegeBudgetType, RequestWithRelations } from '../types/database';
import { Loader2, Plus, Trash2, Pencil, Wallet, X } from 'lucide-react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString()}`;

export default function DeptHeadBudget() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<RequestWithRelations[]>([]);
  const [handledCollege, setHandledCollege] = useState<College | null>(null);
  const [types, setTypes] = useState<CollegeBudgetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [scopeLabel, setScopeLabel] = useState<string>('your allocation');

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [editingType, setEditingType] = useState<CollegeBudgetType | null>(null);
  const [typeForm, setTypeForm] = useState<{ fund_code: string; name: string; amount: string; is_active: boolean }>({
    fund_code: '',
    name: '',
    amount: '',
    is_active: true,
  });
  const [confirmDelete, setConfirmDelete] = useState<CollegeBudgetType | null>(null);
  const [savingType, setSavingType] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const colleges = await collegesAPI.getAll();
        const handled = colleges.find((c) => c.handler_id === profile?.id) ?? null;
        if (handled?.name) {
          setHandledCollege(handled);
          setScopeLabel(handled.name);
          const budgetTypes = await collegeBudgetTypesAPI.getByCollegeId(handled.id);
          if (mounted) setTypes(budgetTypes);
          const deptProfiles = await profilesQueryAPI.getByDepartment(handled.name);
          const requesterIds = deptProfiles.map((p) => p.id);
          const data = await requestsAPI.getByRequesterIds(requesterIds);
          if (!mounted) return;
          setRows(data);
        } else {
          setHandledCollege(null);
          setScopeLabel('your allocation');
          const mine = await requestsAPI.getMyRequests();
          if (!mounted) return;
          setRows(mine);
        }
        if (!mounted) return;
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Failed to load budget data.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [profile?.id]);

  const committed = useMemo(
    () =>
      rows
        .filter((r) => ['Approved', 'Ordered', 'Received', 'Completed'].includes(r.status))
        .reduce((sum, r) => sum + Number(r.total_price || 0), 0),
    [rows]
  );

  const approved = Number(profile?.approved_budget || 0);
  const remaining = Math.max(0, approved - committed);

  const allocatedByTypes = useMemo(
    () => types.filter((t) => t.is_active).reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [types]
  );
  const unallocated = Math.max(0, approved - allocatedByTypes);

  const openCreateType = () => {
    setEditingType(null);
    setTypeForm({ fund_code: '', name: '', amount: '', is_active: true });
    setShowTypeModal(true);
  };

  const openEditType = (t: CollegeBudgetType) => {
    setEditingType(t);
    setTypeForm({
      fund_code: t.fund_code ?? '',
      name: t.name ?? '',
      amount: String(t.amount ?? ''),
      is_active: t.is_active,
    });
    setShowTypeModal(true);
  };

  const closeTypeModal = () => {
    if (savingType) return;
    setShowTypeModal(false);
    setEditingType(null);
    setTypeForm({ fund_code: '', name: '', amount: '', is_active: true });
  };

  const saveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!handledCollege) {
      setError('No handled college found.');
      return;
    }
    const name = typeForm.name.trim();
    const fund_code = typeForm.fund_code.trim();
    const amount = parseFloat(typeForm.amount);
    if (!fund_code) {
      setError('Fund code is required.');
      return;
    }
    if (!name) {
      setError('Budget type name is required.');
      return;
    }
    if (Number.isNaN(amount) || amount < 0) {
      setError('Amount must be a valid non-negative number.');
      return;
    }
    const currentExcludingEditing = types
      .filter((t) => t.is_active && t.id !== (editingType?.id ?? ''))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const nextTotal = currentExcludingEditing + (typeForm.is_active ? amount : 0);
    if (nextTotal > approved) {
      setError(`Total allocated by budget types exceeds total budget (${money(nextTotal)} > ${money(approved)}).`);
      return;
    }

    setSavingType(true);
    try {
      if (editingType) {
        await collegeBudgetTypesAPI.update(editingType.id, {
          fund_code: fund_code || null,
          name,
          amount,
          is_active: typeForm.is_active,
        });
        setSuccess('Budget type updated.');
      } else {
        await collegeBudgetTypesAPI.create({
          college_id: handledCollege.id,
          fund_code: fund_code || null,
          name,
          amount,
          is_active: typeForm.is_active,
        });
        setSuccess('Budget type added.');
      }
      const budgetTypes = await collegeBudgetTypesAPI.getByCollegeId(handledCollege.id);
      setTypes(budgetTypes);
      closeTypeModal();
    } catch (e: any) {
      setError(e?.message || 'Failed to save budget type.');
    } finally {
      setSavingType(false);
    }
  };

  const deleteType = async (t: CollegeBudgetType) => {
    setError('');
    setSuccess('');
    try {
      await collegeBudgetTypesAPI.delete(t.id);
      if (handledCollege) {
        const budgetTypes = await collegeBudgetTypesAPI.getByCollegeId(handledCollege.id);
        setTypes(budgetTypes);
      }
      setSuccess('Budget type removed.');
    } catch (e: any) {
      setError(e?.message || 'Failed to delete budget type.');
    }
  };

  return (
    <div className="space-y-6">
      <CenteredAlert
        error={error || undefined}
        success={success || undefined}
        onClose={() => {
          setError('');
          setSuccess('');
        }}
      />
      <div>
        <h1 className="text-3xl font-bold text-gray-900">College Admin Budget</h1>
        <p className="text-base text-gray-500 mt-1">Overview for <span className="font-medium">{scopeLabel}</span>.</p>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Allocated Budget</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{money(approved)}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Committed</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{money(committed)}</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
            <p className="text-sm text-gray-500">Remaining</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{money(remaining)}</p>
          </div>
        </div>
      )}

      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Budget Types</h2>
            <p className="text-sm text-gray-500 mt-1">
              Allocate your total budget into fund types (e.g., Fund 101 – General Fund). Displayed as cards.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateType}
            disabled={!handledCollege}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add type
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-600 mb-1">Allocated (by types)</p>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{money(allocatedByTypes)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-600 mb-1">Unallocated</p>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{money(unallocated)}</p>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-xs text-gray-600 mb-1">Total budget</p>
            <p className="text-xl font-semibold text-gray-900 tabular-nums">{money(approved)}</p>
          </div>
        </div>

        {!handledCollege ? (
          <p className="text-sm text-amber-700 mt-4">
            No handled college is assigned to your account yet.
          </p>
        ) : types.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No budget types yet. Click <span className="font-medium">Add type</span> to create one (e.g., Fund 101).
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {types.map((t) => (
              <div key={t.id} className="rounded-xl border border-gray-100 shadow-sm bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">
                      {t.fund_code ? <span className="font-medium text-gray-700">{t.fund_code}</span> : 'Fund'}
                      {t.is_active ? (
                        <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-700">Active</span>
                      ) : (
                        <span className="ml-2 inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">Inactive</span>
                      )}
                    </p>
                    <p className="text-lg font-semibold text-gray-900 truncate" title={t.name}>{t.name}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditType(t)}
                      className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(t)}
                      className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-500">Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{money(t.amount)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 text-gray-700 mb-2">
          <Wallet className="w-5 h-5" />
          <span className="font-semibold">Budget note</span>
        </div>
        <p className="text-sm text-gray-600">
          Committed budget is based on requests with status Approved, Ordered, Received, or Completed.
        </p>
      </div>

      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="presentation" onClick={closeTypeModal}>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{editingType ? 'Edit budget type' : 'Add budget type'}</h3>
              <button type="button" disabled={savingType} onClick={closeTypeModal} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={saveType} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fund code</label>
                <input
                  value={typeForm.fund_code}
                  onChange={(e) => setTypeForm((p) => ({ ...p, fund_code: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  placeholder="e.g., Fund 101"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={typeForm.name}
                  onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  placeholder="e.g., General fund"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={typeForm.amount}
                  onChange={(e) => setTypeForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  required
                />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={typeForm.is_active}
                  onChange={(e) => setTypeForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                Active
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeTypeModal} disabled={savingType} className="px-4 py-2.5 text-gray-700 hover:text-gray-900 rounded-lg disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={savingType} className="px-5 py-2.5 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 inline-flex items-center gap-2">
                  {savingType ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingType ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="presentation" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 w-full max-w-md p-6" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900">Delete budget type?</h3>
            <p className="text-sm text-gray-600 mt-2">
              This will remove <span className="font-medium">{confirmDelete.fund_code ? `${confirmDelete.fund_code} – ` : ''}{confirmDelete.name}</span>.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-gray-600 hover:text-gray-900">
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const t = confirmDelete;
                  setConfirmDelete(null);
                  await deleteType(t);
                }}
                className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
