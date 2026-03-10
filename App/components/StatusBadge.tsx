import { StyleSheet, Text, View } from 'react-native';
import type { RequestStatus } from '@/types/requests';

const statusColors: Record<
  RequestStatus,
  { bg: string; text: string }
> = {
  Draft: { bg: '#E2E8F0', text: '#475569' },
  Pending: { bg: '#FEF3C7', text: '#B45309' },
  Approved: { bg: '#D1FAE5', text: '#047857' },
  Rejected: { bg: '#FEE2E2', text: '#B91C1C' },
  Ordered: { bg: '#EDE9FE', text: '#6D28D9' },
  Received: { bg: '#DBEAFE', text: '#1D4ED8' },
  Completed: { bg: '#DCFCE7', text: '#15803D' },
};

interface StatusBadgeProps {
  status: RequestStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusColors[status as RequestStatus] ?? statusColors.Draft;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});
