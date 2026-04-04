import { DarkTheme, DefaultTheme, Theme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Ensure fonts are always set (required by native-stack's useHeaderConfigProps)
const fonts = DefaultTheme.fonts;

const WMSULightTheme: Theme = {
  dark: false,
  colors: {
    primary: Colors.light.tint,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.border,
    notification: Colors.light.tint,
  },
  fonts,
};

const WMSUDarkTheme: Theme = {
  dark: true,
  colors: {
    primary: Colors.dark.tint,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.border,
    notification: Colors.dark.tint,
  },
  fonts,
};

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? WMSUDarkTheme : WMSULightTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="landing" options={{ title: 'WMSU-Procurement' }} />
        <Stack.Screen name="active-bidding" options={{ title: 'Active Bidding' }} />
        <Stack.Screen name="bid-bulletins" options={{ title: 'Bid Bulletins' }} />
        <Stack.Screen name="annual-procurement-plan" options={{ title: 'APP' }} />
        <Stack.Screen name="bid-winners-awardees" options={{ title: 'Bid Winners & Awardees' }} />
        <Stack.Screen name="accreditation-portal" options={{ title: 'Accreditation Portal' }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
