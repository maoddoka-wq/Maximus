import { ActivityIndicator, Pressable, Text, useColorScheme, View } from 'react-native';
import { useAuth } from '../../src/contexts/AuthContext';
import { DriverHomeScreen } from '../../src/screens/DriverHomeScreen';
import { SignInScreen } from '../../src/screens/SignInScreen';
import { getPalette } from '../../src/theme';

export default function ChauffeurScreen() {
  const { status, session, retrySession } = useAuth();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = getPalette(scheme, session?.company.primaryColor);

  if (status === 'restoring') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'offline') {
    return <SessionRecoveryScreen onRetry={retrySession} colors={colors} />;
  }

  if (!session) return <SignInScreen />;
  return <DriverHomeScreen session={session} />;
}

function SessionRecoveryScreen({
  onRetry,
  colors,
}: {
  onRetry: () => Promise<void>;
  colors: ReturnType<typeof getPalette>;
}) {
  const { signOut } = useAuth();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 28,
        gap: 18,
        backgroundColor: colors.background,
      }}
    >
      <Text style={{ color: colors.foreground, fontSize: 22, fontFamily: 'DMSans_700Bold', textAlign: 'center' }}>
        Connexion momentanément indisponible
      </Text>
      <Text style={{ color: colors.mutedForeground, fontSize: 15, textAlign: 'center' }}>
        Votre session est conservée. Vérifiez votre connexion puis réessayez.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void onRetry()}
        style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 }}
      >
        <Text style={{ color: colors.primaryForeground, fontFamily: 'DMSans_700Bold' }}>Réessayer</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => void signOut()}>
        <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}