import { Alert, RefreshControl, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGetTransportBootstrap, getGetTransportBootstrapQueryKey } from '@workspace/api-client-react';
import type { MobileSessionInfo } from '@workspace/api-client-react';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Card } from '@workspace/maximus-chauffeur-design-system/components/native/card';
import { Spinner } from '@workspace/maximus-chauffeur-design-system/components/native/spinner';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import { ReleaseCard } from '../components/ReleaseCard';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { formatApiMessage } from '../lib/api-message';
import { getPalette, space } from '../theme';

function companyPhotoUri(photo?: string | null) {
  if (!photo) return null;
  return /^https?:\/\//i.test(photo) ? photo : `${API_BASE_URL}${photo.startsWith('/') ? '' : '/'}${photo}`;
}

export function DriverProfileScreen({ session }: { session: MobileSessionInfo }) {
  const { signOut } = useAuth();
  const router = useRouter();
  const scheme = 'dark';
  const colors = getPalette(scheme, session.company.primaryColor);
  const query = useGetTransportBootstrap({
    query: { queryKey: getGetTransportBootstrapQueryKey(), refetchInterval: 15_000 },
  });
  const driver = query.data?.drivers?.[0];

  const requestSignOut = () => {
    if (query.isLoading) {
      Alert.alert('Vérification en cours', 'Attendez le chargement de vos courses avant de vous déconnecter.');
      return;
    }
    const hasAcceptedTrip =
      driver?.availability === 'ON_TRIP' ||
      (query.data?.trips ?? []).some((trip) => trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS');
    if (hasAcceptedTrip) {
      Alert.alert(
        'Course à terminer',
        'Terminez votre course en cours avant de vous déconnecter afin de conserver le suivi GPS.',
      );
      return;
    }
    Alert.alert('Se déconnecter ?', 'Le GPS sera arrêté et votre disponibilité mise en pause.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: () => {
          void signOut().then(() => router.replace('/(tabs)'));
        },
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isLoading} onRefresh={() => void query.refetch()} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <View style={styles.content}>
          <View style={styles.pageHeading}>
            <Typography colors={colors} size="xs" weight="bold" tone="muted" style={styles.kicker}>ESPACE CHAUFFEUR</Typography>
            <Typography colors={colors} size="2xl" weight="bold">Profil</Typography>
            <Typography colors={colors} size="sm" tone="muted">Vos informations de compte et votre application.</Typography>
          </View>

          <Card colors={colors} style={styles.profileCard}>
            {companyPhotoUri(session.company.profilePhoto) ? (
              <Image source={{ uri: companyPhotoUri(session.company.profilePhoto) as string }} contentFit="cover" style={styles.logo} accessibilityLabel={`Logo de ${session.company.name}`} />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: colors.muted }]}>
                <Typography colors={colors} size="lg" weight="bold" tone="primary">{session.company.name.slice(0, 1).toUpperCase()}</Typography>
              </View>
            )}
            <View style={styles.profileCopy}>
              <Typography colors={colors} size="lg" weight="bold">{driver?.name ?? session.user.displayName}</Typography>
              <Typography colors={colors} size="sm" tone="muted">{session.company.name}</Typography>
              {driver?.phone ? <Typography colors={colors} size="sm" tone="muted">{driver.phone}</Typography> : null}
            </View>
          </Card>

          {query.isLoading ? (
            <Card colors={colors} style={styles.statusCard}>
              <Spinner size="small" color={colors.primary} />
              <Typography colors={colors} size="sm" tone="muted">Chargement des informations du chauffeur…</Typography>
            </Card>
          ) : query.error ? (
            <Card colors={colors} style={styles.statusCard}>
              <Typography colors={colors} size="sm" tone="muted">{formatApiMessage(query.error, 'Les informations du chauffeur sont momentanément indisponibles.')}</Typography>
              <Button colors={colors} size="sm" accessibilityRole="button" accessibilityLabel="Réessayer le chargement du profil" testID="profile-retry" onPress={() => void query.refetch()}>Réessayer</Button>
            </Card>
          ) : null}

          <View style={styles.sectionHeader}>
            <Typography colors={colors} size="lg" weight="bold">Application</Typography>
          </View>
          <ReleaseCard colors={colors} />

          <Button
            colors={colors}
            variant="outline"
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
            testID="profile-sign-out"
            onPress={requestSignOut}
            style={styles.signOutButton}
          >
            Se déconnecter
          </Button>
          <Typography colors={colors} size="xs" tone="muted" style={styles.footer}>MAXIMUS Chauffeur · Accès sécurisé par votre entreprise</Typography>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.xl },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: space.md },
  pageHeading: { gap: space.xs, paddingVertical: space.sm },
  kicker: { letterSpacing: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md },
  logo: { width: 58, height: 58, borderRadius: 29 },
  logoFallback: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, gap: space.xs },
  statusCard: { padding: space.md, gap: space.sm },
  sectionHeader: { marginTop: space.xs },
  signOutButton: { minHeight: 48 },
  footer: { textAlign: 'center', paddingTop: space.xs },
});