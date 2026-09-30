import { useState } from 'react';
import {
  Linking,
  StyleSheet,
  View,
} from 'react-native';
import type { TransportTrip } from '@workspace/api-client-react';
import { Badge } from '@workspace/maximus-chauffeur-design-system/components/native/badge';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Card } from '@workspace/maximus-chauffeur-design-system/components/native/card';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
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
      <Card colors={colors} style={styles.card}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Typography colors={colors} size="xs" weight="bold" tone="muted" style={styles.eyebrow}>
              COURSE {trip.reference}
            </Typography>
            <Badge colors={colors} variant="secondary" style={styles.statusBadge}>
              {statusLabel(trip.status)}
            </Badge>
          </View>
          <Typography colors={colors} weight="bold" style={styles.fare}>
            {formatFare(trip.fare)}
          </Typography>
        </View>

        <View style={styles.route}>
          <View style={styles.routeMarks}>
            <View style={[styles.pickupDot, { backgroundColor: colors.primary }]} />
            <View style={[styles.routeLine, { backgroundColor: colors.border }]} />
            <View style={[styles.destinationDot, { borderColor: colors.chart2 }]} />
          </View>
          <View style={styles.locations}>
            <Typography colors={colors} size="xs" weight="bold" tone="muted" style={styles.locationLabel}>
              PRISE EN CHARGE
            </Typography>
            <Typography colors={colors} size="sm" weight="medium" style={styles.location}>
              {trip.pickup}
            </Typography>
            <Typography colors={colors} size="xs" weight="bold" tone="muted" style={[styles.locationLabel, styles.destinationLabel]}>
              DESTINATION
            </Typography>
            <Typography colors={colors} size="sm" weight="medium" style={styles.location}>
              {trip.destination}
            </Typography>
          </View>
        </View>

        {trip.status === 'ASSIGNED' || trip.status === 'IN_PROGRESS' ? (
          <TripRouteMap trip={trip} driverPosition={driverPosition} colors={colors} />
        ) : null}

        <View style={[styles.passenger, { backgroundColor: colors.muted }]}>
          <View style={{ flex: 1 }}>
            <Typography colors={colors} size="xs" weight="bold" tone="muted" style={styles.locationLabel}>
              PASSAGER
            </Typography>
            <Typography colors={colors} size="sm" weight="semibold" style={styles.passengerName}>
              {trip.passengerName}
            </Typography>
          </View>
          {trip.passengerPhone ? (
            <Button
              colors={colors}
              accessibilityRole="button"
              accessibilityLabel={`Appeler ${trip.passengerName}`}
              onPress={() => void callPassenger()}
              variant="outline"
              size="sm"
              style={styles.callButton}
            >
              Appeler
            </Button>
          ) : null}
        </View>

        {error ? (
          <Typography colors={colors} tone="destructive" size="xs" style={styles.errorText}>
            {error}
          </Typography>
        ) : null}

        {action && canUpdate ? (
          <Button
            colors={colors}
            accessibilityRole="button"
            accessibilityState={{ disabled: isBusy, busy: isBusy }}
            disabled={isBusy}
            loading={isBusy}
            onPress={() => void handleAction()}
            style={styles.actionButton}
          >
            {action.label}
          </Button>
        ) : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: cardRadius, padding: space.md, gap: space.md },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  eyebrow: { letterSpacing: 0.8 },
  statusBadge: { marginTop: space.xs },
  fare: { fontSize: 15 },
  route: { flexDirection: 'row', gap: space.sm },
  routeMarks: { alignItems: 'center', paddingTop: 4, width: 14 },
  pickupDot: { width: 9, height: 9, borderRadius: 5 },
  routeLine: { width: 1, height: 38 },
  destinationDot: { width: 9, height: 9, borderRadius: 2, borderWidth: 2 },
  locations: { flex: 1 },
  locationLabel: { letterSpacing: 0.7 },
  destinationLabel: { marginTop: space.md },
  location: { lineHeight: 20, marginTop: space.xs },
  passenger: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderRadius: cardRadius / 2 },
  passengerName: { marginTop: space.xs },
  callButton: { paddingHorizontal: space.sm },
  errorText: { lineHeight: 18 },
  actionButton: { minHeight: 48, paddingHorizontal: space.md, borderRadius: cardRadius },
});