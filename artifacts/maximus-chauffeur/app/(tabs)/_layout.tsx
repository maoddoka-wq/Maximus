import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { getPalette } from '../../src/theme';

export default function TabLayout() {
  const { session } = useAuth();
  const scheme = 'dark';
  const colors = getPalette(scheme, session?.company.primaryColor);
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          display: session ? 'flex' : 'none',
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingTop: 6,
          paddingBottom: isWeb ? 0 : insets.bottom,
          height: isWeb ? 84 : 58 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 1 },
        tabBarBackground: () => <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarAccessibilityLabel: 'Accueil',
          tabBarButtonTestID: 'tab-home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Courses',
          tabBarAccessibilityLabel: 'Mes courses',
          tabBarButtonTestID: 'tab-trips',
          tabBarIcon: ({ color, size }) => <Ionicons name="navigate-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarAccessibilityLabel: 'Profil',
          tabBarButtonTestID: 'tab-profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}