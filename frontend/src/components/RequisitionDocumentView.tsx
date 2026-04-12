import type { RequestWithRelations } from '../types/database';
import type { ParsedRequisition, ParsedRequisitionItem, ParsedSignatory } from '../lib/parseRequisitionDescription';
import { HEADER_FIELD_ORDER } from '../lib/parseRequisitionDescription';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Props = {
  request: RequestWithRelations;
  parsed: ParsedRequisition;
  /** College admin adjust mode: inline editors for line items. */
  editableLineItems?: {
    items: ParsedRequisitionItem[];
    onChange: (items: ParsedRequisitionItem[]) => void;
  } | null;
  /** Department (faculty) view: Approved by / Issued by are read-only; college admin completes these. */
  lockCollegeSignatories?: boolean;
  /** College admin: edit Approved by / Issued by (saved with approval or Save as approved). */
  collegeSignatoriesEdit?: {
    approvedBy: ParsedSignatory;
    issuedBy: ParsedSignatory;
    onChange: (next: { approvedBy: ParsedSignatory; issuedBy: ParsedSignatory }) => void;
  } | null;
  /** College admin view only: show selected budget type for the request. */
  showBudgetTypeUsed?: boolean;
};

function RawBlock({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-gray-800">
      <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide mb-2">Request details (text)</p>
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{text || '—'}</pre>
    </div>
  );
}

