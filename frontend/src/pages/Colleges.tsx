import React, { useEffect, useMemo, useState } from 'react';
import { collegesAPI, profilesQueryAPI } from '../lib/supabaseApi';
import type { AllocationMode, College, Profile } from '../types/database';
import { Loader2, Plus, Pencil, Trash2, Building2, Percent, PhilippinePeso, X } from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

type FormState = {
  name: string;
  handler_id: string;
  allocation_mode: AllocationMode;
  allocation_value: string;
  is_active: boolean;
};

const DEFAULT_FORM: FormState = {
  name: '',
  handler_id: '',
  allocation_mode: 'percentage',
  allocation_value: '',
  is_active: true,
};

export default function Colleges() {
  const [rows, setRows] = useState<College[]>([]);
  const [deptHeads, setDeptHeads] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<College | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<College | null>(null);

  const totalActivePercentage = rows
    .filter((r) => r.is_active && r.allocation_mode === 'percentage')
    .reduce((sum, r) => sum + Number(r.allocation_value || 0), 0);

  // Enforce: one DeptHead user can only be assigned to one college.
  // Allow the currently edited handler_id to remain selectable.
  const availableDeptHeads = useMemo(() => {
    const used = new Set(
      rows
        .filter((c) => c.handler_id && c.id !== (editing?.id ?? ''))
        .map((c) => c.handler_id as string)
    );
    return deptHeads.filter((u) => !used.has(u.id) || u.id === (editing?.handler_id ?? ''));
  }, [deptHeads, rows, editing?.id, editing?.handler_id]);

  const load = async () => {
    setError('');
    try {
      const [data, heads] = await Promise.all([
        collegesAPI.getAll(),
        profilesQueryAPI.getByRole('DeptHead'),
      ]);
      setRows(data);
      setDeptHeads(heads);
    } catch (e: any) {
      setError(e?.message || 'Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (c: College) => {
    setEditing(c);
    setForm({
      name: c.name,
      handler_id: c.handler_id ?? '',
      allocation_mode: c.allocation_mode,
      allocation_value: String(c.allocation_value ?? ''),
      is_active: c.is_active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setShowModal(false);
    setEditing(null);
    setForm(DEFAULT_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const name = form.name.trim();
    const allocationValue = parseFloat(form.allocation_value);
    if (!name) {
      setError('College name is required.');
      return;
    }
    if (Number.isNaN(allocationValue) || allocationValue < 0) {
      setError('Allocation value must be a valid non-negative number.');
      return;
    }
    if (form.allocation_mode === 'percentage' && allocationValue > 100) {
      setError('Percentage cannot be greater than 100.');
      return;
    }
    if (form.allocation_mode === 'percentage') {
      const currentExcludingEditing = rows
        .filter((r) =>
          r.is_active &&
          r.allocation_mode === 'percentage' &&
          r.id !== (editing?.id ?? '')
        )
        .reduce((sum, r) => sum + Number(r.allocation_value || 0), 0);
      const nextTotal = currentExcludingEditing + (form.is_active ? allocationValue : 0);
      if (nextTotal > 100) {
        setError(`Total active percentage exceeds 100% (${nextTotal.toFixed(2)}%). Set it to 100% or less.`);
        return;
      }
    }

    if (form.handler_id) {
      const duplicate = rows.find(
        (c) => c.handler_id === form.handler_id && c.id !== (editing?.id ?? '')
      );
      if (duplicate) {
        const who = deptHeads.find((u) => u.id === form.handler_id)?.full_name ?? 'This Department Head';
        setError(`${who} is already assigned to "${duplicate.name}". One Department Head can only handle one college.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (editing) {
        await collegesAPI.update(editing.id, {
          name,
          handler_id: form.handler_id ? form.handler_id : null,
          allocation_mode: form.allocation_mode,
          allocation_value: allocationValue,
          is_active: form.is_active,
        });
        setSuccess('College updated.');
      } else {
        await collegesAPI.create({
          name,
          handler_id: form.handler_id ? form.handler_id : null,
          allocation_mode: form.allocation_mode,
          allocation_value: allocationValue,
          is_active: form.is_active,
        });
        setSuccess('College added.');
      }
      closeModal();
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to save college');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await collegesAPI.delete(id);
      setSuccess('College removed.');
      await load();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete college');
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
          <h1 className="text-3xl font-bold text-gray-900">Colleges</h1>
          <p className="text-base text-gray-500 mt-1">
            Manage colleges and budget allocation method (percentage or direct amount).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800"
        >
          <Plus className="w-5 h-5" />
          Add College
        </button>
      </div>

      <CenteredAlert
        error={error || undefined}
        success={success || undefined}
        onClose={() => {
          setError('');
          setSuccess('');
        }}
      />

      {totalActivePercentage > 100 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-800 text-sm">
          Warning: total active percentage is <span className="font-semibold">{totalActivePercentage.toFixed(2)}%</span>.
          It needs to be 100% or less.
        </div>
      )}

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">College</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">College Head</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Value</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No colleges yet.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-red-900" />
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {c.handler_id
                      ? (deptHeads.find((u) => u.id === c.handler_id)?.full_name ?? '—')
                      : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 capitalize">
                    {c.allocation_mode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {c.allocation_mode === 'percentage' ? `${c.allocation_value}%` : `₱${Number(c.allocation_value).toLocaleString()}`}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg"
                        title="Edit college"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg"
                        title="Delete college"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? 'Edit College' : 'Add College'}</h3>
              <button type="button" onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College Head</label>
                <select
                  value={form.handler_id}
                  onChange={(e) => setForm((p) => ({ ...p, handler_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                >
                  <option value="">— None —</option>
                  {availableDeptHeads.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Create College Admin users under Users. One College Admin can only be assigned to one college.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Allocation method</label>
                <select
                  value={form.allocation_mode}
                  onChange={(e) => setForm((p) => ({ ...p, allocation_mode: e.target.value as AllocationMode }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="amount">Direct amount (₱)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allocation value
                </label>
                <div className="relative">
                  {form.allocation_mode === 'percentage' ? (
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  ) : (
                    <PhilippinePeso className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  )}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.allocation_value}
                    onChange={(e) => setForm((p) => ({ ...p, allocation_value: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                    required
                  />
                </div>
                {form.allocation_mode === 'percentage' && (
                  <p className="text-xs text-gray-500 mt-1">Use 0 to 100.</p>
                )}
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                />
                Active
              </label>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-600 hover:text-gray-900">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete college?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will remove <span className="font-medium">{deleteTarget.name}</span>. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteTarget.id;
                  setDeleteTarget(null);
                  await handleDelete(id);
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
