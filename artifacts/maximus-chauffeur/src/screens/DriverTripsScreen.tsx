import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useGetTransportBootstrap, getGetTransportBootstrapQueryKey, useUpdateTransportTripStatus } from '@workspace/api-client-react';
import type { MobileSessionInfo, TransportTrip } from '@workspace/api-client-react';
import { Badge } from '@workspace/maximus-chauffeur-design-system/components/native/badge';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Card } from '@workspace/maximus-chauffeur-design-system/components/native/card';
import { Empty, EmptyDescription, EmptyTitle } from '@workspace/maximus-chauffeur-design-system/components/native/empty';
import { Spinner } from '@workspace/maximus-chauffeur-design-system/components/native/spinner';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import { TripCard } from '../components/TripCard';
import { useAuth } from '../contexts/AuthContext';
import { formatApiMessage } from '../lib/api-message';
import type { DriverLocationSnapshot } from '../lib/trip-map-geometry';
import { isFreshDriverLocation } from '../lib/trip-map-geometry';
import { subscribeToDriverLocation } from '../services/location-tracking';
import { getPalette, space } from '../theme';

const ACTIVE_PRIORITY: Record<string, number> = { IN_PROGRESS: 0, ASSIGNED: 1, OFFERED: 2 };

export function DriverTripsScreen({ session }: { session: MobileSessionInfo }) {
  const scheme = 'dark';
  const colors = getPalette(scheme, session.company.primaryColor);
  const queryClient = useQueryClient();
  const [busyTripId, setBusyTripId] = useState<string | null>(null);
  const [fullscreenTripId, setFullscreenTripId] = useState<string | null>(null);
  const [location, setLocation] = useState<DriverLocationSnapshot | null>(null);
  const query = useGetTransportBootstrap({
    query: { queryKey: getGetTransportBootstrapQueryKey(), refetchInterval: 15_000 },
  });
  const statusMutation = useUpdateTransportTripStatus();
  const canUpdateTrips = Boolean(session.capabilities?.updateTrips);
  const trips = useMemo(() => {
    const available = (query.data?.trips ?? []).filter((trip) =>
      ['OFFERED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(trip.status),
    );
    return available.sort((left, right) => {
      const leftPriority = ACTIVE_PRIORITY[left.status] ?? 3;
      const rightPriority = ACTIVE_PRIORITY[right.status] ?? 3;
      return leftPriority - rightPriority || right.requestedAt.localeCompare(left.requestedAt);
    });
  }, [query.data?.trips]);
  const activeNavigationTrip = trips.find((trip) => trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS');
  const driverPosition = isFreshDriverLocation(location)
    ? { latitude: location.latitude, longitude: location.longitude }
    : null;

  useEffect(() => subscribeToDriverLocation(setLocation), []);

  const updateTripStatus = async (tripId: string, status: TransportTrip['status']) => {
    setBusyTripId(tripId);
    try {
      await statusMutation.mutateAsync({ id: tripId, data: { status } });
      await queryClient.invalidateQueries({ queryKey: query.queryKey });
    } finally {
      setBusyTripId(null);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={query.isRefetching && !query.isLoading}
            onRefresh={() => void query.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headingCopy}>
              <Typography colors={colors} size="xs" weight="bold" tone="muted" style={styles.kicker}>ESPACE CHAUFFEUR</Typography>
              <Typography colors={colors} size="2xl" weight="bold">Mes courses</Typography>
              <Typography colors={colors} size="sm" tone="muted">Vos courses actives et récentes.</Typography>
            </View>
            {!query.isLoading && !query.error ? (
              <Badge colors={colors} variant="secondary" style={styles.countBadge}>{trips.length}</Badge>
            ) : null}
          </View>

          {query.isLoading ? (
            <Card colors={colors} style={styles.stateCard}>
              <Spinner size="small" color={colors.primary} />
              <Typography colors={colors} size="sm" tone="muted">Chargement de vos courses…</Typography>
            </Card>
          ) : query.error ? (
            <Card colors={colors} style={styles.stateCard}>
              <Typography colors={colors} size="lg" weight="bold">Courses indisponibles</Typography>
              <Typography colors={colors} size="sm" tone="muted">{formatApiMessage(query.error, 'Vérifiez votre connexion puis réessayez.')}</Typography>
              <Button colors={colors} size="sm" accessibilityRole="button" accessibilityLabel="Réessayer le chargement des courses" testID="trips-retry" onPress={() => void query.refetch()}>Réessayer</Button>
            </Card>
          ) : !session.capabilities?.viewTrips ? (
            <Card colors={colors} style={styles.stateCard}>
              <Typography colors={colors} size="lg" weight="bold">Accès aux courses non disponible</Typography>
              <Typography colors={colors} size="sm" tone="muted">Votre compte ne permet pas de consulter les courses.</Typography>
            </Card>
          ) : trips.length === 0 ? (
            <Card colors={colors} style={styles.emptyCard}>
              <Empty style={styles.empty}>
                <EmptyTitle colors={colors}>Aucune course pour le moment</EmptyTitle>
                <EmptyDescription colors={colors}>Les nouvelles courses attribuées apparaîtront ici.</EmptyDescription>
              </Empty>
            </Card>
          ) : (
            <>
              {trips.some((trip) => trip.status in ACTIVE_PRIORITY) ? (
                <>
                  <SectionTitle title="À traiter" count={trips.filter((trip) => trip.status in ACTIVE_PRIORITY).length} colors={colors} />
                  <View style={styles.tripList}>
                    {trips.filter((trip) => trip.status in ACTIVE_PRIORITY).map((trip) => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        colors={colors}
                        canUpdate={canUpdateTrips}
                        isBusy={busyTripId === trip.id}
                        driverPosition={driverPosition}
                        fullScreen={fullscreenTripId === trip.id}
                        onDismissFullscreen={() => setFullscreenTripId(null)}
                        onOpenFullscreen={activeNavigationTrip?.id === trip.id ? () => setFullscreenTripId(trip.id) : undefined}
                        onUpdateStatus={(status) => updateTripStatus(trip.id, status)}
                      />
                    ))}
                  </View>
                </>
              ) : null}
              {trips.some((trip) => trip.status === 'COMPLETED' || trip.status === 'CANCELLED') ? (
                <>
                  <SectionTitle title="Récentes" count={trips.filter((trip) => trip.status === 'COMPLETED' || trip.status === 'CANCELLED').length} colors={colors} />
                  <View style={styles.tripList}>
                    {trips.filter((trip) => trip.status === 'COMPLETED' || trip.status === 'CANCELLED').map((trip) => (
                      <TripCard key={trip.id} trip={trip} colors={colors} canUpdate={false} isBusy={false} driverPosition={driverPosition} onUpdateStatus={() => Promise.resolve()} />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({ title, count, colors }: { title: string; count: number; colors: ReturnType<typeof getPalette> }) {
  return (
    <View style={styles.sectionTitle}>
      <Typography colors={colors} size="lg" weight="bold">{title}</Typography>
      <Badge colors={colors} variant="secondary">{count}</Badge>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.xl },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, paddingVertical: space.sm },
  headingCopy: { flex: 1, gap: space.xs },
  kicker: { letterSpacing: 1 },
  countBadge: { minWidth: 28, alignItems: 'center' },
  stateCard: { padding: space.md, gap: space.sm },
  emptyCard: { padding: space.md },
  empty: { gap: space.xs },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  tripList: { gap: space.sm },
});