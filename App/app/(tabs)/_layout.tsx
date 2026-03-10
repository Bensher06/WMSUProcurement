import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { LogoutButton } from '@/components/logout-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  const theme = colorScheme ?? 'light';
  const c = Colors[theme];
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.tint,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: { backgroundColor: c.card, borderTopColor: c.border },
        headerShown: true,
        headerRight: () => <LogoutButton />,
        headerStyle: { backgroundColor: c.card },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '600', fontSize: 17 },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Request progress',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="doc.text.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Request history',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
