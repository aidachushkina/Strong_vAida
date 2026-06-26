import React, { useState } from 'react';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { AppText, Button, Screen, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, spacing } from '@/theme/theme';

export default function SignIn() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
      // Root navigator handles the redirect once the session lands.
    } catch (e: any) {
      setError(e.message ?? 'Could not sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Spacer size={spacing.xxl} />
      <AppText variant="title">Welcome back</AppText>
      <AppText variant="muted">Sign in to Strong vAida</AppText>
      <Spacer size={spacing.xl} />

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        placeholder="you@example.com"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />

      {error ? (
        <AppText style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</AppText>
      ) : null}

      <Button title="Sign in" onPress={onSubmit} loading={loading} />
      <Spacer size={spacing.lg} />

      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <AppText variant="muted">New here? </AppText>
        <Link href="/(auth)/sign-up">
          <AppText style={{ color: colors.accent, fontWeight: '600' }}>Create an account</AppText>
        </Link>
      </View>
    </Screen>
  );
}
