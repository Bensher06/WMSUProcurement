/**
 * Parses `requests.description` text produced by FacultyNewRequest (create draft).
 * Falls back to raw text if the format does not match.
 * (Aligned with frontend/src/lib/parseRequisitionDescription.ts)
 */

export type ParsedRequisitionItem = {
  lineNo: number;
  unit: string;
  item: string;
  qty: number;
  unitPrice: number;
};

export type ParsedSignatory = {
  name: string;
  designation: string;
  date: string;
};

export type ParsedRequisitionStructured = {
  kind: 'structured';
  header: Record<string, string>;
  items: ParsedRequisitionItem[];
  signatories: {
    requestedBy: ParsedSignatory;
    approvedBy: ParsedSignatory;
    issuedBy: ParsedSignatory;
    receivedBy: ParsedSignatory;
  };
};

export type ParsedRequisition = ParsedRequisitionStructured | { kind: 'raw'; text: string };

const ITEM_LINE =
  /^(\d+)\.\s*Unit:\s*(.*?)\s*\|\s*Item:\s*(.*?)\s*\|\s*Qty:\s*([\d.]+)\s*\|\s*Unit Price:\s*([\d.]+)\s*$/;

const ITEM_LINE_WITH_STOCK =
  /^(\d+)\.\s*Stock No:\s*(.*?)\s*\|\s*Unit:\s*(.*?)\s*\|\s*Item:\s*(.*?)\s*\|\s*Qty:\s*([\d.]+)\s*\|\s*Unit Price:\s*([\d.]+)\s*$/;

const ITEM_LINE_LEGACY =
  /^(\d+)\.\s*Stock No:\s*(.*?)\s*\|\s*Unit:\s*(.*?)\s*\|\s*Item:\s*(.*?)\s*\|\s*Qty:\s*([\d.]+)\s*\|\s*Unit Price:\s*([\d.]+)\s*\|\s*Issuance Qty:\s*(.*?)\s*\|\s*Remarks:\s*(.*)$/;

function parseItemLine(line: string): ParsedRequisitionItem | null {
  const m = line.match(ITEM_LINE);
  if (m) {
    return {
      lineNo: Number(m[1]),
      unit: m[2].trim(),
      item: m[3].trim(),
      qty: Number(m[4]) || 0,
      unitPrice: Number(m[5]) || 0,
    };
  }
  const withStock = line.match(ITEM_LINE_WITH_STOCK);
  if (withStock) {
    return {
      lineNo: Number(withStock[1]),
      unit: withStock[3].trim(),
      item: withStock[4].trim(),
      qty: Number(withStock[5]) || 0,
      unitPrice: Number(withStock[6]) || 0,
    };
  }
  const legacy = line.match(ITEM_LINE_LEGACY);
  if (legacy) {
    return {
      lineNo: Number(legacy[1]),
      unit: legacy[3].trim(),
      item: legacy[4].trim(),
      qty: Number(legacy[5]) || 0,
      unitPrice: Number(legacy[6]) || 0,
    };
  }
  return null;
}

const SIG_LINE =
  /^(Requested by|Approved by|Issued by|Received by):\s*(.*?)\s*\|\s*Designation:\s*(.*?)\s*\|\s*Date:\s*(.*)$/i;

function parseSignatoryLine(line: string): { role: string; s: ParsedSignatory } | null {
  const m = line.trim().match(SIG_LINE);
  if (!m) return null;
  return {
    role: m[1].toLowerCase().replace(/\s+/g, ''),
    s: { name: m[2].trim(), designation: m[3].trim(), date: m[4].trim() },
  };
}

export const emptyParsedSignatory = (): ParsedSignatory => ({ name: '—', designation: '—', date: '—' });

export function parseRequisitionDescription(description: string | null | undefined): ParsedRequisition {
  const text = (description ?? '').trim();
  if (!text) return { kind: 'raw', text: '' };

  const lines = text.split('\n');
  const itemsIdx = lines.findIndex((l) => l.trim() === 'Requisition Items:');
  const sigIdx = lines.findIndex((l) => l.trim() === 'Signatories:');

  if (itemsIdx < 0 || sigIdx < 0 || sigIdx <= itemsIdx) {
    return { kind: 'raw', text };
  }

  const header: Record<string, string> = {};
  for (let i = 0; i < itemsIdx; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const c = line.indexOf(':');
    if (c <= 0) continue;
    const key = line.slice(0, c).trim();
    const val = line.slice(c + 1).trim();
    header[key] = val;
  }

  const items: ParsedRequisitionItem[] = [];
  for (let i = itemsIdx + 1; i < sigIdx; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parsed = parseItemLine(line);
    if (parsed) items.push(parsed);
  }

  const sigs = {
    requestedBy: emptyParsedSignatory(),
    approvedBy: emptyParsedSignatory(),
    issuedBy: emptyParsedSignatory(),
    receivedBy: emptyParsedSignatory(),
  };

  for (let i = sigIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const p = parseSignatoryLine(line);
    if (!p) continue;
    if (p.role === 'requestedby') sigs.requestedBy = p.s;
    else if (p.role === 'approvedby') sigs.approvedBy = p.s;
    else if (p.role === 'issuedby') sigs.issuedBy = p.s;
    else if (p.role === 'receivedby') sigs.receivedBy = p.s;
  }

  if (items.length === 0 && Object.keys(header).length === 0) {
    return { kind: 'raw', text };
  }

  return {
    kind: 'structured',
    header,
    items,
    signatories: sigs,
  };
}
