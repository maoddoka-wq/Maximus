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
import { DriverTripsPanel } from '@/components/DriverTripsPanel';
import { DriverAppUpdatePrompt } from '@/components/DriverAppUpdatePrompt';
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
            Gérez votre espace chauffeur.
          </Text>
          <Text style={[styles.bodyText, { color: theme.mutedForeground }]}>
            Connectez-vous avec le compte employé associé au module Transport.
          </Text>
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

          <FieldLabel label="Code de connexion entreprise" />
          <TextInput
            accessibilityLabel="Code de connexion entreprise"
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
          <Text style={[styles.helperText, { color: theme.mutedForeground }]}>
            Si votre entreprise utilise un code dédié, il sélectionne son espace. Sinon, laissez ce champ vide.
          </Text>

          {error ? <InlineNotice message={error} onDismiss={clearError} /> : null}
          {Platform.OS === 'web' ? (
            <InlineNotice message="Aperçu web uniquement. La connexion chauffeur sécurisée nécessite l’application native iOS ou Android." />
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

function DriverDashboard() {
  const theme = useColors();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'courses' | 'history' | 'account'>('courses');
  const {
    driver,
    isRefreshingSession,
    error,
    isChangingAvailability,
    isSigningOut,
    changeAvailability,
    signOut,
    refreshSession,
    clearError,
  } = useDriverSession();

  const statusLabel =
    driver?.availability === 'AVAILABLE'
      ? 'Disponible'
      : driver?.availability === 'ON_TRIP'
        ? 'En course'
        : 'En pause';
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
        </View>

        <View style={[styles.welcomePanel, { backgroundColor: theme.sidebar, borderRadius: radius }]}>
          <Text style={[styles.eyebrow, { color: theme.sidebarPrimary }]}>VOTRE ESPACE</Text>
          <Text style={[styles.welcomeTitle, { color: theme.sidebarForeground }]}>
            Bonjour{driver?.name ? `, ${driver.name}` : ''}
          </Text>
          <Text style={[styles.cardBody, { color: theme.sidebarForeground, opacity: 0.78 }]}>
            Consultez les courses affectées, acceptez une demande libre et retrouvez votre
            historique. Cette application n’utilise pas le GPS.
          </Text>
        </View>

        <View style={[styles.dashboardTabs, { backgroundColor: theme.muted }]}>
          {([
            { id: 'courses', label: 'Courses', icon: 'car-outline' },
            { id: 'history', label: 'Historique', icon: 'time-outline' },
            { id: 'account', label: 'Compte', icon: 'person-outline' },
          ] as const).map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setActiveTab(tab.id)}
                style={({ pressed }) => [
                  styles.dashboardTab,
                  {
                    backgroundColor: selected ? theme.primary : theme.card,
                    borderColor: selected ? theme.primary : theme.border,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={selected ? theme.primaryForeground : theme.mutedForeground}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.dashboardTabText,
                    { color: selected ? theme.primaryForeground : theme.mutedForeground },
                  ]}
                >
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === 'courses' || activeTab === 'history' ? (
          <DriverTripsPanel view={activeTab} />
        ) : (
          <>
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
                  ? 'Une offre ou une course vous est affectée. Acceptez-la, refusez-la ou gérez son avancement dans Courses.'
                  : driver?.availability === 'AVAILABLE'
                    ? 'Le GPS n’est pas utilisé ici. La mise en pause automatique évite de conserver une disponibilité sans position récente.'
                    : 'La disponibilité GPS reste désactivée, mais vous pouvez accepter une demande libre depuis Courses si un véhicule est rattaché à votre profil.'}
              </Text>
              {driver?.availability === 'AVAILABLE' ? (
                <PrimaryButton
                  title="Me mettre en pause"
                  onPress={() => void changeAvailability('PAUSED')}
                  loading={isChangingAvailability}
                  icon="pause"
                />
              ) : null}
            </View>

            <InlineNotice message="Cette version ne demande pas l’accès au GPS et n’envoie aucune position. La disponibilité automatique ne peut pas être activée ici." />

            {error ? <InlineNotice message={error} onDismiss={clearError} /> : null}

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
                  <Text style={[styles.logoutLabel, { color: theme.mutedForeground }]}>
                    Se déconnecter
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
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
  const { isHydrated, accessToken, isLoadingSession, driver } = useDriverSession();

  return (
    <>
      <DriverAppUpdatePrompt />
      {!API_ORIGIN ? (
        <LoginScreen />
      ) : !isHydrated ? (
        <LoadingScreen />
      ) : !accessToken ? (
        <LoginScreen />
      ) : isLoadingSession && !driver ? (
        <LoadingScreen />
      ) : !driver ? (
        <SessionRecoveryScreen />
      ) : (
        <DriverDashboard />
      )}
    </>
  );
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
  welcomePanel: { padding: spacing * 5, gap: spacing * 2 },
  welcomeTitle: { fontFamily: fonts.bold, fontSize: 25, lineHeight: 32 },
  dashboardTabs: {
    flexDirection: 'row',
    gap: spacing,
    padding: spacing,
    borderRadius: radius,
  },
  dashboardTab: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius * 0.72,
    paddingHorizontal: spacing,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing,
  },
  dashboardTabText: { fontFamily: fonts.semibold, fontSize: 11 },
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