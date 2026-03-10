import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { StatusBadge } from '@/components/StatusBadge';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { requestsAPI } from '@/lib/requestsApi';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { RequestWithRelations } from '@/types/requests';
import { supabase } from '@/lib/supabase';

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [requests, setRequests] = useState<RequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  const loadRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setSignedIn(!!user);
      if (!user) {
        setRequests([]);
        return;
      }
      const data = await requestsAPI.getMyRequests();
      setRequests(data.filter((r) => r.status !== 'Completed' && r.status !== 'Rejected'));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const c = Colors[colorScheme];

  if (signedIn === false) {
    return (
      <ParallaxScrollView
        headerBackgroundColor={{
          light: Colors.light.headerBg,
          dark: Colors.dark.headerBg,
        }}
        headerImage={
          <Image
            source={require('@/assets/images/wmsu1.jpg')}
            style={styles.wmsuLogo}
            contentFit="cover"
          />
        }>
        <ThemedView style={styles.centerBox}>
          <ThemedText type="subtitle">Sign in to see your requests</ThemedText>
          <ThemedText style={styles.hint}>
            Use the same account as the procurement web app. Sign in there first, or add login to this app.
          </ThemedText>
        </ThemedView>
      </ParallaxScrollView>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{
        light: Colors.light.headerBg,
        dark: Colors.dark.headerBg,
      }}
      headerImage={
        <Image
          source={require('@/assets/images/wmsu1.jpg')}
          style={styles.wmsuLogo}
          contentFit="cover"
        />
      }>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Request progress</ThemedText>
        <ThemedText style={styles.subtitle}>Requests in progress (not yet completed)</ThemedText>
      </ThemedView>

      {loading ? (
        <ThemedView style={styles.centerBox}>
          <ActivityIndicator size="large" color={c.tint} />
          <ThemedText style={styles.loadingText}>Loading requests…</ThemedText>
        </ThemedView>
      ) : error ? (
        <ThemedView style={[styles.errorBox, { backgroundColor: colorScheme === 'dark' ? '#2a1a1a' : '#FEE2E2' }]}>
          <ThemedText style={[styles.errorText, { color: colorScheme === 'dark' ? '#FCA5A5' : '#B91C1C' }]}>
            {error}
          </ThemedText>
          <Pressable onPress={onRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </ThemedView>
      ) : requests.length === 0 ? (
        <ThemedView style={styles.centerBox}>
          <ThemedText type="subtitle">No requests in progress</ThemedText>
          <ThemedText style={styles.hint}>Completed and rejected requests appear in Request history.</ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.listContent}>
          <Pressable onPress={onRefresh} style={styles.refreshButton}>
            <Text style={[styles.retryText, { color: c.tint }]}>{refreshing ? 'Refreshing…' : 'Refresh'}</Text>
          </Pressable>
          {requests.map((req) => (
            <RequestCard key={req.id} request={req} colors={c} />
          ))}
        </View>
      )}
    </ParallaxScrollView>
  );
}

function RequestCard({
  request,
  colors,
}: {
  request: RequestWithRelations;
  colors: { card: string; border: string; text: string };
}) {
  const created = new Date(request.created_at).toLocaleDateString();
  const timeline: string[] = [`Created: ${created}`];
  if (request.approved_at) timeline.push(`Reviewed: ${new Date(request.approved_at).toLocaleDateString()}`);
  if (request.ordered_at) timeline.push(`Ordered: ${new Date(request.ordered_at).toLocaleDateString()}`);
  if (request.received_at) timeline.push(`Received: ${new Date(request.received_at).toLocaleDateString()}`);
  if (request.completed_at) timeline.push(`Completed: ${new Date(request.completed_at).toLocaleDateString()}`);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardRow}>
        <ThemedText type="defaultSemiBold" style={styles.itemName} numberOfLines={2}>
          {request.item_name}
        </ThemedText>
        <StatusBadge status={request.status} />
      </View>
      <View style={styles.metaRow}>
        <ThemedText style={styles.meta}>{request.category?.name ?? '—'}</ThemedText>
        <ThemedText style={styles.meta}>Qty: {request.quantity}</ThemedText>
        <ThemedText style={styles.meta}>₱{request.total_price?.toLocaleString() ?? '0'}</ThemedText>
      </View>
      {request.description ? (
        <ThemedText style={styles.desc} numberOfLines={2}>
          {request.description}
        </ThemedText>
      ) : null}
      {request.status === 'Rejected' && request.rejection_reason ? (
        <View style={styles.rejectionBox}>
          <ThemedText style={styles.rejectionLabel}>Rejection reason:</ThemedText>
          <ThemedText style={styles.rejectionText}>{request.rejection_reason}</ThemedText>
        </View>
      ) : null}
      <View style={styles.timeline}>
        <ThemedText style={styles.timelineText}>{timeline.join(' · ')}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wmsuLogo: {
    height: 160,
    width: 160,
    borderRadius: 80,
    bottom: 20,
    left: '50%',
    marginLeft: -80,
    position: 'absolute',
  },
  header: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  centerBox: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    marginTop: 8,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    opacity: 0.8,
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 16,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  meta: {
    fontSize: 13,
    opacity: 0.9,
  },
  desc: {
    fontSize: 13,
    marginTop: 6,
    opacity: 0.85,
  },
  rejectionBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(185, 28, 28, 0.1)',
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 12,
  },
  timeline: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  timelineText: {
    fontSize: 11,
    opacity: 0.7,
  },
});
