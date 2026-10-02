import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@workspace/maximus-chauffeur-design-system/components/native/button';
import { Card } from '@workspace/maximus-chauffeur-design-system/components/native/card';
import { Input } from '@workspace/maximus-chauffeur-design-system/components/native/input';
import { Label } from '@workspace/maximus-chauffeur-design-system/components/native/label';
import { Typography } from '@workspace/maximus-chauffeur-design-system/components/native/typography';
import { useAuth } from '../contexts/AuthContext';
import { cardRadius, getPalette, space } from '../theme';

export function SignInScreen() {
  const { signIn } = useAuth();
  const scheme = 'dark';
  const colors = getPalette(scheme);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn({ email, password, companySlug });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message.replace(/^HTTP \d+ [^:]*:\s*/, '')
          : 'Connexion impossible. Vérifiez vos identifiants et réessayez.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
              <Typography
                colors={colors}
                weight="bold"
                style={[styles.brandMarkText, { color: colors.primaryForeground }]}
              >
                M
              </Typography>
            </View>
            <Typography colors={colors} size="xs" weight="bold" style={[styles.eyebrow, { color: colors.mutedForeground }]}>
              ESPACE CHAUFFEUR
            </Typography>
            <Typography colors={colors} size="2xl" weight="bold" style={[styles.title, { color: colors.foreground }]}>
              MAXIMUS
            </Typography>
            <Typography colors={colors} size="base" style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Connectez-vous avec votre compte employé pour accéder à vos courses.
            </Typography>

            <Card colors={colors} style={styles.form}>
              <Label colors={colors} style={[styles.label, { color: colors.foreground }]}>
                Adresse e-mail
              </Label>
              <Input
                colors={colors}
                value={email}
                onChangeText={setEmail}
                placeholder="nom@entreprise.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                accessibilityLabel="Adresse e-mail"
                returnKeyType="next"
                style={[styles.input, { backgroundColor: colors.background }]}
              />

              <Label colors={colors} style={[styles.label, { color: colors.foreground }]}>
                Mot de passe
              </Label>
              <Input
                colors={colors}
                value={password}
                onChangeText={setPassword}
                placeholder="Votre mot de passe"
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                secureTextEntry
                accessibilityLabel="Mot de passe"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                style={[styles.input, { backgroundColor: colors.background }]}
              />

              <Label colors={colors} style={[styles.label, { color: colors.foreground }]}>
                Code entreprise (facultatif)
              </Label>
              <Input
                colors={colors}
                value={companySlug}
                onChangeText={setCompanySlug}
                placeholder="ex. entreprise-dakar"
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Code entreprise facultatif"
                style={[styles.input, { backgroundColor: colors.background }]}
              />

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + '14' }]}>
                  <Typography colors={colors} tone="destructive" style={styles.errorText}>
                    {error}
                  </Typography>
                </View>
              ) : null}

              <Button
                colors={colors}
                accessibilityRole="button"
                accessibilityState={{ disabled: submitting || !email.trim() || !password }}
                disabled={submitting || !email.trim() || !password}
                onPress={() => void submit()}
                loading={submitting}
                style={styles.submitButton}
              >
                Se connecter
              </Button>
            </Card>

            <Typography colors={colors} size="xs" style={[styles.footnote, { color: colors.mutedForeground }]}>
              Accès réservé aux chauffeurs rattachés à une entreprise MAXIMUS avec le module Transport activé.
            </Typography>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboard: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: space.md },
  content: { width: '100%', maxWidth: 500, alignSelf: 'center', alignItems: 'center' },
  brandMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cardRadius,
    marginBottom: space.md,
  },
  brandMarkText: { fontSize: 30 },
  eyebrow: { letterSpacing: 1.6 },
  title: { lineHeight: 42, marginTop: space.xs },
  subtitle: { lineHeight: 22, textAlign: 'center', marginTop: space.sm, marginBottom: space.lg },
  form: {
    width: '100%',
    padding: space.md,
    gap: space.sm,
  },
  label: { marginTop: space.xs },
  input: {
    paddingHorizontal: space.sm + space.xs,
  },
  errorBox: { borderRadius: cardRadius / 2, padding: space.sm },
  errorText: { fontSize: 13, lineHeight: 19 },
  submitButton: { marginTop: space.sm },
  footnote: { maxWidth: 380, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: space.md },
});