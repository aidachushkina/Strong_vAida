import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { AppText, Button, Screen, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useRedeemInviteCode } from '@/api/coach';
import { colors, spacing } from '@/theme/theme';

export default function LinkTrainer() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const redeem = useRedeemInviteCode();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (code.trim().length < 4) return setError('Enter the full code your trainer shared');
    try {
      await redeem.mutateAsync(code.trim().toUpperCase());
      await refreshProfile();
      setDone(true);
      // Brief confirmation, then back home where the trainer now shows as linked.
      setTimeout(() => router.back(), 900);
    } catch (e: any) {
      setError(e.message ?? 'Could not redeem code');
    }
  };

  return (
    <Screen>
      <Spacer size={spacing.lg} />
      <AppText variant="title">Enter invite code</AppText>
      <AppText variant="muted">Your trainer generated a 6-character code for you.</AppText>
      <Spacer size={spacing.xl} />

      <TextField
        value={code}
        onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="ABC123"
        maxLength={6}
        style={{ fontSize: 24, letterSpacing: 6, textAlign: 'center' }}
      />

      {error ? (
        <AppText style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</AppText>
      ) : null}
      {done ? (
        <AppText style={{ color: colors.success, marginBottom: spacing.md }}>
          Linked! Taking you back…
        </AppText>
      ) : null}

      <Button title="Connect" onPress={onSubmit} loading={redeem.isPending} disabled={done} />
    </Screen>
  );
}
