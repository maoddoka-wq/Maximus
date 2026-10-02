import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Spinner } from '@workspace/maximus-chauffeur-design-system/components/native/spinner';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import { useAuth } from '../contexts/AuthContext';
import { SignInScreen } from '../screens/SignInScreen';
import { getPalette, space } from '../theme';

export function AuthenticatedTabGate({ children }: { children: (session: NonNullable<ReturnType<typeof useAuth>['session']>) => ReactNode }) {
  const { status, session, retrySession, signOut } = useAuth();
  const scheme = 'dark';
  const colors = getPalette(scheme, session?.company.primaryColor);

  if (status === 'restoring') {
    return <View style={[styles.loading, { backgroundColor: colors.background }]}><Spinner size="large" color={colors.primary} /></View>;
  }
  if (status === 'offline') {
    return (
      <View style={[styles.recovery, { backgroundColor: colors.background }]}>
        <Typography colors={colors} size="2xl" weight="bold" style={styles.center}>Connexion momentanément indisponible</Typography>
        <Typography colors={colors} tone="muted" style={styles.center}>Votre session est conservée. Vérifiez votre connexion puis réessayez.</Typography>
        <Button colors={colors} accessibilityRole="button" testID="session-retry" onPress={() => void retrySession()}>Réessayer</Button>
        <Button colors={colors} variant="link" accessibilityRole="button" onPress={() => void signOut()}>Se déconnecter</Button>
      </View>
    );
  }
  if (!session) return <SignInScreen />;
  return <>{children(session)}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  recovery: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md },
  center: { textAlign: 'center' },
});