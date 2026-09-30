import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Feather } from '@expo/vector-icons';
import {
  getGetLatestChauffeurReleaseQueryKey,
  useGetLatestChauffeurRelease,
} from '@workspace/api-client-react';
import { API_BASE_URL } from '../lib/api';
import { readMobileToken } from '../lib/auth-storage';
import { cardRadius, space, type getPalette } from '../theme';

type Palette = ReturnType<typeof getPalette>;

function ReleaseCheckButton({
  colors,
  isFetching,
  onPress,
}: {
  colors: Palette;
  isFetching: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Vérifier les mises à jour"
      accessibilityState={{ disabled: isFetching, busy: isFetching }}
      testID="release-check-button"
      disabled={isFetching}
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkButton,
        { opacity: pressed ? 0.72 : 1 },
        isFetching && styles.disabled,
      ]}
    >
      {isFetching ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Feather name="refresh-cw" size={14} color={colors.primary} />
      )}
      <Text style={[styles.checkText, { color: colors.primary }]}>
        {isFetching ? 'Vérification…' : 'Vérifier les mises à jour'}
      </Text>
    </Pressable>
  );
}

function statusFromError(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('status' in error)) return undefined;
  const value = (error as { status?: unknown }).status;
  return typeof value === 'number' ? value : undefined;
}

function releaseMessageFromStatus(status: number | undefined): string {
  if (status === 404) return 'Aucune version installable n’a encore été publiée.';
  if (status === 503) return 'Le téléchargement sera activé après la configuration du serveur.';
  if (status === 401) return 'Votre session chauffeur a expiré. Reconnectez-vous puis réessayez.';
  if (status !== undefined && status >= 500) {
    return 'Le service des versions est temporairement indisponible. Réessayez dans quelques instants.';
  }

  return 'La version disponible ne peut pas être vérifiée pour le moment.';
}

function isNewerVersion(candidate: string, installed: string): boolean {
  const parse = (version: string) => {
    const match = version.match(/^(?:chauffeur-v)?(\d+)\.(\d+)\.(\d+)$/);
    return match ? match.slice(1).map(Number) : null;
  };
  const latestParts = parse(candidate);
  const installedParts = parse(installed);
  if (!latestParts || !installedParts) return candidate !== installed;

  for (let index = 0; index < latestParts.length; index += 1) {
    if (latestParts[index] !== installedParts[index]) {
      return latestParts[index] > installedParts[index];
    }
  }
  return false;
}

