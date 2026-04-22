import { Image } from 'expo-image';
import { Platform, StyleSheet, Text, View } from 'react-native';

import type { ParsedRequisition, ParsedRequisitionItem } from '@/lib/parseRequisitionDescription';
import { money } from '@/lib/requisitionExport';
import type { RequestWithRelations } from '@/types/requests';

const MAROON = '#450a0a';
const TABLE_HEAD = '#7f1d1d';

type Colors = {
  text: string;
  muted: string;
  border: string;
  headerBand: string;
  cellBg: string;
};

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

export function RequisitionDocumentMobile({
  request,
  parsed,
  colors,
}: {
  request: RequestWithRelations;
  parsed: ParsedRequisition;
  colors: Colors;
}) {
  const { text: textColor, muted, border, headerBand, cellBg } = colors;

  if (parsed.kind === 'raw') {
    return (
      <View style={styles.block}>
        <Text style={[styles.docTitle, { color: textColor }]}>Requisition and Issue Slip</Text>
        <Text style={[styles.metaCenter, { color: muted }]}>
          Subject: {request.item_name} · RIS: {request.ris_no || '—'} · SAI: {request.sai_no || '—'}
        </Text>
        <View style={styles.rawBox}>
          <Text style={styles.rawLabel}>Request details (text)</Text>
          <Text style={[styles.rawBody, { color: textColor }]} selectable>
            {parsed.text?.trim() ? parsed.text : '—'}
          </Text>
        </View>
      </View>
    );
  }

  const { header, items, signatories } = parsed;
  const ris = (request.ris_no ?? '').trim() || headerValue(header, 'RIS No', 'RIS No.', 'RIS NO');
  const sai = (request.sai_no ?? '').trim() || headerValue(header, 'SAI No', 'SAI No.', 'SAI NO');
  const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  return (
    <View style={styles.block}>
      <View style={styles.universityRow}>
        <Image source={require('@/assets/images/wmsu1.jpg')} style={styles.seal} contentFit="cover" />
        <View style={styles.universityTextCol}>
          <Text style={[styles.republic, { color: muted }]}>Republic of the Philippines</Text>
          <Text style={[styles.univName, { color: textColor }]}>WESTERN MINDANAO STATE UNIVERSITY</Text>
          <Text style={[styles.addr, { color: muted }]}>Normal Road, Baliwasan, Zamboanga City 7000</Text>
        </View>
        <View style={styles.sealPlaceholder} />
      </View>

      <Text style={[styles.docTitle, { color: textColor }]}>Requisition and Issue Slip</Text>

      <Text style={[styles.sectionTitle, { color: MAROON }]}>Requisition header</Text>
      <View style={[styles.tableOuter, { borderColor: border }]}>
        <View style={[styles.row4, { borderColor: border, backgroundColor: headerBand }]}>
          <Text style={[styles.th, { color: muted, borderColor: border }]}>Division</Text>
          <Text style={[styles.th, { color: muted, borderColor: border }]}>Office / Section</Text>
          <Text style={[styles.th, { color: muted, borderColor: border }]}>RIS No.</Text>
          <Text style={[styles.th, { color: muted, borderColor: border }]}>SAI No.</Text>
        </View>
        <View style={[styles.row4, { borderColor: border, backgroundColor: cellBg }]}>
          <Text style={[styles.td, { color: textColor, borderColor: border }]}>{headerValue(header, 'Division')}</Text>
          <Text style={[styles.td, { color: textColor, borderColor: border }]}>
            {headerValue(header, 'Office / Section', 'Office/Section')}
          </Text>
          <Text style={[styles.tdMono, { color: textColor, borderColor: border }]}>{ris}</Text>
          <Text style={[styles.tdMono, { color: textColor, borderColor: border }]}>{sai}</Text>
        </View>
        <View style={[styles.fullHeaderRow, { borderColor: border, backgroundColor: headerBand }]}>
          <Text style={[styles.th, { color: muted, borderColor: border }]}>Purpose</Text>
        </View>
        <View style={[styles.purposeRow, { borderColor: border, backgroundColor: cellBg }]}>
          <Text style={[styles.tdFull, { color: textColor, borderColor: border }]}>{headerValue(header, 'Purpose')}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: MAROON, marginTop: 20 }]}>Line items</Text>
      <View style={[styles.tableOuter, { borderColor: border }]}>
        <View style={[styles.lineHead, { backgroundColor: TABLE_HEAD }]}>
          <Text style={styles.lineThIdx}>#</Text>
          <Text style={styles.lineThUnit}>Unit</Text>
          <Text style={styles.lineThItem}>Item / Description</Text>
          <Text style={styles.lineThNum}>Req Qty</Text>
          <Text style={styles.lineThNum}>Est unit price</Text>
          <Text style={[styles.lineThNum, styles.lineThLast]}>Line total</Text>
        </View>
        {items.length === 0 ? (
          <View style={[styles.emptyLine, { borderColor: border }]}>
            <Text style={{ color: muted, textAlign: 'center' }}>No line items could be read from this record.</Text>
          </View>
        ) : (
          items.map((it, rowIdx) => (
            <View
              key={`${it.lineNo}-${rowIdx}`}
              style={[styles.lineRow, { borderColor: border, backgroundColor: cellBg }]}>
              <Text style={[styles.lineTdIdx, { color: muted, borderColor: border }]}>{rowIdx + 1}</Text>
              <Text style={[styles.lineTd, { color: textColor, borderColor: border }]}>{it.unit || '—'}</Text>
              <Text style={[styles.lineTdGrow, { color: textColor, borderColor: border }]}>{it.item}</Text>
              <Text style={[styles.lineTdNum, { color: textColor, borderColor: border }]}>{it.qty}</Text>
              <Text style={[styles.lineTdNum, { color: textColor, borderColor: border }]}>{money(it.unitPrice)}</Text>
              <Text style={[styles.lineTdNumBold, { color: textColor, borderColor: border }]}>{money(lineTotal(it))}</Text>
            </View>
          ))
        )}
        <View style={[styles.totalsRow, { borderColor: border, backgroundColor: headerBand }]}>
          <View style={[styles.totalsLeftPad, { borderColor: border }]}>
            <View style={{ width: 36 }} />
            <View style={{ width: 52 }} />
            <View style={[styles.totalsLabelCell, { borderColor: border }]}>
              <Text style={[styles.totalsLabelText, { color: textColor }]}>Totals</Text>
            </View>
          </View>
          <Text style={[styles.totalsQty, { color: textColor, borderColor: border }]}>{totalQty}</Text>
          <Text style={[styles.totalsDash, { color: muted, borderColor: border }]}>—</Text>
          <Text style={[styles.totalsGrand, { borderColor: border }]}>{money(grandTotal)}</Text>
        </View>
      </View>
      <Text style={[styles.footerNote, { color: muted }]}>
        Request record total (system): {money(request.total_price || 0)} · Qty (system): {request.quantity ?? 0}
      </Text>

      <Text style={[styles.sectionTitle, { color: MAROON, marginTop: 20 }]}>Signatories</Text>
      <View style={[styles.tableOuter, { borderColor: border }]}>
        <View style={[styles.sigHead, { backgroundColor: headerBand, borderColor: border }]}>
          <Text style={[styles.sigCorner, { color: muted, borderColor: border }]}> </Text>
          <Text style={[styles.sigH, { color: muted, borderColor: border }]}>Requested by</Text>
          <Text style={[styles.sigH, { color: muted, borderColor: border }]}>Approved by</Text>
          <Text style={[styles.sigH, { color: muted, borderColor: border }]}>Issued by</Text>
          <Text style={[styles.sigH, { color: muted, borderColor: border }]}>Received by</Text>
        </View>
        <SigRow label="Signature" border={border} cellBg={cellBg} textColor={textColor} muted={muted} tall />
        <SigDataRow
          label="Name"
          border={border}
          cellBg={cellBg}
          textColor={textColor}
          muted={muted}
          values={[
            signatories.requestedBy.name,
            signatories.approvedBy.name,
            signatories.issuedBy.name,
            signatories.receivedBy.name,
          ]}
        />
        <SigDataRow
          label="Designation"
          border={border}
          cellBg={cellBg}
          textColor={textColor}
          muted={muted}
          values={[
            signatories.requestedBy.designation,
            signatories.approvedBy.designation,
            signatories.issuedBy.designation,
            signatories.receivedBy.designation,
          ]}
        />
        <SigDataRow
          label="Date"
          border={border}
          cellBg={cellBg}
          textColor={textColor}
          muted={muted}
          values={[
            signatories.requestedBy.date,
            signatories.approvedBy.date,
            signatories.issuedBy.date,
            signatories.receivedBy.date,
          ]}
        />
      </View>
    </View>
  );
}

