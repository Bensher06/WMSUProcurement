import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { File as ExpoFile, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RequisitionDocumentMobile } from '@/components/RequisitionDocumentMobile';
import { StatusBadge } from '@/components/StatusBadge';
import { WMSU } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { parseRequisitionDescription } from '@/lib/parseRequisitionDescription';
import {
  buildRequisitionPlainText,
  buildRequisitionPrintHtml,
  requisitionDownloadFileBase,
} from '@/lib/requisitionExport';
import type { RequestWithRelations } from '@/types/requests';

type Props = {
  visible: boolean;
  request: RequestWithRelations | null;
  onClose: () => void;
};

export function RequisitionDetailModal({ visible, request, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isLight = colorScheme === 'light';
  const bg = isLight ? '#FFFFFF' : '#252525';
  const textPrimary = isLight ? '#0a0a0a' : '#ECEDEE';
  const textSecondary = isLight ? '#6b7280' : '#9BA1A6';
  const border = isLight ? WMSU.gray : '#333';
  const headerBand = isLight ? '#f3f4f6' : '#2a2a2a';
  const cellBg = isLight ? '#FFFFFF' : '#252525';

  const parsed = useMemo(() => {
    if (!request) return null;
    return parseRequisitionDescription(request.description);
  }, [request]);

  const [busy, setBusy] = useState<'print' | 'download' | null>(null);

  const handlePrint = useCallback(async () => {
    if (!request) return;
    setBusy('print');
    try {
      await Print.printAsync({ html: buildRequisitionPrintHtml(request) });
    } catch {
      /* cancelled */
    } finally {
      setBusy(null);
    }
  }, [request]);

  const handleDownload = useCallback(async () => {
    if (!request) return;
    const html = buildRequisitionPrintHtml(request);
    const base = requisitionDownloadFileBase(request);
    const fileName = `requisition-${base}.html`;
    setBusy('download');
    try {
      if (Platform.OS === 'web') {
        const doc = (globalThis as { document?: { createElement: (t: string) => { href: string; download: string; rel: string; click: () => void }; body?: { appendChild: (n: unknown) => void; removeChild: (n: unknown) => void } } }).document;
        if (doc?.createElement) {
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = doc.createElement('a');
          a.href = url;
          a.download = fileName;
          a.rel = 'noopener';
          doc.body?.appendChild(a);
          a.click();
          doc.body?.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      }
      const file = new ExpoFile(Paths.cache, fileName);
      file.create({ overwrite: true });
      file.write(html);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/html',
          dialogTitle: 'Save or share requisition',
        });
      } else {
        await Share.share({ title: 'Requisition', message: buildRequisitionPlainText(request) });
      }
    } catch {
      try {
        await Share.share({ title: 'Requisition', message: buildRequisitionPlainText(request) });
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(null);
    }
  }, [request]);

  if (!request || !parsed) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: bg, paddingTop: insets.top }]}>
        <View style={[styles.toolbar, { borderBottomColor: border }]}>
          <View style={styles.toolbarText}>
            <Text style={[styles.title, { color: textPrimary }]}>Requisition</Text>
            <Text style={[styles.subtitle, { color: textSecondary }]} numberOfLines={2}>
              {request.item_name}
            </Text>
          </View>
          <View style={styles.toolbarRight}>
            <StatusBadge status={request.status} />
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
              <MaterialIcons name="close" size={28} color={textSecondary} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 8 }]}
          keyboardShouldPersistTaps="handled">
          <RequisitionDocumentMobile
            request={request}
            parsed={parsed}
            colors={{
              text: textPrimary,
              muted: textSecondary,
              border,
              headerBand,
              cellBg,
            }}
          />
          <Text style={[styles.idNote, { color: textSecondary }]} selectable>
            Request ID · {request.id}
          </Text>
        </ScrollView>

        <View style={[styles.actions, { borderTopColor: border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={handlePrint}
            disabled={busy !== null}
            style={({ pressed }) => [styles.actionBtn, styles.actionOutline, { borderColor: WMSU.red }, pressed && styles.pressed, busy && styles.actionDisabled]}>
            {busy === 'print' ? (
              <ActivityIndicator color={WMSU.red} size="small" />
            ) : (
              <>
                <MaterialIcons name="print" size={22} color={WMSU.red} />
                <Text style={[styles.actionOutlineText, { color: WMSU.red }]}>Print</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={handleDownload}
            disabled={busy !== null}
            style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.pressed, busy && styles.actionDisabled]}>
            {busy === 'download' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="download" size={22} color="#FFF" />
                <Text style={styles.actionPrimaryText}>Download</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  toolbarText: {
    flex: 1,
    minWidth: 0,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  idNote: {
    fontSize: 11,
    marginTop: 16,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionOutline: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  actionOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionPrimary: {
    backgroundColor: WMSU.red,
  },
  actionPrimaryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.88,
  },
  actionDisabled: {
    opacity: 0.55,
  },
});