export function ReleaseCard({ colors }: { colors: Palette }) {
  const [downloading, setDownloading] = useState(false);
  const releaseQuery = useGetLatestChauffeurRelease({
    query: {
      queryKey: getGetLatestChauffeurReleaseQueryKey(),
      retry: (failureCount, error) => {
        const status = statusFromError(error);
        const isTemporaryFailure =
          status === undefined || status === 429 || (status >= 500 && status !== 503);

        return failureCount < 2 && isTemporaryFailure;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 4000),
      refetchOnMount: 'always',
      staleTime: 5 * 60_000,
    },
  });
  const previousAppState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const returnedToForeground =
        previousAppState.current !== null &&
        previousAppState.current !== 'active' &&
        nextAppState === 'active';

      previousAppState.current = nextAppState;
      if (returnedToForeground) {
        void releaseQuery.refetch();
      }
    });

    return () => subscription.remove();
  }, [releaseQuery.refetch]);

  const downloadAndInstall = async () => {
    if (Platform.OS !== 'android') {
      Alert.alert('Android uniquement', 'L’installation du fichier APK est disponible sur Android.');
      return;
    }

    setDownloading(true);
    try {
      const token = await readMobileToken();
      if (!token || !FileSystem.cacheDirectory) {
        throw new Error('Votre session ou le stockage temporaire est indisponible.');
      }

      const localUri = `${FileSystem.cacheDirectory}maximus-chauffeur.apk`;
      await FileSystem.deleteAsync(localUri, { idempotent: true });
      const download = await FileSystem.downloadAsync(
        `${API_BASE_URL}/api/transport/mobile/releases/latest/download`,
        localUri,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (download.status !== 200) {
        throw new Error(`Le serveur a refusé le téléchargement (HTTP ${download.status}).`);
      }

      const file = await FileSystem.getInfoAsync(download.uri);
      if (!file.exists || !('size' in file) || file.size < 1) {
        throw new Error('Le fichier APK téléchargé est vide ou incomplet.');
      }

      const contentUri = await FileSystem.getContentUriAsync(download.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        type: 'application/vnd.android.package-archive',
        flags: 1,
      });
    } catch (error) {
      const applicationId = Constants.expoConfig?.android?.package;
      const message =
        error instanceof Error
          ? error.message
          : 'Le fichier n’a pas pu être téléchargé ou ouvert.';
      Alert.alert(
        'Installation non terminée',
        `${message}\n\nSi Android bloque l’installation, autorisez MAXIMUS Chauffeur à installer des applications inconnues dans les paramètres.`,
        [
          { text: 'Fermer', style: 'cancel' },
          ...(applicationId
            ? [{
                text: 'Paramètres',
                onPress: () => {
                  void IntentLauncher.startActivityAsync(
                    'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
                    { data: `package:${applicationId}` },
                  ).catch(() => undefined);
                },
              }]
            : []),
        ],
      );
    } finally {
      setDownloading(false);
    }
  };

  const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
  const updateAvailable = releaseQuery.data
    ? isNewerVersion(releaseQuery.data.version, currentVersion)
    : false;
  const httpStatus = statusFromError(releaseQuery.error);
  const releaseMessage = releaseMessageFromStatus(httpStatus);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heading}>
        <View style={[styles.iconBox, { backgroundColor: colors.muted }]}>
          <Feather name="download-cloud" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.cardForeground }]}>Application</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Version installée {currentVersion}
          </Text>
        </View>
      </View>

      {releaseQuery.isLoading ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>Vérification des mises à jour…</Text>
        </View>
      ) : releaseQuery.data ? (
        <>
          <View style={[styles.releaseInfo, { backgroundColor: colors.muted }]}>
            <Text style={[styles.statusText, { color: colors.foreground }]}>
              {updateAvailable
                ? `Version disponible : ${releaseQuery.data.version}`
                : `Votre application est à jour (${currentVersion}).`}
            </Text>
            {updateAvailable && releaseQuery.data.sizeBytes > 0 ? (
              <Text style={[styles.sizeText, { color: colors.mutedForeground }]}>
                {(releaseQuery.data.sizeBytes / (1024 * 1024)).toFixed(1)} Mo
              </Text>
            ) : null}
          </View>
          <ReleaseCheckButton
            colors={colors}
            isFetching={releaseQuery.isFetching}
            onPress={() => void releaseQuery.refetch()}
          />
          {Platform.OS === 'android' && updateAvailable ? (
            <Pressable
              accessibilityRole="button"
              disabled={downloading}
              onPress={() => void downloadAndInstall()}
              style={({ pressed }) => [
                styles.downloadButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.84 : 1 },
                downloading && styles.disabled,
              ]}
            >
              {downloading ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.downloadText, { color: colors.primaryForeground }]}>Télécharger et installer</Text>
              )}
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={styles.errorState}>
          <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{releaseMessage}</Text>
          <ReleaseCheckButton
            colors={colors}
            isFetching={releaseQuery.isFetching}
            onPress={() => void releaseQuery.refetch()}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: cardRadius, padding: space.md, gap: space.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconBox: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: cardRadius / 2 },
  title: { fontSize: 16, fontFamily: 'DMSans_700Bold' },
  subtitle: { fontSize: 12, marginTop: space.xs },
  releaseInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: cardRadius / 2, padding: space.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  errorState: { alignItems: 'flex-start', gap: space.xs },
  checkButton: { minHeight: 40, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: space.sm },
  checkText: { fontSize: 13, fontFamily: 'DMSans_700Bold' },
  statusText: { fontSize: 13, lineHeight: 19, fontFamily: 'DMSans_500Medium' },
  sizeText: { fontSize: 12, fontFamily: 'DMSans_500Medium' },
  downloadButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: cardRadius, paddingHorizontal: space.sm },
  downloadText: { fontSize: 14, fontFamily: 'DMSans_700Bold' },
  disabled: { opacity: 0.65 },
});