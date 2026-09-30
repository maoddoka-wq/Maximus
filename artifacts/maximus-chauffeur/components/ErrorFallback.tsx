import React, { useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import { useColors } from '@workspace/maximus-chauffeur-design-system/hooks/use-colors';
import { nativeTheme } from '@workspace/maximus-chauffeur-design-system/lib/native-theme';
import { Feather } from '@expo/vector-icons';
import { reloadAppAsync } from 'expo';

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error('Failed to restart app:', restartError);
      resetError();
    }
  };

  const formatErrorDetails = (): string => {
    let details = `Error: ${error.message}\n\n`;
    if (error.stack) {
      details += `Stack Trace:\n${error.stack}`;
    }
    return details;
  };

  const monoFont = Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {__DEV__ ? (
        <Button
          colors={colors}
          variant="ghost"
          size="icon"
          onPress={() => setIsModalVisible(true)}
          accessibilityLabel="View error details"
          accessibilityRole="button"
          style={[styles.topButton, { top: insets.top + nativeTheme.light.spacing.md, backgroundColor: colors.card }]}
        >
          <Feather name="alert-circle" size={20} color={colors.foreground} />
        </Button>
      ) : null}

      <View style={styles.content}>
        <Typography colors={colors} size="2xl" weight="bold" style={styles.title}>
          Something went wrong
        </Typography>

        <Typography colors={colors} tone="muted" style={styles.message}>
          Please reload the app to continue.
        </Typography>

        <Button
          colors={colors}
          size="lg"
          onPress={handleRestart}
          style={({ pressed }) => [
            styles.button,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          Try Again
        </Button>
      </View>

      {__DEV__ ? (
        <Modal
          visible={isModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContainer,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Typography colors={colors} size="lg" weight="semibold">
                  Error Details
                </Typography>
                <Button
                  colors={colors}
                  variant="ghost"
                  size="icon"
                  onPress={() => setIsModalVisible(false)}
                  accessibilityLabel="Close error details"
                  accessibilityRole="button"
                  style={styles.closeButton}
                >
                  <Feather name="x" size={24} color={colors.foreground} />
                </Button>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                contentContainerStyle={[
                  styles.modalScrollContent,
                  { paddingBottom: insets.bottom + 16 },
                ]}
                showsVerticalScrollIndicator
              >
                <View
                  style={[
                    styles.errorContainer,
                    { backgroundColor: colors.card },
                  ]}
                >
                  <Typography
                    colors={colors}
                    size="xs"
                    style={[styles.errorText, { fontFamily: monoFont }]}
                    selectable
                  >
                    {formatErrorDetails()}
                  </Typography>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: nativeTheme.light.spacing.md,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: nativeTheme.light.spacing.md,
    width: '100%',
    maxWidth: 600,
  },
  title: {
    textAlign: 'center',
    lineHeight: 40,
  },
  message: {
    textAlign: 'center',
    lineHeight: 24,
  },
  topButton: {
    position: 'absolute',
    right: nativeTheme.light.spacing.md,
    zIndex: 10,
  },
  button: {
    minWidth: 200,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: '100%',
    height: '90%',
    borderTopLeftRadius: nativeTheme.light.radius.lg,
    borderTopRightRadius: nativeTheme.light.radius.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nativeTheme.light.spacing.md,
    paddingTop: nativeTheme.light.spacing.md,
    paddingBottom: nativeTheme.light.spacing.sm,
    borderBottomWidth: 1,
  },
  closeButton: {
    borderRadius: nativeTheme.light.radius.sm,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: nativeTheme.light.spacing.md,
  },
  errorContainer: {
    width: '100%',
    borderRadius: nativeTheme.light.radius.base,
    overflow: 'hidden',
    padding: nativeTheme.light.spacing.md,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    width: '100%',
  },
});
