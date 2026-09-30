import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { TransportTrip } from '@workspace/api-client-react';
import { cardRadius, space, type getPalette } from '../theme';
import { TripRouteMap } from './TripRouteMap';

type Palette = ReturnType<typeof getPalette>;
type TripStatus = TransportTrip['status'];
type DriverPosition = { latitude: number | null; longitude: number | null } | null;

function formatFare(fare: number): string {
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(fare);
}

function statusLabel(status: TripStatus): string {
  if (status === 'OFFERED') return 'Nouvelle proposition';
  if (status === 'ASSIGNED') return 'À prendre en charge';
  if (status === 'IN_PROGRESS') return 'En cours';
  return status;
}

export function TripCard({
  trip,
  colors,
  canUpdate,
  isBusy,
  driverPosition,
  onUpdateStatus,
}: {
  trip: TransportTrip;
  colors: Palette;
  canUpdate: boolean;
  isBusy: boolean;
  driverPosition: DriverPosition;
  onUpdateStatus: (status: TripStatus) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);

  const callPassenger = async () => {
    if (!trip.passengerPhone) return;
    try {
      await Linking.openURL(`tel:${trip.passengerPhone}`);
    } catch {
      setError('Impossible d’ouvrir l’application Téléphone.');
    }
  };

  const action =
    trip.status === 'OFFERED'
      ? { label: 'Accepter la course', status: 'ASSIGNED' as const }
      : trip.status === 'ASSIGNED'
        ? { label: 'Démarrer la course', status: 'IN_PROGRESS' as const }
        : trip.status === 'IN_PROGRESS'
          ? { label: 'Terminer la course', status: 'COMPLETED' as const }
          : null;

  const handleAction = async () => {
    if (!action) return;
    setError(null);
    try {
      await onUpdateStatus(action.status);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'La mise à jour de la course a échoué.');
    }
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>COURSE {trip.reference}</Text>
            <Text style={[styles.title, { color: colors.cardForeground }]}>{statusLabel(trip.status)}</Text>
          </View>
          <Text style={[styles.fare, { color: colors.foreground }]}>{formatFare(trip.fare)}</Text>
        </View>

        <View style={styles.route}>
          <View style={styles.routeMarks}>
            <View style={[styles.pickupDot, { backgroundColor: colors.primary }]} />
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
            <View style={[styles.destinationDot, { borderColor: colors.chart2 }]} />
          </View>
          <View style={styles.locations}>
            <Text style={[styles.locationLabel, { color: colors.mutedForeground }]}>PRISE EN CHARGE</Text>
            <Text style={[styles.location, { color: colors.foreground }]}>{trip.pickup}</Text>
            <Text style={[styles.locationLabel, styles.destinationLabel, { color: colors.mutedForeground }]}>DESTINATION</Text>
            <Text style={[styles.location, { color: colors.foreground }]}>{trip.destination}</Text>
          </View>
        </View>

        {trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS' ? (
          <TripRouteMap trip={trip} driverPosition={driverPosition} colors={colors} />
        ) : null}

        <View style={[styles.passenger, { backgroundColor: colors.muted }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationLabel, { color: colors.mutedForeground }]}>PASSAGER</Text>
            <Text style={[styles.passengerName, { color: colors.foreground }]}>{trip.passengerName}</Text>
          </View>
          {trip.passengerPhone ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Appeler ${trip.passengerName}`}
              onPress={() => void callPassenger()}
              style={[styles.callButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.callButtonText, { color: colors.primary }]}>Appeler</Text>
            </Pressable>
          ) : null}
        </View>

        {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}

        {action && canUpdate ? (
          <Pressable
            accessibilityRole="button"
            disabled={isBusy}
            onPress={() => void handleAction()}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.84 : 1 },
              isBusy && styles.busy,
            ]}
          >
            {isBusy ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Text style={[styles.actionText, { color: colors.primaryForeground }]}>{action.label}</Text>
            )}
          </Pressable>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: cardRadius, padding: space.md, gap: space.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  eyebrow: { fontSize: 11, letterSpacing: 0.8, fontFamily: 'DMSans_700Bold' },
  title: { fontSize: 18, lineHeight: 24, fontFamily: 'DMSans_700Bold', marginTop: space.xs },
  fare: { fontSize: 15, fontFamily: 'DMSans_700Bold' },
  route: { flexDirection: 'row', gap: space.sm },
  routeMarks: { alignItems: 'center', paddingTop: 4, width: 14 },
  pickupDot: { width: 9, height: 9, borderRadius: 5 },
  routeLine: { width: 1, height: 38 },
  destinationDot: { width: 9, height: 9, borderRadius: 2, borderWidth: 2 },
  locations: { flex: 1 },
  locationLabel: { fontSize: 10, letterSpacing: 0.7, fontFamily: 'DMSans_700Bold' },
  destinationLabel: { marginTop: space.md },
  location: { fontSize: 14, lineHeight: 20, fontFamily: 'DMSans_500Medium', marginTop: space.xs },
  passenger: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: cardRadius / 2 },
  passengerName: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', marginTop: space.xs },
  callButton: { borderWidth: 1, borderRadius: cardRadius / 2, paddingHorizontal: space.sm, paddingVertical: space.xs },
  callButtonText: { fontSize: 13, fontFamily: 'DMSans_700Bold' },
  errorText: { fontSize: 12, lineHeight: 18 },
  actionButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, borderRadius: cardRadius },
  actionText: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  busy: { opacity: 0.7 },
});