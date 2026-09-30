import { useEffect, useMemo, useState } from 'react';
import {
  AppState,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Badge } from '@workspace/maximus-chauffeur-design-system/components/native/badge';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Card } from '@workspace/maximus-chauffeur-design-system/components/native/card';
import {
  Empty,
  EmptyDescription,
  EmptyTitle,
} from '@workspace/maximus-chauffeur-design-system/components/native/empty';
import { Spinner } from '@workspace/maximus-chauffeur-design-system/components/native/spinner';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
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
import { hasLocationTrackingConsent } from '../lib/auth-storage';
import {
  enableDriverLocationTracking,
  resumeDriverLocationTracking,
  suspendDriverLocationTracking,
  stopDriverLocationTracking,
} from '../services/location-tracking';
import {
  shouldOpenLocationAppSettings,
  type LocationSetupFailure,
} from '../services/location-setup-policy';
import {
  isDriverAvailableWithActiveGps,
  shouldPauseAvailableDriver,
} from '../services/driver-availability-policy';
import { cardRadius, getPalette, space } from '../theme';

function apiMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return error.message.replace(/^HTTP \d+ [^:]*:\s*/, '') || fallback;
}

function showLocationSetupFailure(failure: LocationSetupFailure): void {
  const openSettings = shouldOpenLocationAppSettings(failure);

  Alert.alert(
    failure.reason === 'services-disabled'
      ? 'Localisation désactivée'
      : 'Autorisation GPS nécessaire',
    failure.message,
    [
      { text: 'Fermer', style: 'cancel' },
      ...(openSettings
        ? [
            {
              text: 'Paramètres',
              onPress: () => {
                void Linking.openSettings().catch(() => {
                  Alert.alert(
                    'Réglages indisponibles',
                    'Ouvrez les paramètres de l’application et autorisez la position.',
                  );
                });
              },
            },
          ]
        : []),
    ],
  );
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
  const hasAssignedOrInProgressTrip = activeTrips.some(
    (trip) => trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS',
  );
  const photoUri = companyLogoUri(session.company.profilePhoto);

  useEffect(() => {
    if (!driver) return;
    let mounted = true;
    let syncInFlight = false;
    let automaticallyPausedInBackground = false;
    let appIsActive = AppState.currentState === 'active';
    let backgroundPausePromise: Promise<boolean> | null = null;

    if (!canUpdateLocation) {
      void stopDriverLocationTracking().catch(() => undefined);
      setGpsState('attention');
      setGpsMessage('Votre compte ne permet pas le partage de position.');
      return () => {
        mounted = false;
      };
    }

    if (driver.availability === 'AVAILABLE' || driver.availability === 'ON_TRIP') {
      const pauseAvailableDriverWithoutGps = async (): Promise<string | null> => {
        if (!shouldPauseAvailableDriver(
          driver.availability,
          canUpdateAvailability,
          hasAssignedOrInProgressTrip,
        )) {
          return null;
        }

        try {
          await availabilityMutation.mutateAsync({
            id: driver.id,
            data: { availability: 'PAUSED' },
          });
          await queryClient.invalidateQueries({
            queryKey: getGetTransportBootstrapQueryKey(),
          });
          return null;
        } catch (error) {
          return apiMessage(
            error,
            'Impossible de mettre la disponibilité en pause sans GPS actif.',
          );
        }
      };

      const pauseForBackground = (): Promise<boolean> => {
        if (backgroundPausePromise) return backgroundPausePromise;

        const operation = (async () => {
          try {
            await suspendDriverLocationTracking();
          } catch (error) {
            console.error('Could not stop foreground GPS after app backgrounding.', error);
          }

          if (
            !shouldPauseAvailableDriver(
              driver.availability,
              canUpdateAvailability,
              hasAssignedOrInProgressTrip,
            )
          ) {
            return false;
          }

          const pauseError = await pauseAvailableDriverWithoutGps();
          if (pauseError) {
            console.error('Could not pause driver availability after app backgrounding.', pauseError);
            if (mounted) {
              setGpsState('attention');
              setGpsMessage(pauseError);
            }
            return false;
          }

          automaticallyPausedInBackground = true;
          if (mounted) {
            setGpsState('inactive');
            setGpsMessage(null);
          }
          return true;
        })().finally(() => {
          backgroundPausePromise = null;
        });

        backgroundPausePromise = operation;
        return operation;
      };

      const syncLocation = () => {
        if (!mounted || syncInFlight || automaticallyPausedInBackground) return;
        syncInFlight = true;
        setGpsState('starting');
        setGpsMessage(null);
        void hasLocationTrackingConsent()
          .then(async (explicitConsent) => {
            if (!mounted) return;
            if (!explicitConsent) {
              await stopDriverLocationTracking();
              const pauseError = await pauseAvailableDriverWithoutGps();
              if (!mounted) return;
              setGpsState('attention');
              setGpsMessage(
                pauseError ??
                  (driver.availability === 'ON_TRIP'
                    ? 'Activez le GPS pour reprendre le suivi de votre course.'
                    : 'Activez le GPS avant de vous rendre disponible.'),
              );
              return;
            }

            const resumed = await resumeDriverLocationTracking(driver.id);
            if (!resumed) {
              const pauseError = await pauseAvailableDriverWithoutGps();
              if (!mounted) return;
              setGpsState('attention');
              setGpsMessage(
                pauseError ??
                  'Activez la localisation et autorisez l’accès à la position pendant l’utilisation de l’application.',
              );
              return;
            }

            if (!mounted) return;
            setGpsState('active');
            setGpsMessage(null);
          })
          .catch((error) => {
            if (!mounted) return;
            setGpsState('attention');
            setGpsMessage(
              apiMessage(
                error,
                'Le service GPS n’a pas pu redémarrer. Réactivez-le pour rester visible.',
              ),
            );
          })
          .finally(() => {
            syncInFlight = false;
          });
      };

      syncLocation();
      const subscription = AppState.addEventListener('change', (nextState) => {
        appIsActive = nextState === 'active';
        if (appIsActive) {
          if (automaticallyPausedInBackground) return;
          if (backgroundPausePromise) {
            void backgroundPausePromise
              .then((wasAutomaticallyPaused) => {
                if (!wasAutomaticallyPaused && mounted) syncLocation();
              })
              .catch((error) => {
                console.error('Could not finish chauffeur foreground resume.', error);
              });
          } else {
            syncLocation();
          }
          return;
        }

        void pauseForBackground()
          .then((wasAutomaticallyPaused) => {
            if (!wasAutomaticallyPaused && appIsActive && mounted) syncLocation();
          })
          .catch((error) => {
            console.error('Could not pause chauffeur after app backgrounding.', error);
            if (appIsActive && mounted && !automaticallyPausedInBackground) {
              syncLocation();
            }
          });
      });

      return () => {
        mounted = false;
        subscription.remove();
      };
    } else {
      void suspendDriverLocationTracking()
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
  }, [
    driver?.id,
    driver?.availability,
    canUpdateLocation,
    canUpdateAvailability,
    hasAssignedOrInProgressTrip,
    availabilityMutation.mutateAsync,
    queryClient,
  ]);

  const updateAvailability = async () => {
    if (!driver || !canToggleAvailability) return;
    setAvailabilityBusy(true);
    setGpsMessage(null);

    try {
      if (isDriverAvailableWithActiveGps(driver.availability, gpsState === 'active')) {
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
          showLocationSetupFailure(setup);
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
        showLocationSetupFailure(setup);
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
  ) => {
    setTripBusyId(tripId);
    try {
      await tripStatusMutation.mutateAsync({
        id: tripId,
        data: { status },
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
                  <Typography colors={colors} weight="bold" style={[styles.logoLetter, { color: colors.primaryForeground }]}>
                    {session.company.name.slice(0, 1).toUpperCase()}
                  </Typography>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Typography numberOfLines={1} colors={colors} weight="bold" style={[styles.companyName, { color: colors.foreground }]}>
                  {session.company.name}
                </Typography>
                <Typography colors={colors} size="xs" tone="muted" style={styles.driverName}>
                  {session.user.displayName}
                </Typography>
              </View>
            </View>
            <Button
              colors={colors}
              variant="outline"
              size="sm"
              accessibilityRole="button"
              accessibilityLabel="Se déconnecter"
              onPress={requestSignOut}
              style={styles.logoutButton}
            >
              Quitter
            </Button>
          </View>

          <View style={styles.greeting}>
            <Typography colors={colors} tone="muted" weight="semibold" style={styles.date}>
              {today}
            </Typography>
            <Typography colors={colors} size="2xl" weight="bold" style={[styles.greetingTitle, { color: colors.foreground }]}>
              Bonjour, {session.user.displayName.split(' ')[0]}
            </Typography>
            <Typography colors={colors} size="sm" tone="muted" style={styles.greetingSubtitle}>
              Voici votre espace de conduite.
            </Typography>
          </View>

          {transportQuery.isLoading ? (
            <Card colors={colors} style={styles.loadingCard}>
              <Spinner size="small" color={colors.primary} />
              <Typography colors={colors} size="sm" tone="muted" weight="medium">
                Chargement de vos courses…
              </Typography>
            </Card>
          ) : transportQuery.error ? (
            <Card colors={colors} style={styles.errorCard}>
              <Typography colors={colors} size="lg" weight="bold">
                Transport indisponible
              </Typography>
              <Typography colors={colors} size="sm" tone="muted" style={styles.bodyText}>
                {apiMessage(transportQuery.error, 'Vérifiez votre connexion ou contactez votre responsable.')}
              </Typography>
              <Button
                colors={colors}
                size="sm"
                accessibilityRole="button"
                onPress={() => void transportQuery.refetch()}
                style={styles.smallButton}
              >
                Réessayer
              </Button>
            </Card>
          ) : !driver ? (
            <Card colors={colors} style={styles.errorCard}>
              <Typography colors={colors} size="lg" weight="bold">
                Profil chauffeur introuvable
              </Typography>
              <Typography colors={colors} size="sm" tone="muted" style={styles.bodyText}>
                Votre compte n’est pas rattaché à un profil chauffeur actif. Demandez à votre administrateur de vérifier votre accès Transport.
              </Typography>
            </Card>
          ) : (
            <>
              <AvailabilityCard
                driver={driver}
                colors={colors}
                canToggle={canToggleAvailability}
                isBusy={availabilityBusy || gpsState === 'starting'}
                gpsState={gpsState}
                gpsMessage={
                  gpsMessage ??
                  (!canUpdateLocation
                    ? 'Votre compte ne permet pas le partage de position.'
                    : null)
                }
                onToggle={() => void updateAvailability()}
                onEnableGps={canUpdateLocation ? enableGpsAgain : undefined}
              />

              {session.capabilities?.viewTrips ? (
                <>
                  <View style={styles.sectionHeading}>
                    <Typography colors={colors} size="lg" weight="bold">
                      Mes courses
                    </Typography>
                    <Badge colors={colors} variant="secondary" style={styles.countBadge}>
                      {activeTrips.length}
                    </Badge>
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
                          driverPosition={
                            typeof driver.latitude === 'number' && typeof driver.longitude === 'number'
                              ? { latitude: driver.latitude, longitude: driver.longitude }
                              : null
                          }
                          onUpdateStatus={(status) => updateTripStatus(trip.id, status)}
                        />
                      ))}
                    </View>
                  ) : (
                    <Card colors={colors} style={styles.emptyCard}>
                      <Empty style={styles.emptyContent}>
                        <EmptyTitle colors={colors}>
                          Aucune course à traiter
                        </EmptyTitle>
                        <EmptyDescription colors={colors} style={styles.bodyText}>
                        Les nouvelles courses attribuées apparaîtront ici.
                        </EmptyDescription>
                      </Empty>
                    </Card>
                  )}
                </>
              ) : null}
            </>
          )}

          <ReleaseCard colors={colors} />
          <Typography colors={colors} size="xs" tone="muted" style={styles.footer}>
            MAXIMUS Chauffeur · Accès sécurisé par votre entreprise
          </Typography>
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
  logoLetter: { fontSize: 20 },
  companyName: { fontSize: 14 },
  driverName: { fontSize: 12, marginTop: 2 },
  logoutButton: { paddingHorizontal: space.sm },
  greeting: { paddingTop: space.sm, paddingBottom: space.xs },
  date: { textTransform: 'capitalize' },
  greetingTitle: { lineHeight: 32, marginTop: space.xs },
  greetingSubtitle: { marginTop: space.xs },
  loadingCard: { minHeight: 90, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: space.sm, padding: space.md },
  errorCard: { padding: space.md, gap: space.sm },
  bodyText: { lineHeight: 20 },
  smallButton: { alignSelf: 'flex-start', paddingHorizontal: space.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  countBadge: { minWidth: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13, paddingHorizontal: space.xs, paddingVertical: 0 },
  tripList: { gap: space.sm },
  emptyCard: { padding: 0 },
  emptyContent: { padding: space.md, gap: space.xs },
  footer: { textAlign: 'center', paddingTop: space.xs, paddingBottom: space.md },
});