import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/theme';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignUp = mode === 'signUp';

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          setError('Please enter a display name.');
          setSubmitting(false);
          return;
        }
        const { needsEmailConfirmation } = await signUp(email.trim(), password, displayName.trim());
        if (needsEmailConfirmation) {
          setInfo('Check your email to confirm your account, then sign in.');
          setMode('signIn');
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Shared Wallet</Text>
        <Text style={styles.subtitle}>
          {isSignUp ? 'Create an account to get started' : 'Sign in to continue'}
        </Text>

        <View style={styles.form}>
          {isSignUp && (
            <TextInput
              style={styles.input}
              placeholder="Display Name"
              placeholderTextColor={Colors.textSubtle}
              autoCapitalize="words"
              autoComplete="name"
              value={displayName}
              onChangeText={setDisplayName}
            />
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={Colors.textSubtle}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textSubtle}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'password'}
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}
          {info && <Text style={styles.infoText}>{info}</Text>}

          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.toggleButton}
            onPress={() => {
              setError(null);
              setMode(isSignUp ? 'signIn' : 'signUp');
            }}
          >
            <Text style={styles.toggleButtonText}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    color: Colors.text,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textMuted,
    fontFamily: 'system-ui',
    marginTop: 8,
    marginBottom: 32,
    textAlign: 'center',

  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'system-ui',
  },
  errorText: {
    color: Colors.danger,
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  infoText: {
    color: Colors.info,
    fontSize: 14,
    fontFamily: 'system-ui',
  },
  submitButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'system-ui',
  },
  toggleButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  toggleButtonText: {
    color: Colors.accent,
    fontSize: 14,
    fontFamily: 'system-ui',
  },
});
