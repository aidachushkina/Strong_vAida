import React from 'react';
import { useRouter } from 'expo-router';
import { AppText, Button, Card, Screen, Spacer } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMyTrainer } from '@/api/coach';
import { colors, spacing } from '@/theme/theme';

export default function ClientHome() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const trainerQuery = useMyTrainer(profile?.id);

  const linked = !!trainerQuery.data;

  return (
    <Screen>
      <Spacer size={spacing.md} />
      <AppText variant="title">Hi, {profile?.full_name || 'there'}</AppText>
      <AppText variant="muted">Your training home</AppText>
      <Spacer size={spacing.xl} />

      {trainerQuery.isLoading ? (
        <AppText variant="muted">Loading…</AppText>
      ) : linked ? (
        <Card>
          <AppText variant="heading">Your trainer</AppText>
          <AppText variant="body" style={{ marginTop: spacing.xs, fontWeight: '600' }}>
            {trainerQuery.data?.trainer?.full_name || 'Your trainer'}
          </AppText>
          <AppText variant="caption" style={{ color: colors.success, marginTop: 2 }}>
            Connected
          </AppText>
        </Card>
      ) : (
        <Card>
          <AppText variant="heading">Connect with your trainer</AppText>
          <AppText variant="muted" style={{ marginTop: spacing.xs }}>
            Enter the invite code your trainer shared to link your accounts.
          </AppText>
          <Spacer />
          <Button title="Enter invite code" onPress={() => router.push('/(app)/link-trainer')} />
        </Card>
      )}

      <Spacer size={spacing.xl} />
      <Card>
        <AppText variant="heading">Today's workout</AppText>
        <AppText variant="muted" style={{ marginTop: spacing.xs }}>
          Coming in Phase 2 — your trainer will program workouts here and you'll log them.
        </AppText>
      </Card>

      <Spacer size={spacing.xxl} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
