import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetTransportDriverMobileTripsQueryKey,
  useAcceptTransportDriverMobileTrip,
  useCompleteTransportDriverMobileTrip,
  useDeclineTransportDriverMobileTrip,
  useGetTransportDriverMobileTrips,
  useStartTransportDriverMobileTrip,
  type DriverMobileTrip,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/constants/colors';
import { useDriverSession } from '@/contexts/DriverSessionContext';
import { BEARER_REQUEST_OPTIONS } from '@/lib/mobile-api';

type TripsView = 'courses' | 'history';

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const value = error as {
      message?: unknown;
      data?: { error?: unknown; message?: unknown };
    };
    if (typeof value.data?.error === 'string') return value.data.error;
    if (typeof value.data?.message === 'string') return value.data.message;
    if (typeof value.message === 'string') return value.message;
  }

  return 'Une erreur est survenue. Réessayez.';
}

function tripDate(value: string | null | undefined): string {
  if (!value) return 'Date non renseignée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function fareLabel(fare: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(fare)} FCFA`;
}

function statusLabel(status: DriverMobileTrip['status']): string {
  switch (status) {
    case 'OFFERED':
      return 'Offre reçue';
    case 'ASSIGNED':
      return 'À démarrer';
    case 'IN_PROGRESS':
      return 'En cours';
    case 'COMPLETED':
      return 'Terminée';
    case 'CANCELLED':
      return 'Annulée';
    default:
      return 'Disponible';
  }
}

