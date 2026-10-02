import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Spinner } from '@workspace/maximus-chauffeur-design-system/components/native/spinner';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import { useAuth } from '../../src/contexts/AuthContext';
import { DriverHomeScreen } from '../../src/screens/DriverHomeScreen';
import { SignInScreen } from '../../src/screens/SignInScreen';
import { getPalette } from '../../src/theme';

export default function ChauffeurScreen() {
  const { status, session, retrySession } = useAuth();
  const router = useRouter();
  const scheme = 'dark';
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
        <Spinner size="large" color={colors.primary} />
      </View>
    );
  }

  if (status === 'offline') {
    return <SessionRecoveryScreen onRetry={retrySession} colors={colors} />;
  }

  if (!session) return <SignInScreen />;
  return <DriverHomeScreen session={session} onOpenTrips={() => router.navigate('/(tabs)/trips')} />;
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
      <Typography colors={colors} size="2xl" weight="bold" style={{ textAlign: 'center' }}>
        Connexion momentanément indisponible
      </Typography>
      <Typography colors={colors} tone="muted" style={{ textAlign: 'center' }}>
        Votre session est conservée. Vérifiez votre connexion puis réessayez.
      </Typography>
      <Button
        colors={colors}
        accessibilityRole="button"
        onPress={() => void onRetry()}
        style={{ paddingHorizontal: 24, minHeight: 48 }}
      >
        Réessayer
      </Button>
      <Button
        colors={colors}
        variant="link"
        accessibilityRole="button"
        onPress={() => void signOut()}
      >
        Se déconnecter
      </Button>
    </View>
  );
}