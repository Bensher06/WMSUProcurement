import { useRouter } from 'expo-router';
import { Pressable, Text, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { useThemeColor } from '@/hooks/use-theme-color';
import { WMSU } from '@/constants/theme';

export function LogoutButton() {
  const router = useRouter();
  const textColor = useThemeColor({}, 'text');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <Pressable
      onPress={handleLogout}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      hitSlop={12}
    >
      <MaterialIcons name="logout" size={22} color={WMSU.red} style={styles.icon} />
      <Text style={[styles.label, { color: textColor }]}>Log out</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
});
