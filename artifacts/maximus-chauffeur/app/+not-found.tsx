import { Link, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useColors } from '@workspace/maximus-chauffeur-design-system/hooks/use-colors';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';

export default function NotFoundScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Typography colors={colors} size="xl" weight="bold" style={styles.title}>
          This screen doesn&apos;t exist.
        </Typography>

        <Link href="/" style={styles.link}>
          <Typography colors={colors} tone="primary" style={styles.linkText}>
            Go to home screen!
          </Typography>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {},
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {},
});
