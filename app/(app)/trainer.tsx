import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { AppText, Button, Card, Screen, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  RosterEntry,
  useCreateInviteCode,
  useLinkClientByEmail,
  useRoster,
} from '@/api/coach';
import { colors, radius, spacing } from '@/theme/theme';

export default function TrainerDashboard() {
  const { profile, signOut } = useAuth();
  const roster = useRoster(profile?.id);
  const createCode = useCreateInviteCode();
  const linkByEmail = useLinkClientByEmail();

  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const onGenerate = async () => {
    try {
      const code = await createCode.mutateAsync();
      setLatestCode(code);
    } catch (e: any) {
      Alert.alert('Could not create code', e.message ?? 'Unknown error');
    }
  };

  const onAddByEmail = async () => {
    if (!email.trim()) return;
    try {
      await linkByEmail.mutateAsync(email.trim());
      setEmail('');
      Alert.alert('Client added', 'They now appear in your roster.');
    } catch (e: any) {
      Alert.alert('Could not add client', e.message ?? 'Unknown error');
    }
  };

  const entries = roster.data ?? [];
  const active = entries.filter((e: RosterEntry) => e.link.status === 'active');
  const pending = entries.filter((e: RosterEntry) => e.link.status === 'pending');

  return (
    <Screen>
      <Spacer size={spacing.md} />
      <AppText variant="title">Hi, {profile?.full_name || 'Coach'}</AppText>
      <AppText variant="muted">Manage your clients</AppText>
      <Spacer size={spacing.xl} />

      {/* Invite code */}
      <Card>
        <AppText variant="heading">Invite a client</AppText>
        <AppText variant="muted" style={{ marginTop: 2 }}>
          Generate a code and share it. Your client enters it to link to you.
        </AppText>
        <Spacer />
        {latestCode ? (
          <View
            style={{
              backgroundColor: colors.accentMuted,
              borderRadius: radius.md,
              paddingVertical: spacing.lg,
              alignItems: 'center',
              marginBottom: spacing.md,
            }}
          >
            <AppText variant="caption">Share this code</AppText>
            <AppText style={{ fontSize: 32, fontWeight: '700', letterSpacing: 4, color: colors.accent }}>
              {latestCode}
            </AppText>
          </View>
        ) : null}
        <Button
          title={latestCode ? 'Generate another code' : 'Generate invite code'}
          onPress={onGenerate}
          loading={createCode.isPending}
          variant="secondary"
        />
      </Card>

      <Spacer size={spacing.lg} />

      {/* Add by email */}
      <Card>
        <AppText variant="heading">Add by email</AppText>
        <AppText variant="muted" style={{ marginTop: 2 }}>
          If your client already has an account, link them directly.
        </AppText>
        <Spacer />
        <TextField
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="client@example.com"
        />
        <Button title="Add client" onPress={onAddByEmail} loading={linkByEmail.isPending} />
      </Card>

      <Spacer size={spacing.xl} />

      {/* Roster */}
      <AppText variant="heading">Your clients</AppText>
      <Spacer size={spacing.sm} />
      {roster.isLoading ? (
        <AppText variant="muted">Loading…</AppText>
      ) : active.length === 0 && pending.length === 0 ? (
        <Card>
          <AppText variant="muted">
            No clients yet. Generate an invite code or add a client by email above.
          </AppText>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {active.map((e: RosterEntry) => (
            <Card key={e.link.id}>
              <AppText variant="body" style={{ fontWeight: '600' }}>
                {e.client?.full_name || 'Client'}
              </AppText>
              <AppText variant="caption">Active</AppText>
            </Card>
          ))}
          {pending.map((e: RosterEntry) => (
            <Card key={e.link.id} style={{ borderStyle: 'dashed' }}>
              <AppText variant="body" style={{ fontWeight: '600' }}>
                Invite {e.link.invite_code}
              </AppText>
              <AppText variant="caption" style={{ color: colors.warning }}>
                Pending — waiting for client to redeem
              </AppText>
            </Card>
          ))}
        </View>
      )}

      <Spacer size={spacing.xxl} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
