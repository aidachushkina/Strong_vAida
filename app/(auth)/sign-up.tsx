import React, { useState } from 'react';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { AppText, Button, Screen, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/theme/theme';
import type { Role } from '@/types/database';

function RoleCard({
  role,
  title,
  subtitle,
  selected,
  onPress,
}: {
  role: Role;
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: (r: Role) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(role)}
      style={{
        flex: 1,
        borderWidth: 1.5,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentMuted : colors.surface,
        borderRadius: radius.md,
        padding: spacing.lg,
      }}
    >
      <AppText style={{ fontWeight: '700', color: selected ? colors.accent : colors.text }}>
        {title}
      </AppText>
      <AppText variant="caption" style={{ marginTop: 2 }}>{subtitle}</AppText>
    </Pressable>
  );
}

export default function SignUp() {
  const { signUp } = useAuth();
  const [role, setRole] = useState<Role>('client');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    setNotice(null);
    if (!fullName.trim()) return setError('Please enter your name');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      await signUp({ email: email.trim(), password, fullName: fullName.trim(), role });
      // If email confirmation is enabled in Supabase, no session is returned yet.
      setNotice(
        'Account created. If sign-in does not happen automatically, confirm your ' +
          'email (or disable email confirmation in Supabase for testing), then sign in.'
      );
    } catch (e: any) {
      setError(e.message ?? 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Spacer size={spacing.xl} />
      <AppText variant="title">Create account</AppText>
      <AppText variant="muted">Choose how you'll use Strong vAida</AppText>
      <Spacer size={spacing.lg} />

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <RoleCard
          role="client"
          title="I'm a client"
          subtitle="Log workouts from my trainer"
          selected={role === 'client'}
          onPress={setRole}
        />
        <RoleCard
          role="trainer"
          title="I'm a trainer"
          subtitle="Program & review workouts"
          selected={role === 'trainer'}
          onPress={setRole}
        />
      </View>

      <Spacer size={spacing.xl} />

      <TextField label="Full name" value={fullName} onChangeText={setFullName} placeholder="Alex Smith" />
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
        placeholder="At least 6 characters"
      />

      {error ? (
        <AppText style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</AppText>
      ) : null}
      {notice ? (
        <AppText style={{ color: colors.success, marginBottom: spacing.md }}>{notice}</AppText>
      ) : null}

      <Button title="Create account" onPress={onSubmit} loading={loading} />
      <Spacer size={spacing.lg} />

      <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
        <AppText variant="muted">Already have an account? </AppText>
        <Link href="/(auth)/sign-in">
          <AppText style={{ color: colors.accent, fontWeight: '600' }}>Sign in</AppText>
        </Link>
      </View>
    </Screen>
  );
}
