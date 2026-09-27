import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { radius, spacing } from '@/constants/colors';
import { useDriverSession } from '@/contexts/DriverSessionContext';
import { API_ORIGIN } from '@/lib/mobile-api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
};

function AppMark({ size = 46 }: { size?: number }) {
  return (
    <Image
      source={require('../assets/images/icon.png')}
      resizeMode="contain"
      style={{ width: size, height: size, borderRadius: size * 0.22 }}
    />
  );
}

function BrandHeader({ dark = false }: { dark?: boolean }) {
  const theme = useColors();
  return (
    <View style={styles.brand}>
      <AppMark />
      <View>
        <Text style={[styles.brandName, { color: dark ? theme.sidebarForeground : theme.foreground }]}>
          MAXIMUS
        </Text>
        <Text style={[styles.brandCaption, { color: dark ? theme.mutedForeground : theme.mutedForeground }]}>
          CHAUFFEUR
        </Text>
      </View>
    </View>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  icon,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  secondary?: boolean;
}) {
  const theme = useColors();
  const backgroundColor = secondary ? theme.secondary : theme.primary;
  const color = secondary ? theme.secondaryForeground : theme.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor, opacity: disabled ? 0.55 : pressed ? 0.82 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={color} /> : null}
          <Text style={[styles.buttonText, { color }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

function InlineNotice({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  const theme = useColors();
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.notice,
        { backgroundColor: theme.muted, borderColor: theme.border },
      ]}
    >
      <Ionicons name="information-circle-outline" size={20} color={theme.foreground} />
      <Text style={[styles.noticeText, { color: theme.foreground }]}>{message}</Text>
      {onDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le message"
          onPress={onDismiss}
          hitSlop={10}
        >
          <Ionicons name="close" size={18} color={theme.mutedForeground} />
        </Pressable>
      ) : null}
    </View>
  );
}

function LoginScreen() {
  const theme = useColors();
  const insets = useSafeAreaInsets();
  const { error, isSigningIn, signIn, clearError } = useDriverSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companySlug, setCompanySlug] = useState('');

  const submit = async () => {
    if (!email.trim() || !password) {
      return;
    }
    const signedIn = await signIn(email, password, companySlug);
    if (signedIn) setPassword('');
  };

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
        },
      ]}
    >
      <StatusBar style={useColorScheme() === 'dark' ? 'light' : 'dark'} />
      <KeyboardAwareScrollViewCompat
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.loginScroll}
      >
        <BrandHeader />

        <View style={styles.loginIntro}>
          <Text style={[styles.eyebrow, { color: theme.mutedForeground }]}>
            ESPACE CHAUFFEUR
          </Text>
          <Text style={[styles.loginTitle, { color: theme.foreground }]}>
            Les clients proches peuvent vous trouver.
          </Text>
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>
            Connectez-vous avec le compte employé associé au module Transport.
          </Text>
        </View>

        <View
          style={[
            styles.locationExplanation,
            { backgroundColor: theme.sidebar, borderRadius: radius },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.sidebarAccent }]}>
            <Ionicons name="navigate-outline" size={21} color={theme.sidebarPrimary} />
          </View>
          <View style={styles.locationExplanationText}>
            <Text style={[styles.cardTitle, { color: theme.sidebarForeground }]}>
              Position en arrière-plan
            </Text>
            <Text style={[styles.cardBody, { color: theme.sidebarForeground, opacity: 0.78 }]}>
              Pendant votre session chauffeur, votre GPS aide à rapprocher les clients d’un chauffeur
              disponible, même lorsque l’écran est verrouillé. Votre position n’est pas publiée dans
              un annuaire.
            </Text>
          </View>
        </View>

        <View style={[styles.formCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.formTitle, { color: theme.cardForeground }]}>Connexion</Text>

          <FieldLabel label="Adresse e-mail" />
          <TextInput
            accessibilityLabel="Adresse e-mail"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            onFocus={clearError}
            placeholder="nom@entreprise.sn"
            placeholderTextColor={theme.mutedForeground}
            returnKeyType="next"
            style={[
              styles.input,
              { backgroundColor: theme.background, borderColor: theme.input, color: theme.foreground },
            ]}
            value={email}
          />

          <FieldLabel label="Mot de passe" />
          <TextInput
            accessibilityLabel="Mot de passe"
            autoCapitalize="none"
            autoComplete="current-password"
            onChangeText={setPassword}
            onFocus={clearError}
            onSubmitEditing={() => void submit()}
            placeholder="Votre mot de passe"
            placeholderTextColor={theme.mutedForeground}
            returnKeyType="go"
            secureTextEntry
            style={[
              styles.input,
              { backgroundColor: theme.background, borderColor: theme.input, color: theme.foreground },
            ]}
            value={password}
          />

          <FieldLabel label="Code de connexion entreprise (facultatif)" />
          <TextInput
            accessibilityLabel="Code de connexion entreprise facultatif"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setCompanySlug}
            onFocus={clearError}
            placeholder="ex. ma-societe"
            placeholderTextColor={theme.mutedForeground}
            style={[
              styles.input,
              { backgroundColor: theme.background, borderColor: theme.input, color: theme.foreground },
            ]}
            value={companySlug}
          />

          {error ? <InlineNotice message={error} onDismiss={clearError} /> : null}
          {Platform.OS === 'web' ? (
            <InlineNotice message="Aperçu web uniquement. La connexion chauffeur et le GPS en arrière-plan nécessitent l’application native iOS ou Android." />
          ) : null}
          {!API_ORIGIN ? (
            <InlineNotice message="L’adresse du serveur MAXIMUS n’est pas configurée pour cette version." />
          ) : null}

          <PrimaryButton
            title="Se connecter"
            onPress={() => void submit()}
            disabled={!email.trim() || !password || !API_ORIGIN || Platform.OS === 'web'}
            loading={isSigningIn}
            icon="arrow-forward"
          />
          <Text style={[styles.helperText, { color: theme.mutedForeground }]}>
            La position est envoyée uniquement par votre session chauffeur sécurisée.
          </Text>
        </View>

        <Text style={[styles.footerText, { color: theme.mutedForeground }]}>
          MAXIMUS Transport · Sénégal
        </Text>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function LoadingScreen() {
  const theme = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.centeredScreen,
        {
          backgroundColor: theme.background,
          paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
        },
      ]}
    >
      <StatusBar style={useColorScheme() === 'dark' ? 'light' : 'dark'} />
      <AppMark size={58} />
      <ActivityIndicator color={theme.primary} style={{ marginTop: spacing * 4 }} />
      <Text style={[styles.bodyText, { color: theme.mutedForeground, marginTop: spacing * 3 }]}>
        Vérification de votre session…
      </Text>
    </View>
  );
}

