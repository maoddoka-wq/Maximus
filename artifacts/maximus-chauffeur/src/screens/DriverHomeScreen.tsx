import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetTransportBootstrapQueryKey,
  useGetTransportBootstrap,
  useUpdateTransportDriverAvailability,
  useUpdateTransportTripStatus,
} from '@workspace/api-client-react';
import type {
  MobileSessionInfo,
  TransportTrip,
} from '@workspace/api-client-react';
import { AvailabilityCard, type GpsState } from '../components/AvailabilityCard';
import { ReleaseCard } from '../components/ReleaseCard';
import { TripCard } from '../components/TripCard';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../lib/api';
import { saveTrackedDriverId } from '../lib/auth-storage';
import {
  enableDriverLocationTracking,
  resumeDriverLocationTracking,
  stopDriverLocationTracking,
} from '../services/background-location';
import { cardRadius, getPalette, space } from '../theme';

function apiMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return error.message.replace(/^HTTP \d+ [^:]*:\s*/, '') || fallback;
}

function companyLogoUri(photo: string | null | undefined): string | null {
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo)) return photo;
  return `${API_BASE_URL}${photo.startsWith('/') ? '' : '/'}${photo}`;
}

export function DriverHomeScreen({ session }: { session: MobileSessionInfo }) {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const colors = getPalette(scheme, session.company.primaryColor);
  const [gpsState, setGpsState] = useState<GpsState>('inactive');
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [tripBusyId, setTripBusyId] = useState<string | null>(null);

  const transportQuery = useGetTransportBootstrap({
    query: {
      queryKey: getGetTransportBootstrapQueryKey(),
      refetchInterval: 15_000,
    },
  });
  const availabilityMutation = useUpdateTransportDriverAvailability();
  const tripStatusMutation = useUpdateTransportTripStatus();

  const driver = transportQuery.data?.drivers?.[0];
  const activeTrips = useMemo(() => {
    const priority: Record<string, number> = { IN_PROGRESS: 0, ASSIGNED: 1, OFFERED: 2 };
    return (transportQuery.data?.trips ?? [])
      .filter((trip) => trip.status in priority)
      .sort((left, right) => priority[left.status] - priority[right.status]);
  }, [transportQuery.data?.trips]);

  const canUpdateLocation = Boolean(session.capabilities?.updateLocation);
  const canUpdateAvailability = Boolean(session.capabilities?.updateAvailability);
  const canUpdateTrips = Boolean(session.capabilities?.updateTrips);
  const canToggleAvailability = canUpdateLocation && canUpdateAvailability;
  const photoUri = companyLogoUri(session.company.profilePhoto);

  useEffect(() => {
    if (!driver) return;
    let mounted = true;
    let syncInFlight = false;
    void saveTrackedDriverId(driver.id);

    if (!canUpdateLocation) {
      void stopDriverLocationTracking().catch(() => undefined);
      setGpsState('attention');
      setGpsMessage('Votre compte ne permet pas le partage de position.');
      return () => {
        mounted = false;
      };
    }

    if (driver.availability === 'AVAILABLE' || driver.availability === 'ON_TRIP') {
      const syncLocation = () => {
        if (!mounted || syncInFlight) return;
        syncInFlight = true;
        setGpsState('starting');
        setGpsMessage(null);
        void resumeDriverLocationTracking(driver.id)
          .then((resumed) => {
            if (!mounted) return;
            setGpsState(resumed ? 'active' : 'attention');
            setGpsMessage(
              resumed
                ? null
                : 'Autorisez la localisation « Tout le temps » pour partager votre position écran verrouillé.',
            );
          })
          .catch(() => {
            if (!mounted) return;
            setGpsState('attention');
            setGpsMessage('Le service GPS n’a pas pu redémarrer. Réactivez-le pour rester visible.');
          })
          .finally(() => {
            syncInFlight = false;
          });
      };

      syncLocation();
      const subscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') syncLocation();
      });

      return () => {
        mounted = false;
        subscription.remove();
      };
    } else {
      void stopDriverLocationTracking()
        .catch(() => undefined)
        .finally(() => {
          if (mounted) {
            setGpsState('inactive');
            setGpsMessage(null);
          }
        });
    }

    return () => {
      mounted = false;
    };
  }, [driver?.id, driver?.availability, canUpdateLocation]);

  const updateAvailability = async () => {
    if (!driver || !canToggleAvailability) return;
    setAvailabilityBusy(true);
    setGpsMessage(null);

    try {
      if (driver.availability === 'AVAILABLE') {
        await availabilityMutation.mutateAsync({
          id: driver.id,
          data: { availability: 'PAUSED' },
        });
        await stopDriverLocationTracking();
        setGpsState('inactive');
      } else {
        setGpsState('starting');
        const setup = await enableDriverLocationTracking(driver.id, true);
        if (!setup.ok) {
          setGpsState('attention');
          setGpsMessage(setup.message);
          Alert.alert(
            'Autorisation GPS nécessaire',
            setup.message,
            [
              { text: 'Plus tard', style: 'cancel' },
              {
                text: 'Paramètres',
                onPress: () => {
                  void Linking.openSettings().catch(() => undefined);
                },
              },
            ],
          );
          return;
        }
        setGpsState('active');
        await availabilityMutation.mutateAsync({
          id: driver.id,
          data: { availability: 'AVAILABLE' },
        });
      }

      await queryClient.invalidateQueries({ queryKey: transportQuery.queryKey });
    } catch (error) {
      await stopDriverLocationTracking().catch(() => undefined);
      setGpsState('attention');
      setGpsMessage(apiMessage(error, 'Le statut chauffeur n’a pas pu être modifié.'));
      Alert.alert('Mise à jour impossible', apiMessage(error, 'Réessayez dans quelques instants.'));
    } finally {
      setAvailabilityBusy(false);
    }
  };

  const enableGpsAgain = async () => {
    if (!driver) return;
    setGpsState('starting');
    setGpsMessage(null);
    try {
      const setup = await enableDriverLocationTracking(driver.id, true);
      if (!setup.ok) {
        setGpsState('attention');
        setGpsMessage(setup.message);
        Alert.alert('Autorisation GPS nécessaire', setup.message, [
          { text: 'Fermer', style: 'cancel' },
          {
            text: 'Paramètres',
            onPress: () => {
              void Linking.openSettings().catch(() => undefined);
            },
          },
        ]);
        return;
      }
      setGpsState('active');
    } catch (error) {
      setGpsState('attention');
      setGpsMessage(apiMessage(error, 'Le service GPS n’a pas pu démarrer.'));
      Alert.alert('GPS indisponible', apiMessage(error, 'Vérifiez les réglages de localisation.'));
    }
  };

  const updateTripStatus = async (
    tripId: string,
    status: TransportTrip['status'],
    pickupCode?: string,
  ) => {
    setTripBusyId(tripId);
    try {
      await tripStatusMutation.mutateAsync({
        id: tripId,
        data: { status, ...(pickupCode ? { pickupCode } : {}) },
      });
      await queryClient.invalidateQueries({ queryKey: transportQuery.queryKey });
    } finally {
      setTripBusyId(null);
    }
  };

  const today = new Intl.DateTimeFormat('fr-SN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  const requestSignOut = () => {
    if (transportQuery.isLoading) {
      Alert.alert('Vérification en cours', 'Attendez le chargement de vos courses avant de vous déconnecter.');
      return;
    }

    const hasAcceptedTrip =
      driver?.availability === 'ON_TRIP' ||
      activeTrips.some((trip) => trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS');
    if (hasAcceptedTrip) {
      Alert.alert(
        'Course à terminer',
        'Terminez votre course en cours avant de vous déconnecter afin de conserver le suivi GPS.',
      );
      return;
    }

    Alert.alert('Se déconnecter ?', 'Le GPS sera arrêté et votre disponibilité mise en pause.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={transportQuery.isRefetching && !transportQuery.isLoading}
            onRefresh={() => void transportQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.company}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} contentFit="cover" style={styles.logo} />
              ) : (
                <View style={[styles.logoFallback, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.logoLetter, { color: colors.primaryForeground }]}>
                    {session.company.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={[styles.companyName, { color: colors.foreground }]}>
                  {session.company.name}
                </Text>
                <Text style={[styles.driverName, { color: colors.mutedForeground }]}>
                  {session.user.displayName}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
              onPress={requestSignOut}
              style={[styles.logoutButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.logoutText, { color: colors.mutedForeground }]}>Quitter</Text>
            </Pressable>
          </View>

          <View style={styles.greeting}>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{today}</Text>
            <Text style={[styles.greetingTitle, { color: colors.foreground }]}>
              Bonjour, {session.user.displayName.split(' ')[0]}
            </Text>
            <Text style={[styles.greetingSubtitle, { color: colors.mutedForeground }]}>
              Voici votre espace de conduite.
            </Text>
          </View>

          {transportQuery.isLoading ? (
            <View style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                Chargement de vos courses…
              </Text>
            </View>
          ) : transportQuery.error ? (
            <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Transport indisponible</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                {apiMessage(transportQuery.error, 'Vérifiez votre connexion ou contactez votre responsable.')}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => void transportQuery.refetch()}
                style={[styles.smallButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.smallButtonText, { color: colors.primaryForeground }]}>Réessayer</Text>
              </Pressable>
            </View>
          ) : !driver ? (
            <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Profil chauffeur introuvable</Text>
              <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                Votre compte n’est pas rattaché à un profil chauffeur actif. Demandez à votre administrateur de vérifier votre accès Transport.
              </Text>
            </View>
          ) : (
            <>
              <AvailabilityCard
                driver={driver}
                colors={colors}
                canToggle={canToggleAvailability}
                isBusy={availabilityBusy}
                gpsState={gpsState}
                gpsMessage={
                  gpsMessage ??
                  (!canUpdateLocation
                    ? 'Votre compte ne permet pas le partage de position.'
                    : null)
                }
                onToggle={() => void updateAvailability()}
                onEnableGps={enableGpsAgain}
              />

              {session.capabilities?.viewTrips ? (
                <>
                  <View style={styles.sectionHeading}>
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mes courses</Text>
                    <View style={[styles.countBadge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.countText, { color: colors.foreground }]}>{activeTrips.length}</Text>
                    </View>
                  </View>

                  {activeTrips.length ? (
                    <View style={styles.tripList}>
                      {activeTrips.map((trip) => (
                        <TripCard
                          key={trip.id}
                          trip={trip}
                          colors={colors}
                          canUpdate={canUpdateTrips}
                          isBusy={tripBusyId === trip.id}
                          onUpdateStatus={(status, pickupCode) =>
                            updateTripStatus(trip.id, status, pickupCode)
                          }
                        />
                      ))}
                    </View>
                  ) : (
                    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Aucune course à traiter</Text>
                      <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
                        Les nouvelles courses attribuées apparaîtront ici.
                      </Text>
                    </View>
                  )}
                </>
              ) : null}
            </>
          )}

          <ReleaseCard colors={colors} />
          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            MAXIMUS Chauffeur · Accès sécurisé par votre entreprise
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: space.md, paddingBottom: space.xl },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: space.md },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  company: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: { width: 42, height: 42, borderRadius: cardRadius / 2 },
  logoFallback: { width: 42, height: 42, borderRadius: cardRadius / 2, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 20, fontFamily: 'DMSans_700Bold' },
  companyName: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  driverName: { fontSize: 12, marginTop: 2 },
  logoutButton: { borderWidth: 1, borderRadius: cardRadius / 2, paddingHorizontal: space.sm, paddingVertical: space.xs },
  logoutText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold' },
  greeting: { paddingTop: space.sm, paddingBottom: space.xs },
  date: { fontSize: 12, textTransform: 'capitalize', fontFamily: 'DMSans_600SemiBold' },
  greetingTitle: { fontSize: 26, lineHeight: 32, fontFamily: 'DMSans_700Bold', marginTop: space.xs },
  greetingSubtitle: { fontSize: 14, marginTop: space.xs },
  loadingCard: { minHeight: 90, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm, borderWidth: 1, borderRadius: cardRadius, padding: space.md },
  loadingText: { fontSize: 14, fontFamily: 'DMSans_500Medium' },
  errorCard: { borderWidth: 1, borderRadius: cardRadius, padding: space.md, gap: space.sm },
  sectionTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold' },
  bodyText: { fontSize: 13, lineHeight: 20 },
  smallButton: { alignSelf: 'flex-start', minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, borderRadius: cardRadius / 2 },
  smallButtonText: { fontSize: 13, fontFamily: 'DMSans_700Bold' },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  countBadge: { minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingHorizontal: space.xs },
  countText: { fontSize: 12, fontFamily: 'DMSans_700Bold' },
  tripList: { gap: space.sm },
  emptyCard: { borderWidth: 1, borderRadius: cardRadius, padding: space.md, gap: space.xs },
  emptyTitle: { fontSize: 15, fontFamily: 'DMSans_700Bold' },
  footer: { fontSize: 11, textAlign: 'center', paddingTop: space.xs, paddingBottom: space.md },
});