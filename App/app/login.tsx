import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { clearProfileRoleCache } from '@/hooks/use-profile-role';
import { CenteredAlert } from '@/components/CenteredAlert';
import { WMSU, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) {
        await supabase.auth.signOut();
        throw new Error('Authentication failed. Please try again.');
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Could not load your account. Please try again.');
      }

      if (profile.role === 'Admin') {
        await supabase.auth.signOut();
        setError('Admin accounts cannot use the mobile app. Please use the web portal.');
        return;
      }

      clearProfileRoleCache();
      router.replace('/(tabs)');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isLight = colorScheme === 'light';
  const inputBg = isLight ? '#FFFFFF' : '#252525';
  const inputBorder = isLight ? WMSU.gray : '#333';
  const cardBg = isLight ? '#FFFFFF' : '#252525';
  const textPrimary = isLight ? '#0a0a0a' : '#ECEDEE';
  const textSecondary = isLight ? '#6b7280' : '#9BA1A6';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 28 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to landing page"
            onPress={() => router.push('/landing')}
            style={({ pressed }) => [styles.logoPressable, pressed && styles.logoPressed]}
          >
            <Image
              source={require('@/assets/images/wmsu1.jpg')}
              style={styles.logo}
              contentFit="cover"
            />
          </Pressable>
          <Text style={[styles.title, { color: textPrimary }]}>
            Western Mindanao State University
          </Text>
          <Text style={[styles.subtitle, { color: textPrimary }]}>WMSU-Procurement</Text>
          <Text style={[styles.tagline, { color: textSecondary }]}>
            A Smart Research University by 2040
          </Text>
        </View>

        <CenteredAlert
          visible={!!error}
          message={error}
          type="error"
          onClose={() => setError('')}
        />
        <View style={[styles.card, { backgroundColor: cardBg, shadowColor: '#000' }]}>
          <Text style={[styles.welcomeTitle, { color: textPrimary }]}>Welcome Back</Text>

          <View style={styles.inputWrap}>
            <Text style={[styles.label, { color: textPrimary }]}>Email Address</Text>
            <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <MaterialIcons name="mail-outline" size={20} color={textSecondary} style={styles.inputIcon} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { color: textPrimary }]}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputWrap}>
            <Text style={[styles.label, { color: textPrimary }]}>Password</Text>
            <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <MaterialIcons name="lock-outline" size={20} color={textSecondary} style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={textSecondary}
                secureTextEntry
                style={[styles.input, { color: textPrimary }]}
                editable={!loading}
              />
            </View>
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.signInButton,
              pressed && styles.signInButtonPressed,
              loading && styles.signInButtonDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <Text style={[styles.footer, { color: textSecondary }]}>
          Western Mindanao State University © 2026
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoSection: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoPressable: {
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 60,
  },
  logoPressed: {
    opacity: 0.88,
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    borderRadius: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
  },
  tagline: {
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 28,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputWrap: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    paddingRight: 8,
  },
  signInButton: {
    backgroundColor: WMSU.red,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  signInButtonPressed: {
    opacity: 0.9,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    fontSize: 13,
    marginTop: 22,
  },
});
