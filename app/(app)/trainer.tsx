import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Button, Card, Screen, Spacer, TextField } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import {
  RosterEntry,
  useCreateInviteCode,
  useLinkClientByEmail,
  useRoster,
} from '@/api/coach';
import { WorkoutWithClient, useTrainerWorkouts } from '@/api/workouts';
import { isToday, prettyDate } from '@/lib/format';
import { colors, radius, spacing } from '@/theme/theme';

export default function TrainerDashboard() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const roster = useRoster(profile?.id);
  const workouts = useTrainerWorkouts(profile?.id);
  const createCode = useCreateInviteCode();
  const linkByEmail = useLinkClientByEmail();

  const [latestCode, setLatestCode] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const onGenerate = async () => {
    try {
      setLatestCode(await createCode.mutateAsync());
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

  const allWorkouts = workouts.data ?? [];
  const todays = allWorkouts.filter((w) => isToday(w.scheduled_date) && w.status !== 'completed');
  const awaitingReview = allWorkouts.filter((w) => w.status === 'completed');

  return (
    <Screen>
      <Spacer size={spacing.md} />
      <AppText variant="title">Hi, {profile?.full_name || 'Coach'}</AppText>
      <AppText variant="muted">Manage your clients & programming</AppText>
      <Spacer size={spacing.lg} />

      <Button title="+ New workout" onPress={() => router.push('/(app)/program-builder')} />

      {/* Awaiting review */}
      <Spacer size={spacing.xl} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <AppText variant="heading">Awaiting review</AppText>
        {awaitingReview.length > 0 && (
          <View style={{ backgroundColor: colors.danger, borderRadius: radius.pill, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
            <AppText style={{ color: colors.onAccent, fontSize: 12, fontWeight: '700' }}>{awaitingReview.length}</AppText>
          </View>
        )}
      </View>
      <Spacer size={spacing.sm} />
      {awaitingReview.length === 0 ? (
        <Card><AppText variant="muted">No completed sessions to review.</AppText></Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {awaitingReview.map((w) => (
            <SessionRow key={w.id} workout={w} onPress={() => router.push(`/(app)/workout/${w.id}`)} />
          ))}
        </View>
      )}

      {/* Today's scheduled */}
      <Spacer size={spacing.xl} />
      <AppText variant="heading">Scheduled today</AppText>
      <Spacer size={spacing.sm} />
      {todays.length === 0 ? (
        <Card><AppText variant="muted">Nothing scheduled for today.</AppText></Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {todays.map((w) => (
            <SessionRow key={w.id} workout={w} onPress={() => router.push(`/(app)/workout/${w.id}`)} />
          ))}
        </View>
      )}

      {/* Roster */}
      <Spacer size={spacing.xl} />
      <AppText variant="heading">Your clients</AppText>
      <Spacer size={spacing.sm} />
      {active.length === 0 && pending.length === 0 ? (
        <Card><AppText variant="muted">No clients yet. Invite one below.</AppText></Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {active.map((e: RosterEntry) => (
            <Card key={e.link.id}>
              <AppText variant="body" style={{ fontWeight: '600' }}>{e.client?.full_name || 'Client'}</AppText>
              <AppText variant="caption">Active</AppText>
            </Card>
          ))}
          {pending.map((e: RosterEntry) => (
            <Card key={e.link.id} style={{ borderStyle: 'dashed' }}>
              <AppText variant="body" style={{ fontWeight: '600' }}>Invite {e.link.invite_code}</AppText>
              <AppText variant="caption" style={{ color: colors.warning }}>Pending — waiting for client to redeem</AppText>
            </Card>
          ))}
        </View>
      )}

      {/* Invite code */}
      <Spacer size={spacing.xl} />
      <Card>
        <AppText variant="heading">Invite a client</AppText>
        <AppText variant="muted" style={{ marginTop: 2 }}>Generate a code and share it.</AppText>
        <Spacer />
        {latestCode ? (
          <View style={{ backgroundColor: colors.accentMuted, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md }}>
            <AppText variant="caption">Share this code</AppText>
            <AppText style={{ fontSize: 32, fontWeight: '700', letterSpacing: 4, color: colors.accent }}>{latestCode}</AppText>
          </View>
        ) : null}
        <Button title={latestCode ? 'Generate another code' : 'Generate invite code'} onPress={onGenerate} loading={createCode.isPending} variant="secondary" />
      </Card>

      {/* Add by email */}
      <Spacer size={spacing.lg} />
      <Card>
        <AppText variant="heading">Add by email</AppText>
        <AppText variant="muted" style={{ marginTop: 2 }}>If your client already has an account.</AppText>
        <Spacer />
        <TextField value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="client@example.com" />
        <Button title="Add client" onPress={onAddByEmail} loading={linkByEmail.isPending} />
      </Card>

      <Spacer size={spacing.xxl} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

function SessionRow({ workout, onPress }: { workout: WorkoutWithClient; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontWeight: '600' }}>{workout.name}</AppText>
            <AppText variant="caption">
              {workout.client?.full_name || 'Client'} · {prettyDate(workout.scheduled_date)}
            </AppText>
          </View>
          <AppText style={{ color: colors.accent, fontWeight: '600' }}>View →</AppText>
        </View>
      </Card>
    </Pressable>
  );
}
