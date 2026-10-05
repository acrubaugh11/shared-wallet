import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function ResetPasswordScreen() {
  const { setNewPassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      await setNewPassword(password);
      router.replace('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Set a new password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account.</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="New password"
            placeholderTextColor={Colors.textSubtle}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm new password"
            placeholderTextColor={Colors.textSubtle}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            value={confirm}
            onChangeText={setConfirm}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>{submitting ? 'Saving...' : 'Save Password'}</Text>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
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
});
