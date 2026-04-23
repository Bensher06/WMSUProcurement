import { useCallback, useEffect, useMemo, useState } from 'react';
import { collegesAPI, profilesQueryAPI } from '../lib/supabaseApi';
import type { College, Profile } from '../types/database';
import {
  Loader2,
  Building2,
  X,
  Eye,
  User,
  Mail,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { CenteredAlert } from '../components/CenteredAlert';

const PAGE_SIZE = 10;

type EditorState =
  | null
  | {
      mode: 'add' | 'edit';
      id?: string;
      name: string;
      is_active: boolean;
    };

export default function Colleges() {
  const [rows, setRows] = useState<College[]>([]);
  const [deptHeads, setDeptHeads] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewing, setViewing] = useState<College | null>(null);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<EditorState>(null);
  const [confirmDelete, setConfirmDelete] = useState<College | null>(null);
  const [saving, setSaving] = useState(false);

  const formatAdminName = (p: Profile): string => {
    const first = p.first_name?.trim() || '';
    const middle = p.middle_initial?.trim() || '';
    const last = p.family_name?.trim() || '';
    const composed = [first, middle, last].filter(Boolean).join(' ').trim();
    return composed || p.full_name?.trim() || '';
  };

  const getCollegeAdmin = (c: College): Profile | null => {
    if (!c.handler_id) return null;
    return deptHeads.find((u) => u.id === c.handler_id) ?? null;
  };

  /** App-level status rule: a college is Active only when a College Admin is linked. */
  const isCollegeActive = (c: College): boolean => Boolean(c.handler_id);

  const fetchRows = useCallback(async () => {
    const [data, heads] = await Promise.all([
      collegesAPI.getAll(),
      profilesQueryAPI.getByRole('DeptHead'),
    ]);
    setRows(data);
    setDeptHeads(heads);
  }, []);

  const load = async () => {
    setError('');
    try {
      await fetchRows();
    } catch (e: any) {
      setError(e?.message || 'Failed to load colleges');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveEditor = async () => {
    if (!editor) return;
    const name = editor.name.trim();
    if (!name) {
      setError('College name is required.');
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      if (editor.mode === 'add') {
        await collegesAPI.create({
          name,
          allocation_mode: 'percentage',
          allocation_value: 0,
          is_active: editor.is_active,
        });
        setSuccess('College added.');
      } else if (editor.mode === 'edit' && editor.id) {
        await collegesAPI.update(editor.id, { name, is_active: editor.is_active });
        setSuccess('College updated.');
        if (viewing?.id === editor.id) {
          setViewing((v) => (v ? { ...v, name, is_active: editor.is_active } : v));
        }
      }
      setEditor(null);
      await fetchRows();
    } catch (e: any) {
      setError(e?.message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.handler_id) {
      setError('Unassign the College Admin from this college (Users page) before deleting it.');
      setConfirmDelete(null);
      return;
    }
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await collegesAPI.delete(confirmDelete.id);
      setSuccess('College removed.');
      if (viewing?.id === confirmDelete.id) setViewing(null);
      setConfirmDelete(null);
      await fetchRows();
    } catch (e: any) {
      setError(e?.message || 'Delete failed. This college may still be referenced elsewhere.');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [safePage, page]);

  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  const rangeStart = rows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, rows.length);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Colleges</h1>
          <p className="text-base text-gray-500 mt-1">
            Manage college names and visibility. College Admins are still assigned from the Users page
            (department must match the college name).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setError('');
              setSuccess('');
              setEditor({ mode: 'add', name: '', is_active: true });
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-900 text-white text-sm font-medium hover:bg-red-800 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add college
          </button>
        </div>
      </div>

      <CenteredAlert
        error={error || undefined}
        success={success || undefined}
        onClose={() => {
          setError('');
          setSuccess('');
        }}
      />

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">College</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">College admin</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Assigned</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Public signup</th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-40">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No colleges yet. Add one with the button above.
                </td>
              </tr>
            ) : (
              pageRows.map((c) => {
                const admin = getCollegeAdmin(c);
                const active = isCollegeActive(c);
                const listed = c.is_active !== false;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-red-900 shrink-0" />
                        <span className="font-medium text-gray-900">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {admin ? (
                        <span className="text-gray-700">{formatAdminName(admin) || '—'}</span>
                      ) : (
                        <span className="italic text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {active ? 'Active' : 'Not Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {listed ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setViewing(c)}
                          className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg"
                          title="View details"
                          aria-label={`View details for ${c.name}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setSuccess('');
                            setEditor({
                              mode: 'edit',
                              id: c.id,
                              name: c.name,
                              is_active: listed,
                            });
                          }}
                          className="p-2 text-gray-500 hover:text-red-900 hover:bg-red-50 rounded-lg"
                          title="Edit college"
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setError('');
                            setSuccess('');
                            setConfirmDelete(c);
                          }}
                          className="p-2 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          title="Delete college"
                          aria-label={`Delete ${c.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
            <p>
              Showing <span className="font-medium text-gray-900">{rangeStart}</span>–
              <span className="font-medium text-gray-900">{rangeEnd}</span> of{' '}
              <span className="font-medium text-gray-900">{rows.length}</span> colleges
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-gray-700">
                Page <span className="font-semibold text-gray-900">{safePage}</span> of{' '}
                <span className="font-semibold text-gray-900">{totalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {editor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="presentation"
          onClick={() => !saving && setEditor(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-gray-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="college-editor-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 id="college-editor-title" className="text-lg font-semibold text-gray-900">
                {editor.mode === 'add' ? 'Add college' : 'Edit college'}
              </h2>
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditor(null)}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div>
                <label htmlFor="college-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  id="college-name"
                  value={editor.name}
                  onChange={(e) => setEditor({ ...editor, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  placeholder="e.g. College of Engineering"
                  autoComplete="off"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editor.is_active}
                  onChange={(e) => setEditor({ ...editor, is_active: e.target.checked })}
                  className="rounded border-gray-300 text-red-900 focus:ring-red-600"
                />
                <span className="text-sm text-gray-700">Show on public sign-up page</span>
              </label>
              {editor.mode === 'edit' && (
                <p className="text-xs text-gray-500">
                  Renaming a college does not update existing user profiles. After a rename, align College Admin
                  and faculty &quot;department&quot; values on the Users page so they still match this name.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 bg-gray-50 border-t border-gray-100">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditor(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveEditor()}
                className="px-4 py-2 text-sm font-medium bg-red-900 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="presentation"
          onClick={() => !saving && setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm shadow-2xl border border-gray-200 p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-college-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-college-title" className="text-lg font-semibold text-gray-900">
              Delete college?
            </h2>
            <p className="text-sm text-gray-600 mt-2">
              Remove <span className="font-medium text-gray-900">{confirmDelete.name}</span> from the system.
              Budget rows tied to this college will be removed. You cannot delete while a College Admin is still
              assigned.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void executeDelete()}
                className="px-4 py-2 text-sm font-medium bg-red-700 text-white rounded-lg hover:bg-red-800 disabled:opacity-50"
              >
                {saving ? 'Working…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (() => {
        const admin = getCollegeAdmin(viewing);
        const active = isCollegeActive(viewing);
        return (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            role="presentation"
            onClick={() => setViewing(null)}
          >
            <div
              className="bg-white rounded-xl w-full max-w-lg shadow-2xl border border-red-900/10 overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="college-details-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 bg-red-900 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/15 rounded-lg flex items-center justify-center ring-1 ring-white/30">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="college-details-title" className="text-lg font-semibold leading-tight">
                      {viewing.name}
                    </h3>
                    <p className="text-xs text-red-100 mt-0.5">College Details</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="p-2 hover:bg-red-800 rounded-lg transition-colors"
                  aria-label="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Status</p>
                  <span
                    className={`inline-flex mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {active ? 'Active' : 'Not Active'}
                  </span>
                  {!active && (
                    <p className="text-xs text-gray-500 mt-2">
                      Status becomes Active once a College Admin is assigned.
                    </p>
                  )}
                </div>

                <section className="rounded-xl border border-red-900/15 bg-gradient-to-br from-red-50 to-white overflow-hidden">
                  <header className="flex items-center gap-2 px-5 py-3 bg-red-900/5 border-b border-red-900/10">
                    <ShieldCheck className="w-4 h-4 text-red-900" />
                    <h4 className="text-sm font-semibold text-red-900 uppercase tracking-wide">
                      College Admin
                    </h4>
                  </header>
                  <div className="px-5 py-4">
                    {admin ? (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-900 text-white rounded-full flex items-center justify-center font-semibold shadow-sm">
                          {(formatAdminName(admin).charAt(0) || '?').toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-gray-900">
                            <User className="w-4 h-4 text-red-900 shrink-0" />
                            <p className="font-semibold truncate">{formatAdminName(admin) || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                            <Mail className="w-4 h-4 text-red-900 shrink-0" />
                            <a
                              href={`mailto:${admin.email}`}
                              className="truncate hover:text-red-900 hover:underline"
                            >
                              {admin.email}
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-2">
                        <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700">No Admin Assigned</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            This college does not have a College Admin yet.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="flex justify-end px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewing(null)}
                  className="px-4 py-2 bg-red-900 text-white rounded-lg hover:bg-red-800 shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
