/**
 * Requisition and Issue Slip — print / download HTML and plain text.
 * Matches frontend `RequisitionDocumentView` + `RequisitionViewModal` export shape.
 */

import {
  parseRequisitionDescription,
  type ParsedRequisitionItem,
  type ParsedRequisitionStructured,
} from '@/lib/parseRequisitionDescription';
import type { RequestWithRelations } from '@/types/requests';

const WMSU_RED = '#450a0a';
const TABLE_HEAD = '#7f1d1d';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '₱0.00';
  return `₱${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function headerValue(header: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = header[k];
    if (v?.trim()) return v.trim();
  }
  return '—';
}

function lineTotal(it: ParsedRequisitionItem): number {
  return it.qty * it.unitPrice;
}

function buildStructuredDocumentHtml(request: RequestWithRelations, parsed: ParsedRequisitionStructured): string {
  const { header, items, signatories } = parsed;
  const risCell = escapeHtml((request.ris_no ?? '').trim() || headerValue(header, 'RIS No', 'RIS No.', 'RIS NO'));
  const saiCell = escapeHtml((request.sai_no ?? '').trim() || headerValue(header, 'SAI No', 'SAI No.', 'SAI NO'));
  const divCell = escapeHtml(headerValue(header, 'Division'));
  const officeCell = escapeHtml(headerValue(header, 'Office / Section', 'Office/Section'));
  const purposeCell = escapeHtml(headerValue(header, 'Purpose'));

  const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  const itemRows =
    items.length === 0
      ? `<tr><td colspan="6" style="padding:24px;text-align:center;color:#6b7280;font-size:13px;">No line items could be read from this record.</td></tr>`
      : items
          .map(
            (it, rowIdx) => `
    <tr>
      <td style="padding:10px;border:1px solid #d1d5db;font-size:13px;color:#4b5563;font-family:ui-monospace,monospace;">${rowIdx + 1}</td>
      <td style="padding:10px;border:1px solid #d1d5db;font-size:13px;">${escapeHtml(it.unit || '—')}</td>
      <td style="padding:10px;border:1px solid #d1d5db;font-size:13px;">${escapeHtml(it.item)}</td>
      <td style="padding:10px;border:1px solid #d1d5db;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;">${it.qty}</td>
      <td style="padding:10px;border:1px solid #d1d5db;font-size:13px;text-align:right;font-variant-numeric:tabular-nums;">${escapeHtml(money(it.unitPrice))}</td>
      <td style="padding:10px;border:1px solid #d1d5db;font-size:13px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${escapeHtml(money(lineTotal(it)))}</td>
    </tr>`
          )
          .join('');

  const sig = (s: { name: string; designation: string; date: string }) => ({
    n: escapeHtml(s.name || '—'),
    d: escapeHtml(s.designation || '—'),
    t: escapeHtml(s.date || '—'),
  });
  const rq = sig(signatories.requestedBy);
  const ap = sig(signatories.approvedBy);
  const is = sig(signatories.issuedBy);
  const rc = sig(signatories.receivedBy);

  return `
<section style="margin-bottom:22px;">
  <div style="display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 8px;">
    <div style="width:360px;max-width:52vw;text-align:center;line-height:1.25;">
      <p style="margin:0;font-size:11px;color:#374151;">Republic of the Philippines</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:#111827;text-transform:uppercase;">Western Mindanao State University</p>
      <p style="margin:4px 0 0;font-size:11px;color:#374151;">Normal Road, Baliwasan, Zamboanga City 7000</p>
    </div>
  </div>
</section>
<section style="border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:18px;">
  <h2 style="margin:0;font-size:20px;font-weight:700;color:#111827;text-align:center;">Requisition and Issue Slip</h2>
</section>

