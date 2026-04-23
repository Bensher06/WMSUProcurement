import { View, Text, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

/**
 * Shown when the app was built without Supabase env (EAS secrets or .env).
 * Without this, @supabase/supabase-js throws at import time and the app crashes on open.
 */
export default function MissingConfigScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.text }]}>Configuration required</Text>
        <Text style={[styles.body, { color: c.text }]}>
          This build does not include your Supabase project URL and anon key. The app cannot start
          until they are set at build time.
        </Text>
        <Text style={[styles.subtitle, { color: c.text }]}>Fix (EAS APK / preview build)</Text>
        <Text style={[styles.mono, { color: c.text, borderColor: c.border }]}>
          {`cd App\neas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --scope project\neas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --scope project\neas build --platform android --profile preview`}
        </Text>
        <Text style={[styles.body, { color: c.text }]}>
          Use the same URL and anon key as your web app (Supabase Dashboard → Project Settings → API).
          Then create a new build and install the new APK.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  mono: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
  },
});
