import React, { useEffect, useMemo, useState } from 'react';
import { requestsAPI } from '../lib/supabaseApi';
import type { RequestWithRelations } from '../types/database';
import { CenteredAlert } from '../components/CenteredAlert';
import { Loader2, PlusCircle, Send, Trash2 } from 'lucide-react';

const money = (n: number) => `₱${Number(n || 0).toLocaleString()}`;
type RequisitionLine = {
  stockNo: string;
  unit: string;
  itemDescription: string;
  quantity: string;
  unitPrice: string;
};

const newLine = (): RequisitionLine => ({
  stockNo: '',
  unit: '',
  itemDescription: '',
  quantity: '',
  unitPrice: '',
});

export default function FacultyNewRequest() {
  const [division, setDivision] = useState('');
  const [officeSection, setOfficeSection] = useState('');
  const [risNo, setRisNo] = useState('');
  const [saiNo, setSaiNo] = useState('');
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
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [rows, setRows] = useState<RequestWithRelations[]>([]);
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
    setDivision('');
    setOfficeSection('');
    setRisNo('');
    setSaiNo('');
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

    setLines([newLine()]);
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const updateLine = (idx: number, key: keyof RequisitionLine, value: string) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [key]: value } : l)));

  const buildRequisitionCreatePayload = (): { error: string } | {
    item_name: string;
    description: string;
    quantity: number;
    unit_price: number;
  } => {
    const validLines = computedRows.filter((l) => l.itemDescription.trim() && l.qty > 0);
    if (validLines.length === 0) {
      return { error: 'Add at least one line item with item description and quantity.' };
    }

    const descriptionText = [
      `Division: ${division || '-'}`,
      `Office/Section: ${officeSection || '-'}`,
      `RIS No: ${risNo || '-'}`,
      `SAI No: ${saiNo || '-'}`,
      `Purpose: ${purpose || '-'}`,
      '',
      'Requisition Items:',
      ...validLines.map(
        (l, i) =>
          `${i + 1}. Stock No: ${l.stockNo || '-'} | Unit: ${l.unit || '-'} | Item: ${l.itemDescription} | Qty: ${l.qty} | Unit Price: ${Number(l.unitPrice || 0)}`
      ),
      '',
      'Signatories:',
      `Requested by: ${requestedByName || '-'} | Designation: ${requestedByDesignation || '-'} | Date: ${requestedByDate || '-'}`,
      `Approved by: ${approvedByName || '-'} | Designation: ${approvedByDesignation || '-'} | Date: ${approvedByDate || '-'}`,
      `Issued by: ${issuedByName || '-'} | Designation: ${issuedByDesignation || '-'} | Date: ${issuedByDate || '-'}`,
      `Received by: ${receivedByName || '-'} | Designation: ${receivedByDesignation || '-'} | Date: ${receivedByDate || '-'}`,
    ].join('\n');

    const avgUnitPrice = totalQty > 0 ? grandTotal / totalQty : 0;
    const requestTitle = `RIS ${risNo || 'N/A'} - ${officeSection || division || 'Requisition'}`;

    return {
      item_name: requestTitle.slice(0, 120),
      description: descriptionText,
      quantity: Math.max(1, Math.round(totalQty)),
      unit_price: Number(avgUnitPrice.toFixed(2)),
    };
  };

  const onCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = buildRequisitionCreatePayload();
    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    setLoading(true);
    try {
      await requestsAPI.create({
        ...payload,
        status: 'Draft',
      });
      resetForm();
      await loadMine();
      setSuccess('Draft request created.');
    } catch (err: any) {
      setError(err?.message || 'Failed to create request.');
    } finally {
      setLoading(false);
    }
  };

  const onSendRequest = async () => {
    setError('');
    setSuccess('');

    const payload = buildRequisitionCreatePayload();
    if ('error' in payload) {
      setError(payload.error);
      return;
    }

    setLoading(true);
    try {
      const created = await requestsAPI.create({
        ...payload,
        status: 'Draft',
      });
      await requestsAPI.submit(created.id);
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
      await requestsAPI.submit(id);
      await loadMine();
      setSuccess('Request submitted for approval.');
    } catch (err: any) {
      setError(err?.message || 'Failed to submit request.');
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
              <label className="block text-sm font-medium text-gray-800 mb-1">Division</label>
              <input
                value={division}
                onChange={(e) => setDivision(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600"
                placeholder="e.g., OPD"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">Office / Section</label>
              <input
                value={officeSection}
                onChange={(e) => setOfficeSection(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">RIS No.</label>
              <input
                value={risNo}
                onChange={(e) => setRisNo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-800 mb-1">SAI No.</label>
              <input
                value={saiNo}
                onChange={(e) => setSaiNo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-600 focus:border-red-600"
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

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Stock No</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Item / Description</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Req Qty</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Est Unit Price</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="px-2 py-2">
                      <input
                        value={line.stockNo}
                        onChange={(e) => updateLine(idx, 'stockNo', e.target.value)}
                        className="w-24 px-2 py-1.5 rounded border border-gray-300"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        value={line.unit}
                        onChange={(e) => updateLine(idx, 'unit', e.target.value)}
                        className="w-20 px-2 py-1.5 rounded border border-gray-300"
                      />
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
                ))}
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

              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm font-semibold text-gray-900">Received by</p>
                <div className="mt-3 space-y-2">
                  <input
                    value={receivedByName}
                    onChange={(e) => setReceivedByName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Name"
                  />
                  <input
                    value={receivedByDesignation}
                    onChange={(e) => setReceivedByDesignation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    placeholder="Designation"
                  />
                  <input
                    type="date"
                    value={receivedByDate}
                    onChange={(e) => setReceivedByDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-6 mt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>Send Request</strong> submits to your assigned college (Pending). <strong>Create draft</strong> saves without submitting; use Submit in the list below later.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-sm text-gray-600">
                Requested Qty: <span className="font-semibold text-gray-900">{totalQty}</span> | Estimated total:{' '}
                <span className="font-semibold text-gray-900">{money(grandTotal)}</span>
              </div>
              <div className="flex flex-wrap gap-3 justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-red-900 text-red-900 bg-white hover:bg-red-50 disabled:opacity-50 min-w-[200px]"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                  Create requisition draft
                </button>
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
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void onSubmitDraft(r.id)}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Submit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