function ActionButton({
  title,
  icon,
  onPress,
  disabled = false,
  secondary = false,
  loading = false,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  loading?: boolean;
}) {
  const theme = useColors();
  const color = secondary ? theme.secondaryForeground : theme.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: secondary ? theme.secondary : theme.primary,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          <Ionicons name={icon} size={17} color={color} />
          <Text style={[styles.actionButtonText, { color }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

function TripCard({
  trip,
  mode,
  busy,
  canOperate,
  onAccept,
  onDecline,
  onStart,
  onComplete,
}: {
  trip: DriverMobileTrip;
  mode: 'active' | 'available' | 'history';
  busy: boolean;
  canOperate: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onStart: () => void;
  onComplete: () => void;
}) {
  const theme = useColors();
  const historyDate = trip.status === 'COMPLETED' ? trip.completedAt : trip.updatedAt;

  return (
    <View style={[styles.tripCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeading}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reference, { color: theme.mutedForeground }]}>
            COURSE {trip.reference}
          </Text>
          <Text style={[styles.fare, { color: theme.cardForeground }]}>{fareLabel(trip.fare)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: theme.muted }]}>
          <Text style={[styles.statusBadgeText, { color: theme.mutedForeground }]}>
            {statusLabel(trip.status)}
          </Text>
        </View>
      </View>

      <View style={styles.route}>
        <View style={styles.routeMark}>
          <Ionicons name="radio-button-on" size={16} color={theme.primary} />
          <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
          <Ionicons name="location" size={17} color={theme.primary} />
        </View>
        <View style={styles.routePlaces}>
          <View style={styles.place}>
            <Text style={[styles.fieldLabel, { color: theme.mutedForeground }]}>PRISE EN CHARGE</Text>
            <Text style={[styles.placeValue, { color: theme.cardForeground }]}>{trip.pickup}</Text>
          </View>
          <View style={styles.place}>
            <Text style={[styles.fieldLabel, { color: theme.mutedForeground }]}>DESTINATION</Text>
            <Text style={[styles.placeValue, { color: theme.cardForeground }]}>{trip.destination}</Text>
          </View>
        </View>
      </View>

      {trip.passengerName || trip.passengerPhone ? (
        <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
          <Ionicons name="person-outline" size={17} color={theme.mutedForeground} />
          <Text style={[styles.detailText, { color: theme.cardForeground }]}>
            {[trip.passengerName, trip.passengerPhone].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}

      {trip.vehicleRegistration || trip.vehicleModel ? (
        <View style={styles.detailRow}>
          <Ionicons name="car-outline" size={18} color={theme.mutedForeground} />
          <Text style={[styles.detailText, { color: theme.cardForeground }]}>
            {[trip.vehicleModel, trip.vehicleRegistration].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}

      {mode === 'history' ? (
        <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
          <Ionicons
            name={trip.status === 'COMPLETED' ? 'checkmark-circle-outline' : 'close-circle-outline'}
            size={18}
            color={theme.mutedForeground}
          />
          <Text style={[styles.detailText, { color: theme.mutedForeground }]}>
            {trip.status === 'COMPLETED' ? 'Terminée le ' : 'Mise à jour le '}
            {tripDate(historyDate)}
          </Text>
        </View>
      ) : (
        <View style={[styles.detailRow, { borderTopColor: theme.border }]}>
          <Ionicons name="time-outline" size={17} color={theme.mutedForeground} />
          <Text style={[styles.detailText, { color: theme.mutedForeground }]}>
            Demandée le {tripDate(trip.requestedAt)}
          </Text>
        </View>
      )}

      {mode === 'available' ? (
        <ActionButton
          title="Accepter cette course"
          icon="checkmark"
          onPress={onAccept}
          disabled={busy || !canOperate}
          loading={busy}
        />
      ) : null}

      {mode === 'active' && trip.status === 'OFFERED' ? (
        <View style={styles.actions}>
          <ActionButton
            title="Accepter l’offre"
            icon="checkmark"
            onPress={onAccept}
            disabled={busy || !canOperate}
            loading={busy}
          />
          <ActionButton
            title="Refuser"
            icon="close"
            onPress={onDecline}
            disabled={busy || !canOperate}
            secondary
          />
        </View>
      ) : null}

      {mode === 'active' && trip.status === 'ASSIGNED' ? (
        <View style={styles.actionSection}>
          <ActionButton
            title="Démarrer la course"
            icon="play"
            onPress={onStart}
            disabled={busy || !canOperate}
            loading={busy}
          />
        </View>
      ) : null}

      {mode === 'active' && trip.status === 'IN_PROGRESS' ? (
        <ActionButton
          title="Terminer la course"
          icon="checkmark-done"
          onPress={onComplete}
          disabled={busy || !canOperate}
          loading={busy}
        />
      ) : null}
    </View>
  );
}

export function DriverTripsPanel({
  view,
  canOperateTrips,
  gpsIsFresh,
}: {
  view: TripsView;
  canOperateTrips: boolean;
  gpsIsFresh: boolean;
}) {
  const theme = useColors();
  const queryClient = useQueryClient();
  const { accessToken, refreshSession } = useDriverSession();
  const [historyPage, setHistoryPage] = useState(1);
  const [historyRows, setHistoryRows] = useState<DriverMobileTrip[]>([]);
  const [pendingTripId, setPendingTripId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const tripsQuery = useGetTransportDriverMobileTrips(
    { historyPage },
    {
      query: {
        queryKey: getGetTransportDriverMobileTripsQueryKey({ historyPage }),
        enabled: Boolean(accessToken),
        retry: false,
        refetchInterval: 30_000,
      },
      request: BEARER_REQUEST_OPTIONS,
    },
  );
  const acceptMutation = useAcceptTransportDriverMobileTrip({ request: BEARER_REQUEST_OPTIONS });
  const declineMutation = useDeclineTransportDriverMobileTrip({ request: BEARER_REQUEST_OPTIONS });
  const startMutation = useStartTransportDriverMobileTrip({ request: BEARER_REQUEST_OPTIONS });
  const completeMutation = useCompleteTransportDriverMobileTrip({ request: BEARER_REQUEST_OPTIONS });

  useEffect(() => {
    const page = tripsQuery.data;
    if (!page || page.historyPage !== historyPage) return;
    setHistoryRows((previous) => {
      const combined = historyPage === 1 ? page.history : [...previous, ...page.history];
      return [...new Map(combined.map((trip) => [trip.id, trip])).values()];
    });
  }, [historyPage, tripsQuery.data]);

  const runAction = async (
    tripId: string,
    successMessage: string,
    action: () => Promise<unknown>,
  ) => {
    setPendingTripId(tripId);
    setActionError(null);
    setActionNotice(null);
    try {
      await action();
      setActionNotice(successMessage);
      if (successMessage === 'Course terminée.') {
        setHistoryPage(1);
        setHistoryRows([]);
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: getGetTransportDriverMobileTripsQueryKey(),
        }),
        refreshSession(),
      ]);
    } catch (error) {
      setActionError(errorMessage(error));
      await tripsQuery.refetch();
    } finally {
      setPendingTripId(null);
    }
  };

  const acceptTrip = (trip: DriverMobileTrip) =>
    runAction(trip.id, 'Course acceptée.', () => acceptMutation.mutateAsync({ id: trip.id }));

  const declineTrip = (trip: DriverMobileTrip) =>
    runAction(trip.id, 'Offre refusée.', () => declineMutation.mutateAsync({ id: trip.id }));

  const startTrip = (trip: DriverMobileTrip) =>
    runAction(trip.id, 'Course démarrée.', () =>
      startMutation.mutateAsync({ id: trip.id }),
    );

  const completeTrip = (trip: DriverMobileTrip) =>
    runAction(trip.id, 'Course terminée.', () =>
      completeMutation.mutateAsync({ id: trip.id }),
    );

  if (tripsQuery.isLoading && !tripsQuery.data) {
    return (
      <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ActivityIndicator color={theme.primary} />
        <Text style={[styles.body, { color: theme.mutedForeground }]}>Chargement des courses…</Text>
      </View>
    );
  }

  if (tripsQuery.isError && !tripsQuery.data) {
    return (
      <View style={[styles.stateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="cloud-offline-outline" size={24} color={theme.mutedForeground} />
        <Text style={[styles.cardTitle, { color: theme.cardForeground }]}>
          Impossible de charger les courses
        </Text>
        <Text style={[styles.body, { color: theme.mutedForeground }]}>
          {errorMessage(tripsQuery.error)}
        </Text>
        <ActionButton
          title="Réessayer"
          icon="refresh"
          onPress={() => void tripsQuery.refetch()}
          loading={tripsQuery.isFetching}
        />
      </View>
    );
  }

  const data = tripsQuery.data;
  const activeTrips = data?.activeTrips ?? [];
  const availableTrips = data?.availableTrips ?? [];
  const historyHasMore = data?.historyHasMore ?? false;

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeading}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.panelTitle, { color: theme.foreground }]}>
            {view === 'courses' ? 'Courses à traiter' : 'Historique des courses'}
          </Text>
          <Text style={[styles.body, { color: theme.mutedForeground }]}>
            {view === 'courses'
              ? 'Les courses affectées et les demandes disponibles pour vous.'
              : 'Vos courses terminées ou annulées.'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Actualiser les courses"
          disabled={tripsQuery.isFetching}
          onPress={() => void tripsQuery.refetch()}
          style={({ pressed }) => [styles.refreshButton, { opacity: pressed ? 0.65 : 1 }]}
        >
          {tripsQuery.isFetching ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name="refresh" size={19} color={theme.primary} />
          )}
        </Pressable>
      </View>

      {actionError ? (
        <View style={[styles.notice, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <Ionicons name="alert-circle-outline" size={18} color={theme.foreground} />
          <Text style={[styles.noticeText, { color: theme.foreground }]}>{actionError}</Text>
        </View>
      ) : null}
      {actionNotice ? (
        <View style={[styles.notice, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.foreground} />
          <Text style={[styles.noticeText, { color: theme.foreground }]}>{actionNotice}</Text>
        </View>
      ) : null}

      {view === 'courses' && !canOperateTrips ? (
        <View style={[styles.notice, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.foreground} />
          <Text style={[styles.noticeText, { color: theme.foreground }]}>
            Votre rôle autorise la consultation, mais pas les actions sur les courses.
          </Text>
        </View>
      ) : null}
      {view === 'courses' && canOperateTrips && !gpsIsFresh ? (
        <View style={[styles.notice, { backgroundColor: theme.muted, borderColor: theme.border }]}>
          <Ionicons name="location-outline" size={18} color={theme.foreground} />
          <Text style={[styles.noticeText, { color: theme.foreground }]}>
            Une position GPS récente est requise pour accepter, démarrer ou terminer une course.
          </Text>
        </View>
      ) : null}

      {view === 'courses' ? (
        <>
          {activeTrips.length > 0 ? (
            <View style={styles.tripGroup}>
              <Text style={[styles.groupTitle, { color: theme.mutedForeground }]}>
                AFFECTÉES À VOTRE PROFIL
              </Text>
              {activeTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  mode="active"
                  busy={pendingTripId === trip.id}
                  canOperate={canOperateTrips && gpsIsFresh}
                  onAccept={() => void acceptTrip(trip)}
                  onDecline={() => void declineTrip(trip)}
                  onStart={() => void startTrip(trip)}
                  onComplete={() => void completeTrip(trip)}
                />
              ))}
            </View>
          ) : null}

          {availableTrips.length > 0 ? (
            <View style={styles.tripGroup}>
              <Text style={[styles.groupTitle, { color: theme.mutedForeground }]}>
                DEMANDES LIBRES
              </Text>
              <Text style={[styles.body, { color: theme.mutedForeground }]}>
                Choisissez une demande pour la prendre manuellement. Un véhicule disponible doit
                être rattaché à votre profil.
              </Text>
              {availableTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  mode="available"
                  busy={pendingTripId === trip.id}
                  canOperate={canOperateTrips && gpsIsFresh}
                  onAccept={() => void acceptTrip(trip)}
                  onDecline={() => undefined}
                  onStart={() => undefined}
                  onComplete={() => undefined}
                />
              ))}
            </View>
          ) : null}

          {activeTrips.length === 0 && availableTrips.length === 0 ? (
            <View style={[styles.stateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="car-outline" size={25} color={theme.mutedForeground} />
              <Text style={[styles.cardTitle, { color: theme.cardForeground }]}>
                Aucune course à traiter
              </Text>
              <Text style={[styles.body, { color: theme.mutedForeground }]}>
                Les courses affectées ou les demandes libres apparaîtront ici.
              </Text>
            </View>
          ) : null}
        </>
      ) : (
        <>
          {historyRows.length > 0 ? (
            <View style={styles.tripGroup}>
              {historyRows.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  mode="history"
                  busy={false}
                  canOperate={false}
                  onAccept={() => undefined}
                  onDecline={() => undefined}
                  onStart={() => undefined}
                  onComplete={() => undefined}
                />
              ))}
            </View>
          ) : tripsQuery.isFetching ? (
            <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ActivityIndicator color={theme.primary} />
              <Text style={[styles.body, { color: theme.mutedForeground }]}>
                Chargement de l’historique…
              </Text>
            </View>
          ) : (
            <View style={[styles.stateCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="time-outline" size={25} color={theme.mutedForeground} />
              <Text style={[styles.cardTitle, { color: theme.cardForeground }]}>
                Votre historique est vide
              </Text>
              <Text style={[styles.body, { color: theme.mutedForeground }]}>
                Les courses terminées ou annulées apparaîtront ici.
              </Text>
            </View>
          )}

          {historyHasMore ? (
            <ActionButton
              title="Charger les courses suivantes"
              icon="chevron-down"
              onPress={() => setHistoryPage((page) => page + 1)}
              disabled={tripsQuery.isFetching}
              loading={tripsQuery.isFetching}
              secondary
            />
          ) : null}
        </>
      )}
    </View>
  );
}

const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};

const styles = StyleSheet.create({
  panel: { gap: spacing * 4 },
  panelHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing * 2 },
  panelTitle: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, marginTop: spacing },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripGroup: { gap: spacing * 3 },
  groupTitle: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.35 },
  tripCard: { borderWidth: 1, borderRadius: radius, padding: spacing * 4, gap: spacing * 3 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing * 2 },
  reference: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.2 },
  fare: { fontFamily: fonts.bold, fontSize: 20, marginTop: spacing },
  statusBadge: { borderRadius: radius * 0.6, paddingHorizontal: spacing * 2, paddingVertical: spacing },
  statusBadgeText: { fontFamily: fonts.semibold, fontSize: 11 },
  route: { flexDirection: 'row', gap: spacing * 3 },
  routeMark: { alignItems: 'center', paddingTop: spacing * 2 },
  routeLine: { width: 1, height: spacing * 6, marginVertical: spacing },
  routePlaces: { flex: 1, gap: spacing * 3 },
  place: { gap: spacing },
  fieldLabel: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1 },
  placeValue: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing * 2,
    borderTopWidth: 1,
    paddingTop: spacing * 3,
  },
  detailText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  actionSection: { gap: spacing },
  actions: { gap: spacing },
  actionButton: {
    minHeight: 48,
    borderRadius: radius * 0.72,
    paddingHorizontal: spacing * 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing * 2,
  },
  actionButtonText: { fontFamily: fonts.bold, fontSize: 13 },
  stateCard: {
    borderWidth: 1,
    borderRadius: radius,
    padding: spacing * 5,
    alignItems: 'center',
    gap: spacing * 2,
  },
  loadingCard: {
    borderWidth: 1,
    borderRadius: radius,
    padding: spacing * 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing * 3,
  },
  cardTitle: { fontFamily: fonts.bold, fontSize: 16, textAlign: 'center' },
  notice: {
    borderWidth: 1,
    borderRadius: radius * 0.65,
    padding: spacing * 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing * 2,
  },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
});