function SigRow({
  label,
  border,
  cellBg,
  textColor,
  muted,
  tall,
}: {
  label: string;
  border: string;
  cellBg: string;
  textColor: string;
  muted: string;
  tall?: boolean;
}) {
  return (
    <View style={[styles.sigRow, { borderColor: border, backgroundColor: cellBg }]}>
      <Text style={[styles.sigLabel, { color: textColor, borderColor: border, minHeight: tall ? 48 : undefined }]}>
        {label}
      </Text>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.sigCell, { borderColor: border, minHeight: tall ? 48 : undefined }]} />
      ))}
    </View>
  );
}

function SigDataRow({
  label,
  values,
  border,
  cellBg,
  textColor,
  muted,
}: {
  label: string;
  values: string[];
  border: string;
  cellBg: string;
  textColor: string;
  muted: string;
}) {
  return (
    <View style={[styles.sigRow, { borderColor: border, backgroundColor: cellBg }]}>
      <Text style={[styles.sigLabel, { color: textColor, borderColor: border }]}>{label}</Text>
      {values.map((v, i) => (
        <Text key={i} style={[styles.sigCellText, { color: v?.trim() ? textColor : muted, borderColor: border }]}>
          {v?.trim() || '—'}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 4 },
  universityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  seal: { width: 48, height: 48, borderRadius: 24 },
  sealPlaceholder: { width: 48, height: 48 },
  universityTextCol: { flex: 1, maxWidth: 360, alignItems: 'center' },
  republic: { fontSize: 11, textAlign: 'center' },
  univName: { fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  addr: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  docTitle: { fontSize: 19, fontWeight: '700', textAlign: 'center', marginTop: 8, marginBottom: 12 },
  metaCenter: { fontSize: 12, textAlign: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  tableOuter: { borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  row4: { flexDirection: 'row' },
  fullHeaderRow: { borderTopWidth: 1 },
  purposeRow: { flexDirection: 'row' },
  th: {
    flex: 1,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    textAlign: 'center',
  },
  td: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderTopWidth: 1,
  },
  tdMono: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderTopWidth: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  tdFull: { flex: 1, fontSize: 12, paddingVertical: 8, paddingHorizontal: 8, borderTopWidth: 1 },
  lineHead: { flexDirection: 'row', alignItems: 'center' },
  lineThIdx: {
    width: 36,
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)',
  },
  lineThUnit: {
    width: 52,
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)',
  },
  lineThItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)',
    minWidth: 72,
  },
  lineThNum: {
    width: 72,
    paddingVertical: 10,
    paddingHorizontal: 4,
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    textAlign: 'right',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.25)',
  },
  lineThLast: { width: 78, borderRightWidth: 0 },
  lineRow: { flexDirection: 'row', borderTopWidth: 1 },
  lineTdIdx: {
    width: 36,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 11,
    borderRightWidth: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  lineTd: { width: 52, paddingVertical: 8, paddingHorizontal: 4, fontSize: 12, borderRightWidth: 1 },
  lineTdGrow: { flex: 1, paddingVertical: 8, paddingHorizontal: 4, fontSize: 12, borderRightWidth: 1, minWidth: 60 },
  lineTdNum: {
    width: 72,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 12,
    textAlign: 'right',
    borderRightWidth: 1,
  },
  lineTdNumBold: {
    width: 78,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  emptyLine: { padding: 20, borderTopWidth: 1 },
  totalsRow: { flexDirection: 'row', borderTopWidth: 2, alignItems: 'stretch' },
  totalsLeftPad: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  totalsLabelCell: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingRight: 8,
    borderRightWidth: 1,
    alignItems: 'flex-end',
  },
  totalsLabelText: { fontWeight: '600', fontSize: 13 },
  totalsQty: { width: 72, fontWeight: '700', textAlign: 'right', paddingVertical: 10, borderRightWidth: 1, paddingRight: 6 },
  totalsDash: { width: 72, textAlign: 'right', paddingVertical: 10, fontSize: 11, borderRightWidth: 1, paddingRight: 6 },
  totalsGrand: {
    width: 78,
    fontWeight: '700',
    color: TABLE_HEAD,
    textAlign: 'right',
    paddingVertical: 10,
    paddingRight: 6,
  },
  footerNote: { fontSize: 11, marginTop: 6 },
  rawBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    padding: 14,
  },
  rawLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rawBody: { fontSize: 13, lineHeight: 20 },
  sigHead: { flexDirection: 'row', borderBottomWidth: 1 },
  sigCorner: { width: '16%', padding: 8, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', borderRightWidth: 1 },
  sigH: {
    flex: 1,
    padding: 8,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    borderRightWidth: 1,
  },
  sigRow: { flexDirection: 'row', borderTopWidth: 1 },
  sigLabel: {
    width: '16%',
    padding: 8,
    fontSize: 12,
    fontWeight: '600',
    borderRightWidth: 1,
  },
  sigCell: { flex: 1, borderRightWidth: 1 },
  sigCellText: { flex: 1, padding: 8, fontSize: 12, borderRightWidth: 1 },
});
