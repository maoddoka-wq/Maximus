import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TransportDriver } from '@workspace/api-client-react';
import { cardRadius, space, type getPalette } from '../theme';

type Palette = ReturnType<typeof getPalette>;
export type GpsState = 'active' | 'starting' | 'attention' | 'inactive';

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
  const isAvailable = driver.availability === 'AVAILABLE';
  const statusLabel = isOnTrip ? 'En course' : isAvailable ? 'Disponible' : 'En pause';
  const statusColor = isOnTrip || isAvailable ? colors.chart3 : colors.mutedForeground;
  const gpsLabel =
    gpsState === 'active' ? 'GPS actif' :
    gpsState === 'starting' ? 'Activation du GPS…' :
    gpsState === 'attention' ? 'Autorisation nécessaire' :
    'GPS en attente';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.cardForeground }]}>Disponibilité</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Gérez votre statut et le partage de position.
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusColor + '1A' }]}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      <View style={[styles.gpsRow, { backgroundColor: colors.muted }]}>
        {gpsState === 'starting' ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View
            style={[
              styles.gpsDot,
              { backgroundColor: gpsState === 'active' ? colors.chart3 : colors.mutedForeground },
            ]}
          />
        )}
        <Text style={[styles.gpsText, { color: colors.foreground }]}>{gpsLabel}</Text>
        {gpsMessage ? (
          <Text style={[styles.gpsMessage, { color: colors.mutedForeground }]}>{gpsMessage}</Text>
        ) : null}
      </View>

      {canToggle && !isOnTrip ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isAvailable ? 'Me mettre en pause' : 'Passer disponible'}
          disabled={isBusy}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: isAvailable ? colors.secondary : colors.primary, opacity: pressed ? 0.86 : 1 },
            isBusy && styles.busy,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator color={isAvailable ? colors.secondaryForeground : colors.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.buttonText,
                { color: isAvailable ? colors.secondaryForeground : colors.primaryForeground },
              ]}
            >
              {isAvailable ? 'Me mettre en pause' : 'Passer disponible'}
            </Text>
          )}
        </Pressable>
      ) : null}

      {gpsState === 'attention' && onEnableGps && driver.availability !== 'PAUSED' ? (
        <Pressable
          accessibilityRole="button"
          onPress={onEnableGps}
          style={[styles.gpsButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.gpsButtonText, { color: colors.primary }]}>Réactiver le GPS</Text>
        </Pressable>
      ) : null}

      {isOnTrip ? (
        <Text style={[styles.tripNote, { color: colors.mutedForeground }]}>
          Votre statut sera actualisé à la fin de la course.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: cardRadius, padding: space.md, gap: space.md },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  title: { fontSize: 18, lineHeight: 24, fontFamily: 'DMSans_700Bold' },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: space.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    borderRadius: 999,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  badgeText: { fontSize: 12, fontFamily: 'DMSans_700Bold' },
  gpsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.xs, borderRadius: cardRadius / 2, padding: space.sm },
  gpsDot: { width: 8, height: 8, borderRadius: 4 },
  gpsText: { fontSize: 13, fontFamily: 'DMSans_600SemiBold' },
  gpsMessage: { width: '100%', fontSize: 12, lineHeight: 18, marginTop: space.xs },
  button: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, borderRadius: cardRadius },
  buttonText: { fontSize: 15, fontFamily: 'DMSans_700Bold' },
  busy: { opacity: 0.7 },
  gpsButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: cardRadius },
  gpsButtonText: { fontSize: 13, fontFamily: 'DMSans_700Bold' },
  tripNote: { fontSize: 13, lineHeight: 19 },
});