function SignatoryCard({
  title,
  s,
}: {
  title: string;
  s: { name: string; designation: string; date: string };
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-4">
      <p className="text-xs font-bold text-red-900 uppercase tracking-wide border-b border-red-200/60 pb-2 mb-3">
        {title}
      </p>
      <dl className="space-y-2 text-sm">
        <div>
          <dt className="text-gray-500 text-xs">Name</dt>
          <dd className="font-medium text-gray-900">{s.name || '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Designation</dt>
          <dd className="text-gray-900">{s.designation || '—'}</dd>
        </div>
        <div>
          <dt className="text-gray-500 text-xs">Date</dt>
          <dd className="text-gray-900">{s.date || '—'}</dd>
        </div>
      </dl>
    </div>
  );
}

function sigInputDisplay(v: string) {
  const t = v.trim();
  if (t === '—' || t === '-') return '';
  return v;
}

function SignatoryInputCard({
  title,
  value,
  disabled,
  onChange,
  disabledHint,
}: {
  title: string;
  value: ParsedSignatory;
  disabled: boolean;
  onChange?: (next: ParsedSignatory) => void;
  disabledHint?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        disabled ? 'border-gray-200 bg-gray-100/90' : 'border-gray-200 bg-gray-50/80'
      }`}
    >
      <p className="text-xs font-bold text-red-900 uppercase tracking-wide border-b border-red-200/60 pb-2 mb-3">
        {title}
      </p>
      <div className="mt-1 space-y-2">
        <input
          disabled={disabled}
          value={sigInputDisplay(value.name)}
          onChange={(e) => onChange?.({ ...value, name: e.target.value })}
          placeholder="Name"
          title={disabled ? disabledHint : undefined}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
        />
        <input
          disabled={disabled}
          value={sigInputDisplay(value.designation)}
          onChange={(e) => onChange?.({ ...value, designation: e.target.value })}
          placeholder="Designation"
          title={disabled ? disabledHint : undefined}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
        />
        <input
          type={disabled ? 'text' : 'date'}
          disabled={disabled}
          value={disabled ? (sigInputDisplay(value.date) || '—') : sigInputDisplay(value.date)}
          onChange={(e) => onChange?.({ ...value, date: e.target.value })}
          placeholder="mm/dd/yyyy"
          title={disabled ? disabledHint : undefined}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm bg-white disabled:bg-gray-100 disabled:text-gray-600 disabled:cursor-not-allowed"
        />
      </div>
      {disabled && disabledHint ? (
        <p className="mt-2 text-[11px] text-gray-500 leading-snug">{disabledHint}</p>
      ) : null}
    </div>
  );
}

export default function RequisitionDocumentView({
  request,
  parsed,
  editableLineItems,
  lockCollegeSignatories = false,
  collegeSignatoriesEdit = null,
  showBudgetTypeUsed = false,
}: Props) {
  const req = request.requester;
  const collegeName = req?.department ?? null;
  const deptUnit = req?.faculty_department?.trim() || null;

  if (parsed.kind === 'raw') {
    return (
      <div className="space-y-4">
        <DocumentMeta request={request} collegeName={collegeName} deptUnit={deptUnit} showBudgetTypeUsed={showBudgetTypeUsed} />
        <RawBlock text={parsed.text} />
      </div>
    );
  }

  const { header, items, signatories } = parsed;
  const displayItems = editableLineItems?.items ?? items;
  const lineTotal = (it: ParsedRequisitionItem) => it.qty * it.unitPrice;
  const grandTotal = displayItems.reduce((s, it) => s + lineTotal(it), 0);
  const totalQty = displayItems.reduce((s, it) => s + it.qty, 0);

  const patchLine = (index: number, patch: Partial<ParsedRequisitionItem>) => {
    if (!editableLineItems) return;
    const next = displayItems.map((it, i) => {
      if (i !== index) return { ...it, lineNo: i + 1 };
      return { ...it, ...patch, lineNo: i + 1 };
    });
    editableLineItems.onChange(next);
  };

  return (
    <div className="space-y-6">
      <DocumentMeta request={request} collegeName={collegeName} deptUnit={deptUnit} showBudgetTypeUsed={showBudgetTypeUsed} />

      <section>
        <h3 className="text-sm font-bold text-red-950 uppercase tracking-wide border-b-2 border-red-900/20 pb-2 mb-4">
          Requisition header
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {HEADER_FIELD_ORDER.map(({ key, label }) => (
            <div key={key} className={key === 'Purpose' ? 'sm:col-span-2' : ''}>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-sm text-gray-900 font-medium border-b border-gray-100 pb-1.5 min-h-[1.5rem]">
                {header[key]?.trim() || '—'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-red-950 uppercase tracking-wide border-b-2 border-red-900/20 pb-2 mb-4">
          Line items{editableLineItems ? ' (editing)' : ''}
        </h3>
        {editableLineItems ? (
          <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            Edit quantities, prices, or descriptions below, then use <strong>Save as approved</strong> in the footer.
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-red-950 text-white">
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase">#</th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Stock No</th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase">Unit</th>
                <th className="px-3 py-3 text-left font-semibold text-xs uppercase min-w-[180px]">Item / Description</th>
                <th className="px-3 py-3 text-right font-semibold text-xs uppercase">Req Qty</th>
                <th className="px-3 py-3 text-right font-semibold text-xs uppercase">Est unit price</th>
                <th className="px-3 py-3 text-right font-semibold text-xs uppercase">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                    No line items could be read from this record. See raw details below if shown.
                  </td>
                </tr>
              ) : null}
              {displayItems.map((it, rowIdx) => (
                <tr key={`${it.lineNo}-${rowIdx}`} className="hover:bg-gray-50/80">
                  <td className="px-3 py-3 text-gray-600 font-mono text-xs">{rowIdx + 1}</td>
                  {editableLineItems ? (
                    <>
                      <td className="px-2 py-2">
                        <input
                          value={it.stockNo}
                          onChange={(e) => patchLine(rowIdx, { stockNo: e.target.value })}
                          className="w-full min-w-[4rem] px-2 py-1.5 rounded border border-gray-300 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={it.unit}
                          onChange={(e) => patchLine(rowIdx, { unit: e.target.value })}
                          className="w-full min-w-[3rem] px-2 py-1.5 rounded border border-gray-300 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          value={it.item}
                          onChange={(e) => patchLine(rowIdx, { item: e.target.value })}
                          className="w-full min-w-[8rem] px-2 py-1.5 rounded border border-gray-300 text-sm"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={it.qty}
                          onChange={(e) => patchLine(rowIdx, { qty: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full min-w-[4rem] px-2 py-1.5 rounded border border-gray-300 text-sm text-right tabular-nums"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) =>
                            patchLine(rowIdx, { unitPrice: Math.max(0, Number(e.target.value) || 0) })
                          }
                          className="w-full min-w-[5rem] px-2 py-1.5 rounded border border-gray-300 text-sm text-right tabular-nums"
                        />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-3 text-gray-900">{it.stockNo || '—'}</td>
                      <td className="px-3 py-3 text-gray-900">{it.unit || '—'}</td>
                      <td className="px-3 py-3 text-gray-900">{it.item}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{it.qty}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(it.unitPrice)}</td>
                    </>
                  )}
                  <td className="px-3 py-3 text-right font-medium tabular-nums text-gray-900">
                    {money(lineTotal(it))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td colSpan={4} className="px-3 py-3 text-right font-semibold text-gray-800">
                  Totals
                </td>
                <td className="px-3 py-3 text-right font-bold tabular-nums text-gray-900">{totalQty}</td>
                <td className="px-3 py-3 text-right text-gray-500 text-xs">—</td>
                <td className="px-3 py-3 text-right font-bold text-red-900 tabular-nums">{money(grandTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Request record total (system): {money(request.total_price || 0)} · Qty (system): {request.quantity}
        </p>
      </section>

      <section>
        <h3 className="text-sm font-bold text-red-950 uppercase tracking-wide border-b-2 border-red-900/20 pb-2 mb-4">
          Signatories
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SignatoryCard title="Requested by" s={signatories.requestedBy} />
          {collegeSignatoriesEdit ? (
            <>
              <SignatoryInputCard
                title="Approved by"
                value={collegeSignatoriesEdit.approvedBy}
                disabled={false}
                onChange={(approvedBy) =>
                  collegeSignatoriesEdit.onChange({
                    approvedBy,
                    issuedBy: collegeSignatoriesEdit.issuedBy,
                  })
                }
              />
              <SignatoryInputCard
                title="Issued by"
                value={collegeSignatoriesEdit.issuedBy}
                disabled={false}
                onChange={(issuedBy) =>
                  collegeSignatoriesEdit.onChange({
                    approvedBy: collegeSignatoriesEdit.approvedBy,
                    issuedBy,
                  })
                }
              />
            </>
          ) : lockCollegeSignatories ? (
            <>
              <SignatoryInputCard
                title="Approved by"
                value={signatories.approvedBy}
                disabled
                disabledHint="Completed by your college admin when the request is processed."
              />
              <SignatoryInputCard
                title="Issued by"
                value={signatories.issuedBy}
                disabled
                disabledHint="Completed by your college admin when the request is processed."
              />
            </>
          ) : (
            <>
              <SignatoryCard title="Approved by" s={signatories.approvedBy} />
              <SignatoryCard title="Issued by" s={signatories.issuedBy} />
            </>
          )}
          <SignatoryCard title="Received by" s={signatories.receivedBy} />
        </div>
      </section>
    </div>
  );
}

function DocumentMeta({
  request,
  collegeName,
  deptUnit,
  showBudgetTypeUsed,
}: {
  request: RequestWithRelations;
  collegeName: string | null;
  deptUnit: string | null;
  showBudgetTypeUsed: boolean;
}) {
  const r = request.requester;
  return (
    <div className="rounded-xl border-2 border-red-900/15 bg-gradient-to-b from-white to-gray-50/90 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 pb-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-red-900 uppercase tracking-wider">Procurement requisition</p>
          <h2 className="text-xl font-bold text-gray-900 mt-1">{request.item_name || 'Requisition'}</h2>
          <p className="text-sm text-gray-600 mt-1">
            Requester:{' '}
            <span className="font-medium text-gray-900">{r?.full_name ?? '—'}</span>
            {r?.email ? <span className="text-gray-500"> · {r.email}</span> : null}
          </p>
        </div>
        <div className="text-right text-sm space-y-1">
          <p>
            <span className="text-gray-500">Status:</span>{' '}
            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-900">
              {request.status}
            </span>
          </p>
          <p className="text-gray-600">
            <span className="text-gray-500">Submitted:</span>{' '}
            {new Date(request.created_at).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 font-mono">ID: {request.id}</p>
        </div>
      </div>
      {(collegeName || deptUnit) && (
        <div className="flex flex-wrap gap-4 text-sm">
          {collegeName ? (
            <p>
              <span className="text-gray-500">College:</span>{' '}
              <span className="font-semibold text-gray-900">{collegeName}</span>
            </p>
          ) : null}
          {deptUnit ? (
            <p>
              <span className="text-gray-500">Department:</span>{' '}
              <span className="font-semibold text-gray-900">{deptUnit}</span>
            </p>
          ) : null}
          {showBudgetTypeUsed ? (
            <p>
              <span className="text-gray-500">Budget type used:</span>{' '}
              <span className="font-semibold text-gray-900">
                {request.college_budget_type
                  ? `${request.college_budget_type.fund_code ? `${request.college_budget_type.fund_code} - ` : ''}${request.college_budget_type.name}`
                  : '—'}
              </span>
            </p>
          ) : null}
        </div>
      )}
      {(request.quantity_received != null || request.partial_delivery_remarks) && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/90 p-3 text-sm text-blue-950">
          <p className="font-semibold text-blue-950 mb-1">Delivery / variance</p>
          {request.quantity_received != null && (
            <p>
              Quantity received: <span className="font-medium">{request.quantity_received}</span> (ordered:{' '}
              {request.quantity})
            </p>
          )}
          {request.partial_delivery_remarks ? (
            <p className="mt-1 whitespace-pre-wrap">Remarks: {request.partial_delivery_remarks}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
