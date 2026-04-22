import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, Printer } from 'lucide-react';
import { integrityAPI, requestsAPI } from '../lib/supabaseApi';
import { useAuth } from '../context/AuthContext';
import type { IntegrityEventWithActor, RequestWithRelations } from '../types/database';
import RequisitionDocumentView from '../components/RequisitionDocumentView';
import { parseRequisitionDescription } from '../lib/parseRequisitionDescription';

type SnapshotShape = {
  item_name?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  total_price?: number | null;
  status?: string | null;
  ris_no?: string | null;
  sai_no?: string | null;
};

const toObject = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const snapshotFromCurrent = (r: RequestWithRelations): SnapshotShape => ({
  item_name: r.item_name,
  description: r.description,
  quantity: r.quantity,
  unit_price: r.unit_price,
  total_price: r.total_price,
  status: r.status,
  ris_no: r.ris_no,
  sai_no: r.sai_no,
});

export default function RequisitionIntegrityTimeline() {
  const { isDeptHead } = useAuth();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const [requestRow, setRequestRow] = useState<RequestWithRelations | null>(null);
  const [events, setEvents] = useState<IntegrityEventWithActor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const backPath = isDeptHead() ? '/dept-head/request-history' : '/faculty/request-history';

  useEffect(() => {
    if (!requestId) {
      setError('Missing requisition id.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    void Promise.all([requestsAPI.getById(requestId), integrityAPI.getTimelineByRequestId(requestId)])
      .then(([req, timeline]) => {
        if (cancelled) return;
        setRequestRow(req);
        setEvents(timeline);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e?.message || 'Failed to load integrity timeline.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  const legacyUnhashed = useMemo(
    () => !requestRow?.submitted_payload_hash || requestRow.last_integrity_reason === 'legacy_unhashed',
    [requestRow]
  );
  const submittedSnapshot = useMemo<SnapshotShape | null>(() => {
    if (!requestRow?.submitted_snapshot || typeof requestRow.submitted_snapshot !== 'object') return null;
    return requestRow.submitted_snapshot as SnapshotShape;
  }, [requestRow]);
  const fallbackOriginalFromFirstEdit = useMemo<SnapshotShape | null>(() => {
    if (!requestRow) return null;
    const firstAdminEdit = [...events]
      .filter((ev) => ev.event_type === 'admin_edit')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    if (!firstAdminEdit) return null;
    const before = toObject(firstAdminEdit.before_payload);
    if (!before) return null;
    return {
      item_name: requestRow.item_name,
      description: typeof before.description === 'string' ? before.description : requestRow.description,
      quantity: typeof before.quantity === 'number' ? before.quantity : requestRow.quantity,
      unit_price: typeof before.unit_price === 'number' ? before.unit_price : requestRow.unit_price,
      total_price: typeof before.total_price === 'number' ? before.total_price : requestRow.total_price,
      status: typeof before.status === 'string' ? before.status : 'Pending',
      ris_no: requestRow.ris_no,
      sai_no: requestRow.sai_no,
    };
  }, [events, requestRow]);
  const effectiveOriginalSnapshot = submittedSnapshot || fallbackOriginalFromFirstEdit;
  const currentSnapshot = useMemo<SnapshotShape | null>(
    () => (requestRow ? snapshotFromCurrent(requestRow) : null),
    [requestRow]
  );
  const originalRequestForView = useMemo<RequestWithRelations | null>(() => {
    if (!requestRow || !effectiveOriginalSnapshot) return null;
    return {
      ...requestRow,
      item_name: effectiveOriginalSnapshot.item_name || requestRow.item_name,
      description: effectiveOriginalSnapshot.description ?? requestRow.description,
      quantity: Number(effectiveOriginalSnapshot.quantity ?? requestRow.quantity ?? 0),
      unit_price: Number(effectiveOriginalSnapshot.unit_price ?? requestRow.unit_price ?? 0),
      total_price: Number(effectiveOriginalSnapshot.total_price ?? requestRow.total_price ?? 0),
      status: (effectiveOriginalSnapshot.status as any) || requestRow.status,
      ris_no: effectiveOriginalSnapshot.ris_no ?? requestRow.ris_no,
      sai_no: effectiveOriginalSnapshot.sai_no ?? requestRow.sai_no,
    };
  }, [requestRow, effectiveOriginalSnapshot]);
  const currentRequestForView = useMemo<RequestWithRelations | null>(() => {
    if (!requestRow || !currentSnapshot) return null;
    return {
      ...requestRow,
      item_name: currentSnapshot.item_name || requestRow.item_name,
      description: currentSnapshot.description ?? requestRow.description,
      quantity: Number(currentSnapshot.quantity ?? requestRow.quantity ?? 0),
      unit_price: Number(currentSnapshot.unit_price ?? requestRow.unit_price ?? 0),
      total_price: Number(currentSnapshot.total_price ?? requestRow.total_price ?? 0),
      status: (currentSnapshot.status as any) || requestRow.status,
      ris_no: currentSnapshot.ris_no ?? requestRow.ris_no,
      sai_no: currentSnapshot.sai_no ?? requestRow.sai_no,
    };
  }, [requestRow, currentSnapshot]);
  const originalParsed = useMemo(
    () => parseRequisitionDescription(originalRequestForView?.description ?? ''),
    [originalRequestForView?.description]
  );
  const currentParsed = useMemo(
    () => parseRequisitionDescription(currentRequestForView?.description ?? ''),
    [currentRequestForView?.description]
  );
  const hasCollegeAdminEdit = useMemo(
    () => events.some((ev) => ev.event_type === 'admin_edit'),
    [events]
  );

  /** Which RIS block to treat as the sole `print-document-root` for this print job. */
  const [printFocus, setPrintFocus] = useState<'original' | 'current' | null>(null);

  const printForm = useCallback((which: 'original' | 'current') => {
    setPrintFocus(which);
    const clear = () => {
      setPrintFocus(null);
      window.removeEventListener('afterprint', clear);
    };
    window.addEventListener('afterprint', clear);
    window.setTimeout(() => {
      window.print();
    }, 50);
    window.setTimeout(clear, 4000);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Requisition Integrity Timeline</h1>
          <p className="text-base text-gray-500 mt-1">
            Full audit chain for admin edits and sensitive status decisions.
          </p>
        </div>
        <Link
          to={backPath}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
        >
          Back to history
        </Link>
      </div>

      {loading ? (
        <div className="min-h-[30vh] flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-red-900 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</div>
      ) : !requestRow ? (
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">Request not found.</div>
      ) : (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-900 font-semibold">{requestRow.item_name}</p>
            <p className="text-xs text-gray-500 mt-1">RIS: {requestRow.ris_no || '—'} · SAI: {requestRow.sai_no || '—'}</p>
            <p className="text-xs text-gray-500 mt-1">
              Integrity version: <span className="font-semibold text-gray-800">{requestRow.integrity_version || 1}</span>
            </p>
            {legacyUnhashed ? null : null}
          </section>

          {hasCollegeAdminEdit ? (
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-base font-semibold text-gray-900">Original vs edited RIS copies</h2>
                <p className="text-xs text-gray-500">
                  Same Requisition and Issue Slip format, separated for comparison.
                </p>
              </div>
              {!originalRequestForView || !currentRequestForView ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Original submitted form copy is unavailable for this record. This usually happens on older submissions created before snapshot capture was introduced.
                </p>
              ) : (
                <div className="space-y-4">
                  <article
                    className={`rounded-lg border border-red-200 bg-white p-3 overflow-hidden max-w-4xl mx-auto ${
                      printFocus === 'original' ? 'print-document-root' : ''
                    } ${printFocus && printFocus !== 'original' ? 'print-hide' : ''}`}
                  >
                    <div className="print-hide flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-xs uppercase tracking-wide font-semibold text-red-800">
                          Original submitted copy
                        </p>
                        {!submittedSnapshot && fallbackOriginalFromFirstEdit ? (
                          <p className="mt-1 text-[11px] text-amber-800">
                            Fallback source: first admin edit (before-values).
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => printForm('original')}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-50"
                      >
                        <Printer className="h-3.5 w-3.5" aria-hidden />
                        Print this form
                      </button>
                    </div>
                    <div className="print-document-content">
                      <div className="origin-top-left scale-90 w-[111.111111%]">
                        <RequisitionDocumentView request={originalRequestForView} parsed={originalParsed} />
                      </div>
                    </div>
                  </article>
                  <article
                    className={`rounded-lg border border-green-200 bg-white p-3 overflow-hidden max-w-4xl mx-auto ${
                      printFocus === 'current' ? 'print-document-root' : ''
                    } ${printFocus && printFocus !== 'current' ? 'print-hide' : ''}`}
                  >
                    <div className="print-hide flex flex-wrap items-start justify-between gap-2 mb-2">
                      <p className="text-xs uppercase tracking-wide font-semibold text-green-800">Current edited copy</p>
                      <button
                        type="button"
                        onClick={() => printForm('current')}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-50"
                      >
                        <Printer className="h-3.5 w-3.5" aria-hidden />
                        Print this form
                      </button>
                    </div>
                    <div className="print-document-content">
                      <div className="origin-top-left scale-90 w-[111.111111%]">
                        <RequisitionDocumentView request={currentRequestForView} parsed={currentParsed} />
                      </div>
                    </div>
                  </article>
                </div>
              )}
            </section>
          ) : null}

          <section className="space-y-3">
            {events.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
                No integrity events recorded yet.
              </div>
            ) : (
              events.map((ev) => (
                <article key={ev.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{ev.event_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{new Date(ev.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Actor: {ev.actor?.full_name || ev.actor?.email || 'System'}
                  </p>
                  {ev.reason ? (
                    <p className="mt-2 text-sm text-gray-800">
                      <span className="font-medium">Reason:</span> {ev.reason}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </section>
        </>
      )}
    </div>
  );
}
