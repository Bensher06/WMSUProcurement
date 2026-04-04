import type { RequestWithRelations } from '../types/database';
import type { ParsedRequisition } from '../lib/parseRequisitionDescription';
import { HEADER_FIELD_ORDER } from '../lib/parseRequisitionDescription';

const money = (n: number) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Props = {
  request: RequestWithRelations;
  parsed: ParsedRequisition;
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

export default function RequisitionDocumentView({ request, parsed }: Props) {
  const req = request.requester;
  const collegeName = req?.department ?? null;
  const deptUnit = req?.faculty_department?.trim() || null;

  if (parsed.kind === 'raw') {
    return (
      <div className="space-y-4">
        <DocumentMeta request={request} collegeName={collegeName} deptUnit={deptUnit} />
        <RawBlock text={parsed.text} />
      </div>
    );
  }

  const { header, items, signatories } = parsed;
  const lineTotal = (it: (typeof items)[0]) => it.qty * it.unitPrice;
  const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  return (
    <div className="space-y-6">
      <DocumentMeta request={request} collegeName={collegeName} deptUnit={deptUnit} />

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
          Line items
        </h3>
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
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                    No line items could be read from this record. See raw details below if shown.
                  </td>
                </tr>
              ) : null}
              {items.map((it) => (
                <tr key={it.lineNo} className="hover:bg-gray-50/80">
                  <td className="px-3 py-3 text-gray-600 font-mono text-xs">{it.lineNo}</td>
                  <td className="px-3 py-3 text-gray-900">{it.stockNo || '—'}</td>
                  <td className="px-3 py-3 text-gray-900">{it.unit || '—'}</td>
                  <td className="px-3 py-3 text-gray-900">{it.item}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{it.qty}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(it.unitPrice)}</td>
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
          <SignatoryCard title="Approved by" s={signatories.approvedBy} />
          <SignatoryCard title="Issued by" s={signatories.issuedBy} />
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
}: {
  request: RequestWithRelations;
  collegeName: string | null;
  deptUnit: string | null;
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
        </div>
      )}
    </div>
  );
}
