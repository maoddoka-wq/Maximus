import { StyleSheet, View } from 'react-native';
import type { TransportDriver } from '@workspace/api-client-react';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Card } from '@workspace/maximus-chauffeur-design-system/components/native/card';
import { Spinner } from '@workspace/maximus-chauffeur-design-system/components/native/spinner';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import { isDriverAvailableWithActiveGps } from '../services/driver-availability-policy';
import type { DriverGpsState } from '../services/location-sync-policy';
import { cardRadius, space, type getPalette } from '../theme';

type Palette = ReturnType<typeof getPalette>;
export type GpsState = DriverGpsState;

export function AvailabilityCard({
  driver,
  colors,
  canToggle,
  isBusy,
  gpsState,
  gpsMessage,
  onToggle,
  onEnableGps,
}: {
  driver: TransportDriver;
  colors: Palette;
  canToggle: boolean;
  isBusy: boolean;
  gpsState: GpsState;
  gpsMessage: string | null;
  onToggle: () => void;
  onEnableGps?: () => void;
}) {
  const isOnTrip = driver.availability === 'ON_TRIP';
  const serverSaysAvailable = driver.availability === 'AVAILABLE';
  const isAvailable = isDriverAvailableWithActiveGps(
    driver.availability,
    gpsState === 'active',
  );
  const statusLabel = isOnTrip
    ? 'En course'
    : isAvailable
      ? 'Disponible'
      : serverSaysAvailable && gpsState === 'starting'
        ? 'Vérification GPS'
        : serverSaysAvailable && gpsState === 'stale'
          ? 'GPS à actualiser'
        : 'En pause';
  const statusColor = isOnTrip || isAvailable ? colors.chart3 : colors.mutedForeground;
  const gpsLabel =
    gpsState === 'active' ? 'GPS actif' :
    gpsState === 'starting' ? 'Activation du GPS…' :
    gpsState === 'attention' ? 'GPS à activer' :
    gpsState === 'stale' ? 'Position non confirmée' :
    'GPS en attente';
  const availabilityActionLabel =
    gpsState === 'stale' && serverSaysAvailable
      ? 'Actualiser le GPS'
      : isAvailable
        ? 'Me mettre en pause'
        : 'Passer disponible';
  const availabilityAccessibilityLabel =
    gpsState === 'stale' && serverSaysAvailable
      ? 'Actualiser ma position GPS'
      : isAvailable
        ? 'Me mettre en pause'
        : 'Passer disponible';
  const showEnableGpsButton =
    Boolean(onEnableGps) &&
    ((gpsState === 'attention' && (isOnTrip || (serverSaysAvailable && !canToggle))) ||
      (gpsState === 'stale' && isOnTrip));

  return (
    <Card colors={colors} style={styles.card}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Typography colors={colors} size="lg" weight="bold" style={styles.title}>
            Disponibilité
          </Typography>
          <Typography colors={colors} size="xs" tone="muted" style={styles.subtitle}>
            Gérez votre statut et le partage de position.
          </Typography>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '1A' }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Typography colors={colors} size="xs" weight="bold" style={{ color: statusColor }}>
            {statusLabel}
          </Typography>
        </View>
      </View>

      <View style={[styles.gpsRow, { backgroundColor: colors.muted }]}>
        {gpsState === 'starting' ? (
          <Spinner size="small" color={colors.primary} />
        ) : (
          <View
            style={[
              styles.gpsDot,
              { backgroundColor: gpsState === 'active' ? colors.chart3 : colors.mutedForeground },
            ]}
          />
        )}
        <Typography colors={colors} size="xs" weight="semibold">
          {gpsLabel}
        </Typography>
        {gpsMessage ? (
          <Typography colors={colors} size="xs" tone="muted" style={styles.gpsMessage}>
            {gpsMessage}
          </Typography>
        ) : null}
      </View>

      {canToggle && !isOnTrip ? (
        <Button
          colors={colors}
          variant={isAvailable ? 'secondary' : 'default'}
          accessibilityRole="button"
          accessibilityLabel={availabilityAccessibilityLabel}
          disabled={isBusy}
          loading={isBusy}
          onPress={onToggle}
          style={styles.button}
        >
          {availabilityActionLabel}
        </Button>
      ) : null}

      {showEnableGpsButton && onEnableGps ? (
        <Button
          colors={colors}
          variant="outline"
          accessibilityRole="button"
          onPress={onEnableGps}
          style={styles.gpsButton}
        >
          {gpsState === 'stale' ? 'Actualiser le GPS' : 'Réactiver le GPS'}
        </Button>
      ) : null}

      {isOnTrip ? (
        <Typography colors={colors} size="xs" tone="muted" style={styles.tripNote}>
          Votre statut sera actualisé à la fin de la course.
        </Typography>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: cardRadius, padding: space.md, gap: space.md },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { lineHeight: 24 },
  subtitle: { lineHeight: 19, marginTop: space.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: 999,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  gpsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, borderRadius: cardRadius / 2, padding: space.sm },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsMessage: { width: '100%', lineHeight: 18, marginTop: space.xs },
  button: { minHeight: 48, paddingHorizontal: space.md, borderRadius: cardRadius },
  gpsButton: { minHeight: 42, borderRadius: cardRadius },
  tripNote: { lineHeight: 19 },
});