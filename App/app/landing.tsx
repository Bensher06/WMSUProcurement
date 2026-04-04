import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { WMSU, Colors } from '@/constants/theme';
import { landingAPI } from '@/lib/landingApi';
import type { LandingContent } from '@/types/landing';

const WEB_APP_BASE = 'https://wmsu-procurement.vercel.app';

export default function LandingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const [content, setContent] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    landingAPI
      .getAll()
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, []);

  const t = content?.transparency;
  const docs = content?.documents?.items ?? [];
  const vendor = content?.vendor;
  const bac = content?.bac;
  const isLight = colorScheme === 'light';
  const textPrimary = isLight ? '#11181C' : '#ECEDEE';
  const textSecondary = isLight ? '#6b7280' : '#9BA1A6';
  const cardBg = isLight ? '#FFFFFF' : '#252525';
  const borderColor = isLight ? '#E5E5E5' : '#333';

  const inAppRoutes = ['/accreditation-portal', '/active-bidding', '/bid-bulletins', '/annual-procurement-plan', '/bid-winners-awardees'];

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const openUrl = (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    if (inAppRoutes.some((r) => r === normalized || path === normalized)) {
      navigateTo(normalized);
      return;
    }
    const url = path.startsWith('http') ? path : `${WEB_APP_BASE}${normalized}`;
    Linking.openURL(url).catch(() => {
      // Ignore when opening external URL fails (e.g. in Expo Go or restricted env)
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isLight ? '#F9FAFB' : '#1A1A1A' }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('@/assets/images/wmsu1.jpg')} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>WMSU-Procurement</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigateTo('/accreditation-portal')} style={styles.navBtn}>
            <Text style={styles.navBtnText}>Accreditation</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/login')} style={[styles.navBtn, styles.navBtnPrimary]}>
            <Text style={styles.navBtnTextPrimary}>Log in</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={require('@/assets/images/wmsuimage.jpg')} style={styles.heroBg} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Image source={require('@/assets/images/wmsu1.jpg')} style={styles.heroEmblem} />
            <Text style={styles.heroTitle}>Western Mindanao State University</Text>
            <Text style={styles.heroSubtitle}>Procurement Office</Text>
            <Text style={styles.heroTagline}>WMSU-Procurement · A Smart Research University by 2040</Text>
          </View>
        </View>

        {/* Transparency Seal */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <View style={styles.sectionHeader}>
            <View style={styles.emblemWrap}>
              <Image source={require('@/assets/images/wmsu1.jpg')} style={styles.sectionEmblem} />
            </View>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>Transparency Seal</Text>
            {loading ? (
              <ActivityIndicator size="small" color={WMSU.red} style={styles.loader} />
            ) : (
              t?.mission && (
                <Text style={[styles.sectionDesc, { color: textSecondary }]}>{t.mission}</Text>
              )
            )}
          </View>
          <View style={styles.cardsRow}>
            <Pressable
              onPress={() => navigateTo('/active-bidding')}
              style={({ pressed }) => [styles.card, { backgroundColor: cardBg, borderColor }, pressed && styles.cardPressed]}
            >
              <View style={styles.cardIconWrap}>
                <MaterialIcons name="gavel" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Active Bidding</Text>
              <Text style={[styles.cardDesc, { color: textSecondary }]}>
                View current active bidding opportunities and submit your bids.
              </Text>
              <Text style={[styles.cardLink, { color: WMSU.red }]}>Active Bidding →</Text>
            </Pressable>
            <Pressable
              onPress={() => navigateTo('/bid-bulletins')}
              style={({ pressed }) => [styles.card, { backgroundColor: cardBg, borderColor }, pressed && styles.cardPressed]}
            >
              <View style={styles.cardIconWrap}>
                <MaterialIcons name="description" size={24} color="#FFFFFF" />
              </View>
              <Text style={[styles.cardTitle, { color: textPrimary }]}>Supplemental / Bid Bulletins</Text>
              <Text style={[styles.cardDesc, { color: textSecondary }]}>
                Access bid bulletins, supplements, and updates for ongoing procurements.
              </Text>
              <Text style={[styles.cardLink, { color: WMSU.red }]}>Supplemental / Bid Bulletins →</Text>
            </Pressable>
          </View>
        </View>

        {/* Procurement Documents */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Procurement Documents</Text>
          <Text style={[styles.sectionDesc, { color: textSecondary }]}>
            Forms and documents required to participate in bidding.
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={WMSU.red} style={styles.loader} />
          ) : docs.length === 0 ? (
            <Text style={[styles.empty, { color: textSecondary }]}>No documents listed yet.</Text>
          ) : (
            <View style={styles.docList}>
              {docs.map((item, i) => (
                <Pressable
                  key={i}
                  onPress={() => item.url && Linking.openURL(item.url)}
                  style={({ pressed }) => [styles.docRow, { borderColor }, pressed && styles.cardPressed]}
                >
                  <View style={styles.docIconWrap}>
                    <MaterialIcons name="download" size={22} color={textSecondary} />
                  </View>
                  <View style={styles.docBody}>
                    <Text style={[styles.docTitle, { color: textPrimary }]}>{item.title || 'Untitled'}</Text>
                    {item.description ? (
                      <Text style={[styles.docDesc, { color: textSecondary }]}>{item.description}</Text>
                    ) : null}
                    {item.category ? (
                      <Text style={[styles.docCategory, { color: textSecondary }]}>{item.category}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.downloadLabel, { color: WMSU.red }]}>Download</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Planning & Reporting */}
        <View style={[styles.section, { backgroundColor: isLight ? 'rgba(239,68,68,0.04)' : 'rgba(0,0,0,0.2)', borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Planning & Reporting</Text>
          <Text style={[styles.sectionDesc, { color: textSecondary }]}>
            Annual plans and historical procurement reports.
          </Text>
          <Pressable
            onPress={() => navigateTo('/annual-procurement-plan')}
            style={({ pressed }) => [styles.planCard, { backgroundColor: cardBg, borderColor }, pressed && styles.cardPressed]}
          >
            <Text style={[styles.planCardTitle, { color: textPrimary }]}>APP (Annual Procurement Plan)</Text>
          </Pressable>
          <Pressable
            onPress={() => navigateTo('/bid-winners-awardees')}
            style={({ pressed }) => [styles.planCard, { backgroundColor: cardBg, borderColor }, pressed && styles.cardPressed]}
          >
            <Text style={[styles.planCardTitle, { color: textPrimary }]}>Bid Winners & Awardees</Text>
            <Text style={[styles.planCardSub, { color: textSecondary }]}>PMR — How we select and award contracts</Text>
          </Pressable>
        </View>

        {/* Vendor Corner */}
        <View style={[styles.section, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Vendor Corner</Text>
          <Text style={[styles.sectionDesc, { color: textSecondary }]}>
            Register and manage your participation in WMSU procurement.
          </Text>
          <View style={styles.cardsRow}>
            {vendor?.accreditationTitle && (
              <Pressable
                onPress={() => navigateTo('/accreditation-portal')}
                style={({ pressed }) => [styles.vendorCard, { backgroundColor: cardBg, borderColor }, pressed && styles.cardPressed]}
              >
                <MaterialIcons name="people" size={40} color={WMSU.red} style={styles.vendorIcon} />
                <Text style={[styles.vendorCardTitle, { color: textPrimary }]}>{vendor.accreditationTitle}</Text>
                {vendor.accreditationDescription ? (
                  <Text style={[styles.vendorCardDesc, { color: textSecondary }]}>{vendor.accreditationDescription}</Text>
                ) : null}
              </Pressable>
            )}
            <Pressable
              onPress={() => Linking.openURL('https://wmsu-procurement.vercel.app/supplier-register').catch(() => {})}
              style={({ pressed }) => [styles.vendorCard, { backgroundColor: cardBg, borderColor }, pressed && styles.cardPressed]}
            >
              <MaterialIcons name="description" size={40} color={WMSU.red} style={styles.vendorIcon} />
              <Text style={[styles.vendorCardTitle, { color: textPrimary }]}>Register as Supplier</Text>
              <Text style={[styles.vendorCardDesc, { color: textSecondary }]}>
                Register your company to participate in WMSU procurement opportunities
              </Text>
            </Pressable>
          </View>
        </View>

        {/* BAC Directory */}
        <View style={[styles.section, { backgroundColor: isLight ? 'rgba(239,68,68,0.04)' : 'rgba(0,0,0,0.2)', borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>BAC Directory</Text>
          <Text style={[styles.sectionDesc, { color: textSecondary }]}>
            Contact the Bids and Awards Committee Secretariat.
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={WMSU.red} style={styles.loader} />
          ) : (bac?.secretariatName || bac?.secretariatEmail || bac?.secretariatPhone || bac?.officeAddress) ? (
            <View style={styles.bacGrid}>
              {(bac?.secretariatName || bac?.secretariatEmail || bac?.secretariatPhone) && (
                <View style={styles.bacBlock}>
                  <View style={styles.bacBlockHeader}>
                    <MaterialIcons name="people" size={20} color={WMSU.red} />
                    <Text style={[styles.bacBlockTitle, { color: textPrimary }]}>BAC Secretariat</Text>
                  </View>
                  <View style={styles.bacList}>
                    {bac.secretariatName ? (
                      <Text style={[styles.bacItem, { color: textSecondary }]}>{bac.secretariatName}</Text>
                    ) : null}
                    {bac.secretariatEmail ? (
                      <Pressable onPress={() => bac.secretariatEmail && Linking.openURL(`mailto:${bac.secretariatEmail}`)}>
                        <Text style={[styles.bacLink, { color: WMSU.red }]}>{bac.secretariatEmail}</Text>
                      </Pressable>
                    ) : null}
                    {bac.secretariatPhone ? (
                      <Pressable onPress={() => bac.secretariatPhone && Linking.openURL(`tel:${bac.secretariatPhone}`)}>
                        <Text style={[styles.bacItem, { color: textSecondary }]}>📞 {bac.secretariatPhone}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
              {(bac?.officeAddress || bac?.officeNote) && (
                <View style={styles.bacBlock}>
                  <View style={styles.bacBlockHeader}>
                    <MaterialIcons name="place" size={20} color={WMSU.red} />
                    <Text style={[styles.bacBlockTitle, { color: textPrimary }]}>Office Location</Text>
                  </View>
                  {bac.officeAddress ? (
                    <Text style={[styles.bacAddress, { color: textSecondary }]}>{bac.officeAddress}</Text>
                  ) : null}
                  {bac.officeNote ? (
                    <Text style={[styles.bacNote, { color: textSecondary }]}>{bac.officeNote}</Text>
                  ) : null}
                </View>
              )}
            </View>
          ) : (
            <Text style={[styles.empty, { color: textSecondary }]}>No BAC contact information configured yet.</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Western Mindanao State University · Procurement Office · WMSU-Procurement © {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: WMSU.red,
    borderBottomWidth: 1,
    borderBottomColor: WMSU.redDark || '#6B0000',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerLogo: { width: 32, height: 32, borderRadius: 16 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  navBtnText: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  navBtnPrimary: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8, paddingRight: 16 },
  navBtnTextPrimary: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  hero: {
    height: 380,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(139,0,0,0.82)',
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 1,
  },
  heroEmblem: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.95)',
    marginTop: 8,
  },
  heroTagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 16,
    textAlign: 'center',
  },

  section: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  sectionHeader: { alignItems: 'center', marginBottom: 16 },
  emblemWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: WMSU.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  sectionEmblem: { width: 44, height: 44, borderRadius: 22 },
  sectionTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  sectionDesc: { fontSize: 14, textAlign: 'center', paddingHorizontal: 16, lineHeight: 22 },
  loader: { marginTop: 12 },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: 14 },

  cardsRow: { gap: 16, marginTop: 16 },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
  },
  cardPressed: { opacity: 0.85 },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: WMSU.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 6 },
  cardDesc: { fontSize: 14, lineHeight: 20, marginBottom: 8 },
  cardLink: { fontSize: 14, fontWeight: '600' },

  docList: { marginTop: 12, gap: 0 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  docIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(139,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docBody: { flex: 1, minWidth: 0 },
  docTitle: { fontSize: 16, fontWeight: '600' },
  docDesc: { fontSize: 13, marginTop: 2 },
  docCategory: { fontSize: 12, marginTop: 2, textTransform: 'uppercase' },
  downloadLabel: { fontSize: 14, fontWeight: '600' },

  planCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  planCardTitle: { fontSize: 17, fontWeight: '600' },
  planCardSub: { fontSize: 14, marginTop: 4 },

  vendorCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 12,
  },
  vendorIcon: { marginBottom: 12 },
  vendorCardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 4 },
  vendorCardDesc: { fontSize: 14, lineHeight: 20 },

  bacGrid: { marginTop: 16, gap: 20 },
  bacBlock: {},
  bacBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bacBlockTitle: { fontSize: 17, fontWeight: '600' },
  bacList: { gap: 4 },
  bacItem: { fontSize: 14 },
  bacLink: { fontSize: 14, textDecorationLine: 'underline' },
  bacAddress: { fontSize: 14, lineHeight: 22 },
  bacNote: { fontSize: 13, marginTop: 8 },

  footer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: WMSU.red,
    alignItems: 'center',
  },
  footerText: { fontSize: 13, color: '#FFFFFF', textAlign: 'center' },
});
