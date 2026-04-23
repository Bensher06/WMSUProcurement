import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { requestsAPI } from '../lib/supabaseApi';
import type { RequestWithRelations } from '../types/database';
import { CenteredAlert } from '../components/CenteredAlert';
import { Copy, Loader2, Lock, Pencil, PlusCircle, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { parseRequisitionDescription } from '../lib/parseRequisitionDescription';

const money = (n: number) => `₱${Number(n || 0).toLocaleString()}`;
type RequisitionLine = {
  unit: string;
  itemDescription: string;
  quantity: string;
  unitPrice: string;
};

const newLine = (): RequisitionLine => ({
  unit: '',
  itemDescription: '',
  quantity: '',
  unitPrice: '',
});

/**
 * Common unit-of-measure options offered in the line-item datalist. Faculty can
 * still type a custom value (e.g. "bottle"); the datalist is a suggestion list,
 * not a hard whitelist.
 */
const UNIT_OF_MEASURE_OPTIONS = [
  'pc',
  'pcs',
  'set',
  'pack',
  'box',
  'pair',
  'roll',
  'ream',
  'bottle',
  'can',
  'sachet',
  'kg',
  'g',
  'L',
  'mL',
  'm',
  'cm',
  'lot',
  'unit',
] as const;

const NUMERIC_ONLY_RE = /^[\d.,]+$/;
const DEFAULT_UNIT_FALLBACK = 'pcs';
const normalizeTrimmedText = (value: unknown): string => String(value ?? '').trim();

/**
 * Sanitize a user-entered unit-of-measure value. Empty strings, placeholders
 * like "-", and numeric-only inputs (a common mix-up with Qty / Unit Price)
 * are auto-corrected to the default fallback so submissions aren't blocked.
 */
const sanitizeUnitOfMeasure = (value: unknown): string => {
  const trimmed = normalizeTrimmedText(value);
  if (!trimmed || trimmed === '-' || NUMERIC_ONLY_RE.test(trimmed)) {
    return DEFAULT_UNIT_FALLBACK;
  }
  return trimmed;
};

export default function FacultyNewRequest() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  // Division = user's College (profile.department); Office/Section = user's
  // Department (profile.faculty_department). These are locked to the signed-in
  // user's actual assignment so faculty can't mis-route requisitions.
  const division = profile?.department?.trim() || '';
  const officeSection = profile?.faculty_department?.trim() || '';
  const profileReady = !!profile;

  // RIS No. / SAI No. are assigned by the database trigger
  // `requests_assign_ris_sai` when the request transitions to `Pending`.
  // They are intentionally NOT captured from the UI.
  const [subject, setSubject] = useState('');
  const [purpose, setPurpose] = useState('');

  const [requestedByName, setRequestedByName] = useState('');
  const [requestedByDesignation, setRequestedByDesignation] = useState('');
  const [requestedByDate, setRequestedByDate] = useState('');

  const [approvedByName, setApprovedByName] = useState('');
  const [approvedByDesignation, setApprovedByDesignation] = useState('');
  const [approvedByDate, setApprovedByDate] = useState('');

  const [issuedByName, setIssuedByName] = useState('');
  const [issuedByDesignation, setIssuedByDesignation] = useState('');
  const [issuedByDate, setIssuedByDate] = useState('');

  const [receivedByName, setReceivedByName] = useState('');
  const [receivedByDesignation, setReceivedByDesignation] = useState('');
  const [receivedByDate, setReceivedByDate] = useState('');

  const [lines, setLines] = useState<RequisitionLine[]>([newLine()]);
  /** Optional; kept when loading a draft that already had budget ids (no UI to change them). */
  const [fundSourceId, setFundSourceId] = useState('');
  const [budgetTypeId, setBudgetTypeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [rows, setRows] = useState<RequestWithRelations[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadMine = async () => {
    const data = await requestsAPI.getMyRequests();
    setRows(data);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setPageLoading(true);
      try {
        const data = await requestsAPI.getMyRequests();
        if (!mounted) return;
        setRows(data);
      } catch (e: any) {
        if (!mounted) return;
        setRows([]);
        setError(e?.message || 'Failed to load requests.');
      } finally {
        if (mounted) setPageLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const draftRows = useMemo(() => rows.filter((r) => r.status === 'Draft'), [rows]);
  const draftIdParam = (searchParams.get('draftId') || '').trim();

  const computedRows = useMemo(() => {
    return lines.map((l) => {
      const qty = Math.max(0, Number(l.quantity || 0));
      const unit = Math.max(0, Number(l.unitPrice || 0));
      return {
        ...l,
        qty,
        unit,
        rowTotal: qty * unit,
      };
    });
  }, [lines]);

  const totalQty = useMemo(() => computedRows.reduce((s, r) => s + r.qty, 0), [computedRows]);
  const grandTotal = useMemo(() => computedRows.reduce((s, r) => s + r.rowTotal, 0), [computedRows]);

  const resetForm = () => {
    // Division / Office-Section come from the profile and must not be cleared.
    // RIS / SAI numbers are assigned server-side on submit.
    setSubject('');
    setPurpose('');

    setRequestedByName('');
    setRequestedByDesignation('');
    setRequestedByDate('');

    setApprovedByName('');
    setApprovedByDesignation('');
    setApprovedByDate('');

    setIssuedByName('');
    setIssuedByDesignation('');
    setIssuedByDate('');

    setReceivedByName('');
    setReceivedByDesignation('');
    setReceivedByDate('');
    setEditingDraftId(null);

    setLines([newLine()]);
    setFundSourceId('');
    setBudgetTypeId('');
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, key: keyof RequisitionLine, value: string) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));

  const buildRequisitionCreatePayload = (): { error: string } | {
    item_name: string;
    description: string;
    requisition_payload: Record<string, unknown>;
    quantity: number;
    unit_price: number;
    budget_fund_source_id: string | null;
    college_budget_type_id: string | null;
  } => {
    const cleanSubject = subject.trim();
    if (!cleanSubject) {
      return { error: 'Subject is required.' };
    }
    const validLines = computedRows
      .filter((l) => l.itemDescription.trim() && l.qty > 0)
      .map((l) => ({
        ...l,
        // Auto-fix empty / numeric-only units (common confusion with Qty or
        // Unit Price) rather than blocking the user from submitting.
        unit: sanitizeUnitOfMeasure(l.unit),
      }));
    if (validLines.length === 0) {
      return { error: 'Add at least one line item with item description and quantity.' };
    }

    const fundLabel = '';
    const typeLabel = '';

    const descriptionText = [
      fundLabel ? `Funding source: ${fundLabel}` : null,
      typeLabel ? `Unit allotment / sub-category: ${typeLabel}` : null,
      `Division: ${division || '-'}`,
      `Office/Section: ${officeSection || '-'}`,
      // RIS No / SAI No are auto-assigned server-side and rendered from the
      // request row's columns, not from the description text.
      `Purpose: ${purpose || '-'}`,
      '',
      'Requisition Items:',
      ...validLines.map(
        (l, i) =>
          `${i + 1}. Unit: ${l.unit || '-'} | Item: ${l.itemDescription} | Qty: ${l.qty} | Unit Price: ${Number(l.unitPrice || 0)}`
      ),
      '',
      'Signatories:',
      `Requested by: ${requestedByName || '-'} | Designation: ${requestedByDesignation || '-'} | Date: ${requestedByDate || '-'}`,
      `Approved by: ${approvedByName || '-'} | Designation: ${approvedByDesignation || '-'} | Date: ${approvedByDate || '-'}`,
      `Issued by: ${issuedByName || '-'} | Designation: ${issuedByDesignation || '-'} | Date: ${issuedByDate || '-'}`,
      `Received by: - | Designation: - | Date: -`,
    ]
      .filter((line): line is string => line != null)
      .join('\n');

    const avgUnitPrice = totalQty > 0 ? grandTotal / totalQty : 0;
    const requisitionPayload = {
      header: {
        fundingSource: fundLabel || '-',
        unitAllotment: typeLabel || '-',
        division: division || '-',
        officeSection: officeSection || '-',
        purpose: purpose || '-',
      },
      items: validLines.map((l, i) => ({
        lineNo: i + 1,
        unit: l.unit || '-',
        item: l.itemDescription,
        qty: l.qty,
        unitPrice: Number(l.unitPrice || 0),
      })),
      signatories: {
        requestedBy: { name: requestedByName || '-', designation: requestedByDesignation || '-', date: requestedByDate || '-' },
        approvedBy: { name: approvedByName || '-', designation: approvedByDesignation || '-', date: approvedByDate || '-' },
        issuedBy: { name: issuedByName || '-', designation: issuedByDesignation || '-', date: issuedByDate || '-' },
        receivedBy: { name: '-', designation: '-', date: '-' },
      },
    };

    return {
      item_name: cleanSubject.slice(0, 120),
      description: descriptionText,
      requisition_payload: requisitionPayload,
      quantity: Math.max(1, Math.round(totalQty)),
      unit_price: Number(avgUnitPrice.toFixed(2)),
      budget_fund_source_id: fundSourceId.trim() || null,
      college_budget_type_id: budgetTypeId.trim() || null,
    };
  };

  const onCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    let payload: ReturnType<typeof buildRequisitionCreatePayload>;
    try {
      payload = buildRequisitionCreatePayload();
    } catch (err: any) {
      setError(err?.message || 'Could not build requisition payload. Please refresh and try again.');
      return;
    }
    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    setLoading(true);
    try {
      if (editingDraftId) {
        await requestsAPI.update(editingDraftId, {
          ...payload,
          status: 'Draft',
        });
      } else {
        await requestsAPI.create({
          ...payload,
          status: 'Draft',
        });
      }
      resetForm();
      await loadMine();
      setSuccess(editingDraftId ? 'Draft request updated.' : 'Draft request created.');
    } catch (err: any) {
      setError(err?.message || 'Failed to create request.');
    } finally {
      setLoading(false);
    }
  };

  const onSendRequest = async () => {
    setError('');
    setSuccess('');

    let payload: ReturnType<typeof buildRequisitionCreatePayload>;
    try {
      payload = buildRequisitionCreatePayload();
    } catch (err: any) {
      // Fallback path: if this is an existing draft, still allow submit of saved draft data.
      if (editingDraftId) {
        await onSubmitDraft(editingDraftId);
        return;
      }
      setError(err?.message || 'Could not build requisition payload. Please refresh and try again.');
      return;
    }
    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    setLoading(true);
    try {
      if (editingDraftId) {
        await requestsAPI.update(editingDraftId, {
          ...payload,
          status: 'Draft',
        });
        await requestsAPI.submit(editingDraftId);
      } else {
        const created = await requestsAPI.create({
          ...payload,
          status: 'Draft',
        });
        await requestsAPI.submit(created.id);
      }
      resetForm();
      await loadMine();
      setSuccess('Request sent to your assigned college (Pending). College Admin can review it in Request & History.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send request.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitDraft = async (id: string) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const draft = await requestsAPI.getById(id);
      if (!draft) {
        throw new Error('Draft not found.');
      }
      await requestsAPI.submit(id);
      await loadMine();
      setSuccess('Request submitted for approval.');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  const onEditDraft = (draft: RequestWithRelations) => {
    const parsed = parseRequisitionDescription(draft.description);
    if (parsed.kind !== 'structured') {
      setError('This draft cannot be edited in structured mode. Please recreate it.');
      return;
    }
    const { header, items, signatories } = parsed;
    setSubject(draft.item_name || '');
    setPurpose(header['Purpose'] || '');
    setRequestedByName(signatories.requestedBy.name === '-' ? '' : signatories.requestedBy.name);
    setRequestedByDesignation(signatories.requestedBy.designation === '-' ? '' : signatories.requestedBy.designation);
    setRequestedByDate(signatories.requestedBy.date === '-' ? '' : signatories.requestedBy.date);
    setApprovedByName(signatories.approvedBy.name === '-' ? '' : signatories.approvedBy.name);
    setApprovedByDesignation(signatories.approvedBy.designation === '-' ? '' : signatories.approvedBy.designation);
    setApprovedByDate(signatories.approvedBy.date === '-' ? '' : signatories.approvedBy.date);
    setIssuedByName(signatories.issuedBy.name === '-' ? '' : signatories.issuedBy.name);
    setIssuedByDesignation(signatories.issuedBy.designation === '-' ? '' : signatories.issuedBy.designation);
    setIssuedByDate(signatories.issuedBy.date === '-' ? '' : signatories.issuedBy.date);
    setLines(
      items.length > 0
        ? items.map((it) => ({
            // Auto-fix legacy drafts where Unit was mistakenly saved as a number
            // (e.g. "500"). Keep valid unit strings untouched.
            unit: (() => {
              const normalizedUnit = normalizeTrimmedText(it.unit);
              if (normalizedUnit === '-' || normalizedUnit === '') return '';
              return NUMERIC_ONLY_RE.test(normalizedUnit)
                ? DEFAULT_UNIT_FALLBACK
                : normalizedUnit;
            })(),
            itemDescription: it.item,
            quantity: String(it.qty || ''),
            unitPrice: String(it.unitPrice || ''),
          }))
        : [newLine()]
    );
    setFundSourceId(draft.budget_fund_source_id || '');
    setBudgetTypeId(draft.college_budget_type_id || '');
    setEditingDraftId(draft.id);
    setSuccess('Loaded draft for editing.');
  };

  useEffect(() => {
    if (!draftIdParam || rows.length === 0) return;
    const targetDraft = rows.find((r) => r.id === draftIdParam && r.status === 'Draft');
    if (!targetDraft) return;
    onEditDraft(targetDraft);
    const next = new URLSearchParams(searchParams);
    next.delete('draftId');
    setSearchParams(next, { replace: true });
  }, [draftIdParam, rows, searchParams, setSearchParams]);

  const onDeleteDraft = async (draft: RequestWithRelations) => {
    const confirmed = window.confirm(`Delete draft "${draft.item_name}"? This cannot be undone.`);
    if (!confirmed) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await requestsAPI.delete(draft.id);
      if (editingDraftId === draft.id) resetForm();
      await loadMine();
      setSuccess('Draft deleted.');
    } catch (err: any) {
      setError(err?.message || 'Failed to delete draft.');
    } finally {
      setLoading(false);
    }
  };

  const onDuplicateDraft = async (draft: RequestWithRelations) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await requestsAPI.create({
        item_name: `${draft.item_name} (Copy)`.slice(0, 120),
        description: draft.description || '',
        requisition_payload: (draft.requisition_payload as Record<string, unknown> | null) ?? null,
        quantity: Number(draft.quantity || 1),
        unit_price: Number(draft.unit_price || 0),
        budget_fund_source_id: draft.budget_fund_source_id || null,
        college_budget_type_id: draft.college_budget_type_id || null,
        status: 'Draft',
      });
      await loadMine();
      setSuccess('Draft duplicated.');
    } catch (err: any) {
      setError(err?.message || 'Failed to duplicate draft.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <CenteredAlert error={error || undefined} success={success || undefined} onClose={() => { setError(''); setSuccess(''); }} />

      <div>
        <h1 className="text-3xl font-bold text-gray-900">New Request</h1>
        <p className="text-base text-gray-500 mt-1">
          Fill out the requisition, complete signatories, then save a <strong>draft</strong> or <strong>Send Request</strong> to route it to your assigned college (Pending).
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <form onSubmit={onCreateDraft} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Division
                <span className="ml-1 text-xs font-normal text-gray-400">(from your profile)</span>
              </label>
              <div
                aria-readonly="true"
                title="Locked to your assigned college"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {profileReady ? (division || '—') : 'Loading…'}
                </span>
                <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
              </div>
              <input type="hidden" name="division" value={division} readOnly />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Office / Section
                <span className="ml-1 text-xs font-normal text-gray-400">(from your profile)</span>
              </label>
              <div
                aria-readonly="true"
                title="Locked to your assigned department"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-700 flex items-center justify-between gap-2"
              >
                <span className="truncate">
                  {profileReady ? (officeSection || '—') : 'Loading…'}
                </span>
                <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-hidden />
              </div>
              <input type="hidden" name="officeSection" value={officeSection} readOnly />
            </div>
            <div className="md:col-span-2">
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-700">RIS No.</span> and{' '}
                <span className="font-medium text-gray-700">SAI No.</span> are automatically
                generated in the format <code className="font-mono">RIS-YYYY-0001</code> when the
                request is sent, and will appear in your Request &amp; History.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-800 mb-1">
                Subject <span className="text-red-700">*</span>
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                placeholder="Enter request subject"
                required
                maxLength={120}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-800 mb-1">Purpose</label>
              <input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600"
              />
            </div>
          </div>

          <datalist id="requisition-unit-options">
            {UNIT_OF_MEASURE_OPTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                    Unit of Measure
                    <span className="ml-1 text-[10px] font-normal normal-case text-gray-400">(e.g. pcs, box, kg)</span>
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Item / Description</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Req Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Est Unit Price</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => {
                  // Soft validation: warn (non-blocking) when the user typed a
                  // bare number into Unit of Measure. That's almost always a
                  // mix-up with Req Qty or Unit Price. On submit, these values
                  // are auto-corrected to "pcs" so the form never blocks.
                  const normalizedLineUnit = normalizeTrimmedText(line.unit);
                  const unitLooksLikeNumber =
                    normalizedLineUnit !== '' && NUMERIC_ONLY_RE.test(normalizedLineUnit);
                  return (
                  <tr key={idx} className="border-t border-gray-100 align-top">
                    <td className="px-2 py-2">
                      <input
                        list="requisition-unit-options"
                        value={line.unit}
                        onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                        placeholder="pcs"
                        maxLength={12}
                        aria-invalid={unitLooksLikeNumber || undefined}
                        className={`w-24 px-2 py-1.5 rounded border ${
                          unitLooksLikeNumber
                            ? 'border-amber-400 bg-amber-50 focus:ring-2 focus:ring-amber-400'
                            : 'border-gray-300'
                        }`}
                      />
                      {unitLooksLikeNumber ? (
                        <p className="mt-1 text-[11px] text-amber-700">
                          Numbers go in <strong>Req Qty</strong> or <strong>Est Unit Price</strong>. Use a unit of measure here (e.g. <em>pcs</em>). This value will be saved as <strong>pcs</strong> on submit.
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={line.itemDescription}
                        onChange={(e) => updateLine(idx, 'itemDescription', e.target.value)}
                        className="w-64 px-2 py-1.5 rounded border border-gray-300"
                        placeholder="Item description"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                        className="w-20 px-2 py-1.5 rounded border border-gray-300"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(idx, 'unitPrice', e.target.value)}
                        className="w-28 px-2 py-1.5 rounded border border-gray-300"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        disabled={lines.length === 1}
                        className="p-1.5 rounded text-red-700 hover:bg-red-50 disabled:opacity-40"
                        aria-label="Remove line"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <PlusCircle className="w-4 h-4" />
              Add line
            </button>
          </div>

          <div className="mt-3 w-fit ml-auto rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-800">Live requisition total</p>
            <p className="mt-1 text-base text-gray-900">
              Requested Qty: <span className="font-bold">{totalQty}</span>
              <span className="mx-2 text-gray-400">|</span>
              Estimated total: <span className="font-bold text-red-900">{money(grandTotal)}</span>
            </p>
            {editingDraftId ? <span className="ml-2 text-amber-700">(Editing draft)</span> : null}
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Signatories</h3>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Requested by</p>
                <div className="mt-3 space-y-2">
                  <input
                    value={requestedByName}
                    onChange={(e) => setRequestedByName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Name"
                  />
                  <input
                    value={requestedByDesignation}
                    onChange={(e) => setRequestedByDesignation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Designation"
                  />
                  <input
                    type="date"
                    value={requestedByDate}
                    onChange={(e) => setRequestedByDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Approved by</p>
                <div className="mt-3 space-y-2">
                  <input
                    value={approvedByName}
                    onChange={(e) => setApprovedByName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Name"
                  />
                  <input
                    value={approvedByDesignation}
                    onChange={(e) => setApprovedByDesignation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Designation"
                  />
                  <input
                    type="date"
                    value={approvedByDate}
                    onChange={(e) => setApprovedByDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Issued by</p>
                <div className="mt-3 space-y-2">
                  <input
                    value={issuedByName}
                    onChange={(e) => setIssuedByName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Name"
                  />
                  <input
                    value={issuedByDesignation}
                    onChange={(e) => setIssuedByDesignation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Designation"
                  />
                  <input
                    type="date"
                    value={issuedByDate}
                    onChange={(e) => setIssuedByDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">Received by</p>
                <p className="text-xs text-gray-500 mt-1 mb-3">
                  Filled in by your college admin during processing.
                </p>
                <div className="mt-1 space-y-2">
                  <input
                    disabled
                    value={receivedByName}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                    placeholder="Name"
                  />
                  <input
                    disabled
                    value={receivedByDesignation}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                    placeholder="Designation"
                  />
                  <input
                    disabled
                    value={receivedByDate}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                    placeholder="Date"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6 mt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Send Request</strong> submits to your assigned college (Pending). <strong>Create draft</strong> saves without submitting; use Submit in the list below later.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-900 text-red-900 bg-white hover:bg-red-50 disabled:opacity-50 min-w-[200px]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  {editingDraftId ? 'Save draft changes' : 'Create requisition draft'}
                </button>
                {editingDraftId ? (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={resetForm}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 min-w-[200px]"
                  >
                    Cancel editing
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void onSendRequest()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-900 text-white hover:bg-red-800 disabled:opacity-50 min-w-[200px]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Request
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">Your Draft Requests</h2>
        <p className="text-sm text-gray-500 mt-1">Submit drafts to notify College Admin / WMSU Admin workflows.</p>

        {pageLoading ? (
          <div className="min-h-[20vh] flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-red-900 animate-spin" />
          </div>
        ) : draftRows.length === 0 ? (
          <div className="text-sm text-gray-500 mt-4">No drafts yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {draftRows.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-gray-100">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{r.item_name}</p>
                  <p className="text-sm text-gray-500">
                    {r.quantity} × {money(r.unit_price)} = <span className="font-medium text-gray-700">{money(r.total_price)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => onEditDraft(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onDuplicateDraft(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onDeleteDraft(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-300 text-red-800 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onSubmitDraft(r.id)}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    Submit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

