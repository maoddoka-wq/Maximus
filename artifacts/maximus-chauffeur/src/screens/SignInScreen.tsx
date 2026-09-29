import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { cardRadius, getPalette, space } from '../theme';

export function SignInScreen() {
  const { signIn } = useAuth();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
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
              <Text style={[styles.brandMarkText, { color: colors.primaryForeground }]}>M</Text>
            </View>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ESPACE CHAUFFEUR</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>MAXIMUS</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Connectez-vous avec votre compte employé pour accéder à vos courses.
            </Text>

            <View
              style={[
                styles.form,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.label, { color: colors.foreground }]}>Adresse e-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="nom@entreprise.com"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                accessibilityLabel="Adresse e-mail"
                returnKeyType="next"
                style={[
                  styles.input,
                  { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Mot de passe</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Votre mot de passe"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                secureTextEntry
                accessibilityLabel="Mot de passe"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                style={[
                  styles.input,
                  { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input },
                ]}
              />

              <Text style={[styles.label, { color: colors.foreground }]}>Code entreprise (facultatif)</Text>
              <TextInput
                value={companySlug}
                onChangeText={setCompanySlug}
                placeholder="ex. entreprise-dakar"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Code entreprise facultatif"
                style={[
                  styles.input,
                  { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.input },
                ]}
              />

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + '14' }]}>
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: submitting || !email.trim() || !password }}
                disabled={submitting || !email.trim() || !password}
                onPress={() => void submit()}
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.84 : 1 },
                  (submitting || !email.trim() || !password) && styles.disabledButton,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.primaryForeground} />
                ) : (
                  <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Se connecter</Text>
                )}
              </Pressable>
            </View>

            <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
              Accès réservé aux chauffeurs rattachés à une entreprise MAXIMUS avec le module Transport activé.
            </Text>
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
  brandMarkText: { fontSize: 30, fontFamily: 'DMSans_700Bold' },
  eyebrow: { fontSize: 12, letterSpacing: 1.6, fontFamily: 'DMSans_700Bold' },
  title: { fontSize: 34, lineHeight: 42, fontFamily: 'DMSans_700Bold', marginTop: space.xs },
  subtitle: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: space.sm, marginBottom: space.lg },
  form: {
    width: '100%',
    borderWidth: 1,
    borderRadius: cardRadius,
    padding: space.md,
    gap: space.sm,
  },
  label: { fontSize: 13, fontFamily: 'DMSans_600SemiBold', marginTop: space.xs },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: cardRadius,
    paddingHorizontal: space.sm + space.xs,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
  },
  errorBox: { borderRadius: cardRadius / 2, padding: space.sm },
  errorText: { fontSize: 13, lineHeight: 19, fontFamily: 'DMSans_500Medium' },
  submitButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cardRadius,
    marginTop: space.sm,
  },
  submitText: { fontSize: 16, fontFamily: 'DMSans_700Bold' },
  disabledButton: { opacity: 0.48 },
  footnote: { maxWidth: 380, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: space.md },
});