<section style="margin-bottom:22px;">
  <h3 style="margin:0 0 8px;font-size:13px;font-weight:700;color:${WMSU_RED};text-transform:uppercase;letter-spacing:0.04em;">Requisition header</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #d1d5db;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
    <tbody>
      <tr style="background:#f9fafb;">
        <td style="padding:6px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">Division</td>
        <td style="padding:6px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">Office / Section</td>
        <td style="padding:6px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">RIS No.</td>
        <td style="padding:6px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">SAI No.</td>
      </tr>
      <tr>
        <td style="padding:10px;border:1px solid #d1d5db;font-weight:500;color:#111827;">${divCell}</td>
        <td style="padding:10px;border:1px solid #d1d5db;font-weight:500;color:#111827;">${officeCell}</td>
        <td style="padding:10px;border:1px solid #d1d5db;font-weight:500;color:#111827;font-family:ui-monospace,monospace;">${risCell}</td>
        <td style="padding:10px;border:1px solid #d1d5db;font-weight:500;color:#111827;font-family:ui-monospace,monospace;">${saiCell}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td colspan="4" style="padding:6px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">Purpose</td>
      </tr>
      <tr>
        <td colspan="4" style="padding:10px;border:1px solid #d1d5db;font-weight:500;color:#111827;">${purposeCell}</td>
      </tr>
    </tbody>
  </table>
</section>

<section style="margin-bottom:22px;">
  <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:${WMSU_RED};text-transform:uppercase;letter-spacing:0.04em;">Line items</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #d1d5db;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
    <thead>
      <tr style="background:${TABLE_HEAD};color:#fff;">
        <th style="padding:10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;border:1px solid #991b1b;">#</th>
        <th style="padding:10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;border:1px solid #991b1b;">Unit</th>
        <th style="padding:10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;border:1px solid #991b1b;min-width:180px;">Item / Description</th>
        <th style="padding:10px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;border:1px solid #991b1b;">Req Qty</th>
        <th style="padding:10px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;border:1px solid #991b1b;">Est unit price</th>
        <th style="padding:10px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;border:1px solid #991b1b;">Line total</th>
      </tr>
    </thead>
    <tbody style="background:#fff;">
      ${itemRows}
    </tbody>
    <tfoot>
      <tr style="background:#f3f4f6;border-top:2px solid #d1d5db;">
        <td colspan="3" style="padding:10px;text-align:right;font-weight:600;color:#1f2937;border:1px solid #d1d5db;">Totals</td>
        <td style="padding:10px;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;border:1px solid #d1d5db;">${totalQty}</td>
        <td style="padding:10px;text-align:right;color:#6b7280;font-size:11px;border:1px solid #d1d5db;">—</td>
        <td style="padding:10px;text-align:right;font-weight:700;color:#7f1d1d;font-variant-numeric:tabular-nums;border:1px solid #d1d5db;">${escapeHtml(money(grandTotal))}</td>
      </tr>
    </tfoot>
  </table>
  <p style="margin:8px 0 0;font-size:11px;color:#6b7280;">Request record total (system): ${escapeHtml(money(request.total_price || 0))} · Qty (system): ${escapeHtml(String(request.quantity ?? 0))}</p>
</section>

<section>
  <h3 style="margin:0 0 12px;font-size:13px;font-weight:700;color:${WMSU_RED};text-transform:uppercase;letter-spacing:0.04em;">Signatories</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #d1d5db;box-shadow:0 1px 2px rgba(0,0,0,0.05);">
    <thead>
      <tr style="background:#f3f4f6;">
        <th style="width:16%;padding:8px 10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">&nbsp;</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">Requested by</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">Approved by</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">Issued by</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;color:#374151;border:1px solid #d1d5db;">Received by</th>
      </tr>
    </thead>
    <tbody style="background:#fff;">
      <tr>
        <td style="padding:8px 10px;font-weight:600;color:#374151;border:1px solid #d1d5db;">Signature</td>
        <td style="padding:22px 10px;border:1px solid #d1d5db;">&nbsp;</td>
        <td style="padding:22px 10px;border:1px solid #d1d5db;">&nbsp;</td>
        <td style="padding:22px 10px;border:1px solid #d1d5db;">&nbsp;</td>
        <td style="padding:22px 10px;border:1px solid #d1d5db;">&nbsp;</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;font-weight:600;color:#374151;border:1px solid #d1d5db;">Name</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${rq.n}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${ap.n}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${is.n}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${rc.n}</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;font-weight:600;color:#374151;border:1px solid #d1d5db;">Designation</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${rq.d}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${ap.d}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${is.d}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${rc.d}</td>
      </tr>
      <tr>
        <td style="padding:8px 10px;font-weight:600;color:#374151;border:1px solid #d1d5db;">Date</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${rq.t}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${ap.t}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${is.t}</td>
        <td style="padding:8px 10px;border:1px solid #d1d5db;">${rc.t}</td>
      </tr>
    </tbody>
  </table>