function LocationPermissionScreen() {
  const theme = useColors();
  const insets = useSafeAreaInsets();
  const {
    locationPermissionState,
    isTracking,
    isActivatingLocation,
    error,
    activateBackgroundLocation,
    openSettings,
    clearError,
    signOut,
    isSigningOut,
  } = useDriverSession();

  const canOpenSettings =
    locationPermissionState === 'settings-required' ||
    locationPermissionState === 'services-disabled';
  const unsupported = locationPermissionState === 'unsupported';
  const servicesDisabled = locationPermissionState === 'services-disabled';

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
        },
      ]}
    >
      <StatusBar style={useColorScheme() === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.permissionContent}>
        <BrandHeader />

        <View style={[styles.permissionIcon, { backgroundColor: theme.secondary }]}>
          <Ionicons
            name={unsupported ? 'phone-portrait-outline' : 'location-outline'}
            size={35}
            color={theme.primary}
          />
        </View>

        <Text style={[styles.loginTitle, { color: theme.foreground }]}>
          {unsupported
            ? 'Ouvrez l’application sur votre téléphone.'
            : servicesDisabled
              ? 'Activez la localisation pour continuer.'
              : 'Autorisez le GPS en arrière-plan.'}
        </Text>
        <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>
          {unsupported
            ? 'La localisation continue écran verrouillé fonctionne dans l’application native iOS ou Android, pas dans l’aperçu web.'
            : servicesDisabled
              ? 'La localisation du téléphone est désactivée. Activez-la dans les réglages pour continuer et recevoir des demandes de course.'
              : 'La localisation est obligatoire pour être détectable par les clients. Autorisez-la pendant l’utilisation et en arrière-plan ; une position GPS doit être obtenue avant de continuer.'}
        </Text>

        {!unsupported ? (
          <View style={[styles.permissionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <PermissionRow
              icon="lock-closed-outline"
              text="Votre session est protégée par un jeton stocké dans le coffre sécurisé du téléphone."
            />
            <PermissionRow
              icon="people-outline"
              text="La position sert au rapprochement avec les clients ; elle n’est pas affichée dans un répertoire public."
            />
            <PermissionRow
              icon="battery-half-outline"
              text="Le suivi reste actif pendant la session et peut augmenter la consommation de batterie."
            />
          </View>
        ) : null}

        {error ? <InlineNotice message={error} onDismiss={clearError} /> : null}

        {!unsupported ? (
          <>
            {canOpenSettings ? (
              <PrimaryButton title="Ouvrir les réglages" onPress={() => void openSettings()} icon="settings-outline" />
            ) : (
              <PrimaryButton
                title={isTracking ? 'GPS actif' : 'Activer ma localisation'}
                onPress={() => void activateBackgroundLocation()}
                disabled={isTracking}
                loading={isActivatingLocation || locationPermissionState === 'checking'}
                icon="navigate"
              />
            )}
            <Pressable
              accessibilityRole="button"
              disabled={isSigningOut}
              onPress={() => void signOut()}
              style={styles.textButton}
            >
              <Text style={[styles.textButtonLabel, { color: theme.mutedForeground }]}>
                Se déconnecter
              </Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function PermissionRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useColors();
  return (
    <View style={styles.permissionRow}>
      <Ionicons name={icon} size={19} color={theme.primary} />
      <Text style={[styles.cardBody, { color: theme.cardForeground, flex: 1 }]}>{text}</Text>
    </View>
  );
}

function DriverDashboard() {
  const theme = useColors();
  const insets = useSafeAreaInsets();
  const {
    driver,
    isRefreshingSession,
    isTracking,
    syncStatus,
    error,
    isChangingAvailability,
    isSigningOut,
    changeAvailability,
    signOut,
    refreshSession,
    refreshLocation,
    clearError,
  } = useDriverSession();

  const statusLabel =
    driver?.availability === 'AVAILABLE'
      ? 'Disponible'
      : driver?.availability === 'ON_TRIP'
        ? 'En course'
        : 'En pause';
  const freshness = driver?.locationUpdatedAt
    ? new Date(driver.locationUpdatedAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
        },
      ]}
    >
      <StatusBar style={useColorScheme() === 'dark' ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingSession}
            onRefresh={() => void refreshSession()}
            tintColor={theme.primary}
          />
        }
      >
        <View style={styles.dashboardTop}>
          <BrandHeader />
          <View style={[styles.livePill, { backgroundColor: isTracking ? theme.secondary : theme.muted }]}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isTracking ? theme.primary : theme.mutedForeground },
              ]}
            />
            <Text style={[styles.liveLabel, { color: theme.foreground }]}>
              {isTracking ? 'GPS actif' : 'GPS en pause'}
            </Text>
          </View>
        </View>

        <View style={[styles.welcomePanel, { backgroundColor: theme.sidebar, borderRadius: radius }]}>
          <Text style={[styles.eyebrow, { color: theme.sidebarPrimary }]}>VOTRE ESPACE</Text>
          <Text style={[styles.welcomeTitle, { color: theme.sidebarForeground }]}>
            Bonjour{driver?.name ? `, ${driver.name}` : ''}
          </Text>
          <Text style={[styles.cardBody, { color: theme.sidebarForeground, opacity: 0.78 }]}>
            Votre disponibilité détermine si vous apparaissez aux clients qui recherchent un chauffeur.
          </Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statusHeading}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: theme.mutedForeground }]}>DISPONIBILITÉ</Text>
              <Text style={[styles.statusTitle, { color: theme.cardForeground }]}>{statusLabel}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    driver?.availability === 'AVAILABLE' ? theme.primary : theme.secondary,
                },
              ]}
            >
              <Ionicons
                name={
                  driver?.availability === 'ON_TRIP'
                    ? 'car-sport'
                    : driver?.availability === 'AVAILABLE'
                      ? 'checkmark-circle'
                      : 'pause-circle'
                }
                size={18}
                color={
                  driver?.availability === 'AVAILABLE'
                    ? theme.primaryForeground
                    : theme.secondaryForeground
                }
              />
            </View>
          </View>
          <Text style={[styles.cardBody, { color: theme.mutedForeground }]}>
            {driver?.availability === 'ON_TRIP'
              ? 'La position continue d’être envoyée pendant la course. Terminez-la dans MAXIMUS avant de vous déconnecter.'
              : driver?.availability === 'AVAILABLE'
                ? 'Les clients proches peuvent vous trouver. Mettez-vous en pause si vous ne prenez plus de courses.'
                : 'Passez en mode disponible lorsque vous êtes prêt à recevoir des demandes.'}
          </Text>
          {driver?.availability !== 'ON_TRIP' ? (
            <PrimaryButton
              title={driver?.availability === 'AVAILABLE' ? 'Me mettre en pause' : 'Devenir disponible'}
              onPress={() =>
                void changeAvailability(
                  driver?.availability === 'AVAILABLE' ? 'PAUSED' : 'AVAILABLE',
                )
              }
              loading={isChangingAvailability}
              disabled={!isTracking && driver?.availability !== 'AVAILABLE'}
              icon={driver?.availability === 'AVAILABLE' ? 'pause' : 'radio-button-on'}
            />
          ) : null}
        </View>

        <View style={[styles.locationCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.locationCardHeader}>
            <View style={[styles.iconCircle, { backgroundColor: theme.secondary }]}>
              <Ionicons name="navigate-outline" size={19} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: theme.cardForeground }]}>Position GPS</Text>
              <Text style={[styles.cardBody, { color: theme.mutedForeground }]}>
                {freshness ? `Dernière position reçue à ${freshness}` : 'En attente du premier point GPS'}
              </Text>
            </View>
            <Ionicons
              name={isTracking ? 'checkmark-circle' : 'alert-circle-outline'}
              size={22}
              color={isTracking ? theme.primary : theme.mutedForeground}
            />
          </View>

          {syncStatus?.error ? (
            <InlineNotice message={syncStatus.error} />
          ) : syncStatus?.receivedAt ? (
            <Text style={[styles.helperText, { color: theme.mutedForeground }]}>
              Synchronisation confirmée à{' '}
              {new Date(syncStatus.receivedAt).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
              .
            </Text>
          ) : null}

          {isTracking ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void refreshLocation()}
              style={styles.inlineAction}
            >
              <Ionicons name="refresh-outline" size={16} color={theme.primary} />
              <Text style={[styles.inlineActionText, { color: theme.primary }]}>
                Actualiser maintenant
              </Text>
            </Pressable>
          ) : (
            <InlineNotice message="Le suivi GPS est arrêté. Réactivez-le depuis les autorisations de localisation." />
          )}
        </View>

        {error ? <InlineNotice message={error} onDismiss={clearError} /> : null}

        <View style={[styles.privacyNote, { borderColor: theme.border }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={theme.mutedForeground} />
          <Text style={[styles.helperText, { color: theme.mutedForeground, flex: 1 }]}>
            Position utilisée pour le rapprochement client-chauffeur ; aucun annuaire public de chauffeurs n’est créé.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSigningOut}
          onPress={() => void signOut()}
          style={({ pressed }) => [
            styles.logoutButton,
            { borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          {isSigningOut ? (
            <ActivityIndicator color={theme.mutedForeground} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={19} color={theme.mutedForeground} />
              <Text style={[styles.logoutLabel, { color: theme.mutedForeground }]}>Se déconnecter</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function FieldLabel({ label }: { label: string }) {
  const theme = useColors();
  return <Text style={[styles.fieldLabel, { color: theme.foreground }]}>{label}</Text>;
}

function SessionRecoveryScreen() {
  const theme = useColors();
  const insets = useSafeAreaInsets();
  const { error, refreshSession, clearError } = useDriverSession();
  return (
    <View
      style={[
        styles.centeredScreen,
        {
          backgroundColor: theme.background,
          paddingTop: Platform.OS === 'web' ? 67 : insets.top,
          paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom,
        },
      ]}
    >
      <BrandHeader />
      <Ionicons
        name="cloud-offline-outline"
        size={38}
        color={theme.mutedForeground}
        style={{ marginTop: spacing * 8 }}
      />
      <Text style={[styles.statusTitle, { color: theme.foreground, marginTop: spacing * 4 }]}>
        Serveur injoignable
      </Text>
      <Text style={[styles.bodyText, { color: theme.mutedForeground, textAlign: 'center' }]}>
        Votre session reste enregistrée sur ce téléphone. Vérifiez le réseau puis réessayez.
      </Text>
      {error ? <InlineNotice message={error} onDismiss={clearError} /> : null}
      <PrimaryButton title="Réessayer" onPress={() => void refreshSession()} icon="refresh" />
    </View>
  );
}

export default function DriverHomeScreen() {
  const { isHydrated, accessToken, isLoadingSession, driver, locationPermissionState } =
    useDriverSession();

  if (!API_ORIGIN) return <LoginScreen />;
  if (!isHydrated) return <LoadingScreen />;
  if (!accessToken) return <LoginScreen />;
  if (isLoadingSession && !driver) return <LoadingScreen />;
  if (!driver) return <SessionRecoveryScreen />;
  if (locationPermissionState !== 'ready') return <LocationPermissionScreen />;
  return <DriverDashboard />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  centeredScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing * 5,
    gap: spacing * 2,
  },
  loginScroll: {
    flexGrow: 1,
    paddingHorizontal: spacing * 5,
    paddingBottom: spacing * 6,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing * 3 },
  brandName: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: 1.1 },
  brandCaption: {
    fontFamily: fonts.semibold,
    fontSize: 10,
    letterSpacing: 2.1,
    marginTop: 2,
  },
  loginIntro: { marginTop: spacing * 9, marginBottom: spacing * 5 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.5 },
  loginTitle: {
    fontFamily: fonts.bold,
    fontSize: 29,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginTop: spacing * 2,
  },
  bodyText: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23, marginTop: spacing * 2 },
  locationExplanation: {
    flexDirection: 'row',
    gap: spacing * 3,
    padding: spacing * 4,
    marginBottom: spacing * 5,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationExplanationText: { flex: 1, gap: spacing },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 15 },
  cardBody: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19 },
  formCard: {
    borderWidth: 1,
    borderRadius: radius,
    padding: spacing * 4,
    gap: spacing * 2,
  },
  formTitle: { fontFamily: fonts.bold, fontSize: 20, marginBottom: spacing },
  fieldLabel: { fontFamily: fonts.medium, fontSize: 13, marginTop: spacing },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: radius * 0.72,
    paddingHorizontal: spacing * 3,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  button: {
    minHeight: 52,
    borderRadius: radius * 0.72,
    paddingHorizontal: spacing * 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing * 2,
    marginTop: spacing * 2,
  },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
  helperText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 },
  footerText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing * 5,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing * 2,
    borderWidth: 1,
    borderRadius: radius * 0.65,
    padding: spacing * 3,
  },
  noticeText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 19 },
  permissionContent: {
    flexGrow: 1,
    paddingHorizontal: spacing * 5,
    paddingBottom: spacing * 6,
    gap: spacing * 4,
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing * 8,
  },
  permissionCard: {
    borderWidth: 1,
    borderRadius: radius,
    padding: spacing * 4,
    gap: spacing * 4,
  },
  permissionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing * 3 },
  textButton: { alignItems: 'center', padding: spacing * 3 },
  textButtonLabel: { fontFamily: fonts.medium, fontSize: 14 },
  dashboardContent: {
    paddingHorizontal: spacing * 5,
    paddingBottom: spacing * 6,
    gap: spacing * 4,
  },
  dashboardTop: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing * 1.5,
    borderRadius: 999,
    paddingHorizontal: spacing * 2.5,
    paddingVertical: spacing * 1.5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveLabel: { fontFamily: fonts.semibold, fontSize: 11 },
  welcomePanel: { padding: spacing * 5, gap: spacing * 2 },
  welcomeTitle: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 32 },
  statusCard: { borderWidth: 1, borderRadius: radius, padding: spacing * 4, gap: spacing * 3 },
  statusHeading: { flexDirection: 'row', alignItems: 'center' },
  statusTitle: { fontFamily: fonts.bold, fontSize: 20, marginTop: spacing },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCard: { borderWidth: 1, borderRadius: radius, padding: spacing * 4, gap: spacing * 3 },
  locationCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing * 3 },
  inlineAction: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing,
    paddingVertical: spacing,
  },
  inlineActionText: { fontFamily: fonts.semibold, fontSize: 13 },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing * 2,
    borderTopWidth: 1,
    paddingTop: spacing * 3,
  },
  logoutButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius * 0.72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing * 2,
  },
  logoutLabel: { fontFamily: fonts.semibold, fontSize: 14 },
});