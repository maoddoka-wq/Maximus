import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { TransportTrip } from '@workspace/api-client-react';
import { cardRadius, space, type getPalette } from '../theme';

type Palette = ReturnType<typeof getPalette>;
type TripStatus = TransportTrip['status'];

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
  onUpdateStatus,
}: {
  trip: TransportTrip;
  colors: Palette;
  canUpdate: boolean;
  isBusy: boolean;
  onUpdateStatus: (status: TripStatus, pickupCode?: string) => Promise<void>;
}) {
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [pickupCode, setPickupCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const callPassenger = async () => {
    if (!trip.passengerPhone) return;
    try {
      await Linking.openURL(`tel:${trip.passengerPhone}`);
    } catch {
      setError('Impossible d’ouvrir l’application Téléphone.');
    }
  };

  const beginTrip = async () => {
    const code = pickupCode.replace(/\D/g, '');
    if (code.length !== 4) {
      setError('Saisissez le code de prise en charge à quatre chiffres fourni par le passager.');
      return;
    }
    try {
      setError(null);
      await onUpdateStatus('IN_PROGRESS', code);
      setPickupCode('');
      setCodeModalOpen(false);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : 'Impossible de démarrer cette course.');
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
    if (trip.status === 'ASSIGNED') {
      setError(null);
      setCodeModalOpen(true);
      return;
    }
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

      <Modal
        visible={codeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCodeModalOpen(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.sidebar + 'CC' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Confirmer la prise en charge</Text>
            <Text style={[styles.modalCopy, { color: colors.mutedForeground }]}>
              Demandez au passager son code à quatre chiffres avant de démarrer la course.
            </Text>
            <TextInput
              value={pickupCode}
              onChangeText={(value) => setPickupCode(value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              maxLength={4}
              accessibilityLabel="Code de prise en charge"
              style={[
                styles.codeInput,
                { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border },
              ]}
            />
            {error ? <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={() => {
                  setError(null);
                  setCodeModalOpen(false);
                }}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelText, { color: colors.foreground }]}>Annuler</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isBusy || pickupCode.length !== 4}
                onPress={() => void beginTrip()}
                style={[
                  styles.confirmButton,
                  { backgroundColor: colors.primary, opacity: isBusy || pickupCode.length !== 4 ? 0.5 : 1 },
                ]}
              >
                {isBusy ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Confirmer</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.md },
  modalCard: { width: '100%', maxWidth: 420, padding: space.md, borderRadius: cardRadius, gap: space.sm },
  modalTitle: { fontSize: 19, fontFamily: 'DMSans_700Bold' },
  modalCopy: { fontSize: 14, lineHeight: 20 },
  codeInput: { minHeight: 54, borderWidth: 1, borderRadius: cardRadius, textAlign: 'center', fontSize: 24, letterSpacing: 8, fontFamily: 'DMSans_700Bold' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, marginTop: space.xs },
  cancelButton: { minHeight: 46, justifyContent: 'center', paddingHorizontal: space.md, borderWidth: 1, borderRadius: cardRadius },
  cancelText: { fontSize: 14, fontFamily: 'DMSans_600SemiBold' },
  confirmButton: { minHeight: 46, minWidth: 120, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.md, borderRadius: cardRadius },
});