</section>
`;
}

function buildRawDocumentHtml(request: RequestWithRelations, rawText: string): string {
  const esc = escapeHtml(rawText || '—');
  return `
<section style="margin-bottom:16px;">
  <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;text-align:center;">Requisition and Issue Slip</h2>
  <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">Subject: ${escapeHtml(request.item_name)} · RIS: ${escapeHtml(request.ris_no || '—')} · SAI: ${escapeHtml(request.sai_no || '—')}</p>
</section>
<div style="border-radius:8px;border:1px solid #fcd34d;background:#fffbeb;padding:16px;">
  <p style="margin:0 0 8px;font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;">Request details (text)</p>
  <pre style="margin:0;white-space:pre-wrap;font-family:system-ui,sans-serif;font-size:13px;line-height:1.5;color:#1f2937;">${esc}</pre>
</div>
`;
}

export function buildRequisitionPrintHtml(request: RequestWithRelations): string {
  const parsed = parseRequisitionDescription(request.description);
  const body =
    parsed.kind === 'structured'
      ? buildStructuredDocumentHtml(request, parsed)
      : buildRawDocumentHtml(request, parsed.text);

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(request.item_name)} — RIS</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:20px;color:#111;background:#fff;} @media print { body { padding: 12px; } }</style>
</head><body>
${body}
<p style="margin-top:20px;font-size:11px;color:#9ca3af;">WMSU Procurement · Request ID ${escapeHtml(request.id)} · Status ${escapeHtml(request.status)}</p>
</body></html>`;
}

export function buildRequisitionPlainText(request: RequestWithRelations): string {
  const parsed = parseRequisitionDescription(request.description);
  const lines = [
    'WMSU PROCUREMENT — REQUISITION AND ISSUE SLIP',
    '=============================================',
    '',
    `Subject (record): ${request.item_name}`,
    `RIS: ${request.ris_no || '—'} · SAI: ${request.sai_no || '—'}`,
    `Status: ${request.status}`,
    `Request ID: ${request.id}`,
    '',
  ];

  if (parsed.kind === 'structured') {
    const { header, items, signatories } = parsed;
    lines.push('REQUISITION HEADER', '-----------------');
    lines.push(`Division: ${headerValue(header, 'Division')}`);
    lines.push(`Office / Section: ${headerValue(header, 'Office / Section', 'Office/Section')}`);
    lines.push(`RIS No.: ${(request.ris_no ?? '').trim() || headerValue(header, 'RIS No', 'RIS No.', 'RIS NO')}`);
    lines.push(`SAI No.: ${(request.sai_no ?? '').trim() || headerValue(header, 'SAI No', 'SAI No.', 'SAI NO')}`);
    lines.push(`Purpose: ${headerValue(header, 'Purpose')}`);
    lines.push('', 'LINE ITEMS', '----------');
    if (items.length === 0) lines.push('(no line items parsed)');
    else {
      items.forEach((it, i) => {
        lines.push(
          `${i + 1}. ${it.unit || '—'} | ${it.item} | Qty ${it.qty} | Unit ${money(it.unitPrice)} | Line ${money(lineTotal(it))}`
        );
      });
      const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0);
      const totalQty = items.reduce((s, it) => s + it.qty, 0);
      lines.push(`Totals: Qty ${totalQty} · ${money(grandTotal)}`);
    }
    lines.push(`Request record total (system): ${money(request.total_price || 0)} · Qty (system): ${request.quantity ?? 0}`);
    lines.push('', 'SIGNATORIES', '-----------');
    const row = (label: string, s: { name: string; designation: string; date: string }) =>
      `${label}: ${s.name || '—'} | ${s.designation || '—'} | ${s.date || '—'}`;
    lines.push(row('Requested by', signatories.requestedBy));
    lines.push(row('Approved by', signatories.approvedBy));
    lines.push(row('Issued by', signatories.issuedBy));
    lines.push(row('Received by', signatories.receivedBy));
  } else {
    lines.push('--- DESCRIPTION (RAW) ---', parsed.text.trim() || '(empty)');
  }

  lines.push('', '--- FULL STORED DESCRIPTION ---', String(request.description || '').trim() || '(none)');
  return lines.join('\n');
}

export function requisitionDownloadFileBase(request: RequestWithRelations): string {
  return String(request.ris_no || request.id).replace(/[^\w.-]+/g, '_');
}
