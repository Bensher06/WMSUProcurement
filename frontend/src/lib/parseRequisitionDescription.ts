/**
 * Parses `requests.description` text produced by FacultyNewRequest (create draft).
 * Falls back to raw text if the format does not match.
 */

export type ParsedRequisitionItem = {
  lineNo: number;
  stockNo: string;
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

/** Current format (no Issuance Qty / Remarks). */
const ITEM_LINE =
  /^(\d+)\.\s*Stock No:\s*(.*?)\s*\|\s*Unit:\s*(.*?)\s*\|\s*Item:\s*(.*?)\s*\|\s*Qty:\s*([\d.]+)\s*\|\s*Unit Price:\s*([\d.]+)\s*$/;

/** Legacy rows saved before those columns were removed. */
const ITEM_LINE_LEGACY =
  /^(\d+)\.\s*Stock No:\s*(.*?)\s*\|\s*Unit:\s*(.*?)\s*\|\s*Item:\s*(.*?)\s*\|\s*Qty:\s*([\d.]+)\s*\|\s*Unit Price:\s*([\d.]+)\s*\|\s*Issuance Qty:\s*(.*?)\s*\|\s*Remarks:\s*(.*)$/;

function parseItemLine(line: string): ParsedRequisitionItem | null {
  const m = line.match(ITEM_LINE);
  if (m) {
    return {
      lineNo: Number(m[1]),
      stockNo: m[2].trim(),
      unit: m[3].trim(),
      item: m[4].trim(),
      qty: Number(m[5]) || 0,
      unitPrice: Number(m[6]) || 0,
    };
  }
  const legacy = line.match(ITEM_LINE_LEGACY);
  if (legacy) {
    return {
      lineNo: Number(legacy[1]),
      stockNo: legacy[2].trim(),
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

const emptySig = (): ParsedSignatory => ({ name: '—', designation: '—', date: '—' });

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
    requestedBy: emptySig(),
    approvedBy: emptySig(),
    issuedBy: emptySig(),
    receivedBy: emptySig(),
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

export const HEADER_FIELD_ORDER = [
  { key: 'Division', label: 'Division' },
  { key: 'Office/Section', label: 'Office / Section' },
  { key: 'RIS No', label: 'RIS No.' },
  { key: 'SAI No', label: 'SAI No.' },
  { key: 'Purpose', label: 'Purpose' },
] as const;
