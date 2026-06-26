import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Button, Card, Screen, Spacer } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMyTrainer } from '@/api/coach';
import { useClientWorkouts, useCreateAdHocWorkout } from '@/api/workouts';
import { isToday, prettyDate, todayISO } from '@/lib/format';
import { colors, radius, spacing } from '@/theme/theme';
import type { Workout } from '@/types/database';

export default function ClientHome() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const trainerQuery = useMyTrainer(profile?.id);
  const workoutsQuery = useClientWorkouts(profile?.id);
  const createAdHoc = useCreateAdHocWorkout();

  const linked = !!trainerQuery.data;
  const workouts = workoutsQuery.data ?? [];

  const today = workouts.filter((w) => isToday(w.scheduled_date) && w.status !== 'completed');
  const upcoming = workouts.filter(
    (w) => w.scheduled_date && w.scheduled_date > todayISO() && w.status !== 'completed'
  );
  const recent = workouts.filter((w) => w.status === 'completed').slice(0, 5);

  const startAdHoc = async () => {
    const w = await createAdHoc.mutateAsync(profile!.id);
    router.push(`/(app)/workout/${w.id}`);
  };

  return (
    <Screen>
      <Spacer size={spacing.md} />
      <AppText variant="title">Hi, {profile?.full_name || 'there'}</AppText>
      <AppText variant="muted">Your training home</AppText>
      <Spacer size={spacing.lg} />

      {/* Trainer link state */}
      {trainerQuery.isLoading ? null : linked ? (
        <AppText variant="muted" style={{ marginBottom: spacing.md }}>
          Trainer: <AppText style={{ fontWeight: '600', color: colors.text }}>
            {trainerQuery.data?.trainer?.full_name || 'Connected'}
          </AppText>
        </AppText>
      ) : (
        <Card style={{ marginBottom: spacing.md }}>
          <AppText variant="heading">Connect with your trainer</AppText>
          <AppText variant="muted" style={{ marginTop: spacing.xs }}>
            Enter the invite code your trainer shared to get programmed workouts.
          </AppText>
          <Spacer />
          <Button title="Enter invite code" onPress={() => router.push('/(app)/link-trainer')} />
        </Card>
      )}

      {/* Today */}
      <AppText variant="heading">Today</AppText>
      <Spacer size={spacing.sm} />
      {workoutsQuery.isLoading ? (
        <ActivityIndicator color={colors.accent} />
      ) : today.length === 0 ? (
        <Card>
          <AppText variant="muted">No workout scheduled for today.</AppText>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {today.map((w) => (
            <WorkoutRow key={w.id} workout={w} onPress={() => router.push(`/(app)/workout/${w.id}`)} />
          ))}
        </View>
      )}

      <Spacer size={spacing.md} />
      <Button title="Start an empty workout" variant="secondary" onPress={startAdHoc} loading={createAdHoc.isPending} />

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <>
          <Spacer size={spacing.xl} />
          <AppText variant="heading">Upcoming</AppText>
          <Spacer size={spacing.sm} />
          <View style={{ gap: spacing.sm }}>
            {upcoming.map((w) => (
              <WorkoutRow key={w.id} workout={w} onPress={() => router.push(`/(app)/workout/${w.id}`)} />
            ))}
          </View>
        </>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <>
          <Spacer size={spacing.xl} />
          <AppText variant="heading">Recent sessions</AppText>
          <Spacer size={spacing.sm} />
          <View style={{ gap: spacing.sm }}>
            {recent.map((w) => (
              <WorkoutRow key={w.id} workout={w} onPress={() => router.push(`/(app)/workout/${w.id}`)} />
            ))}
          </View>
        </>
      )}

      <Spacer size={spacing.xxl} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}

function WorkoutRow({ workout, onPress }: { workout: Workout; onPress: () => void }) {
  const statusColor =
    workout.status === 'completed'
      ? colors.success
      : workout.status === 'in_progress'
      ? colors.accent
      : colors.textMuted;
  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <AppText variant="body" style={{ fontWeight: '600' }}>{workout.name}</AppText>
            <AppText variant="caption">{prettyDate(workout.scheduled_date)}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: statusColor }} />
            <AppText variant="caption" style={{ color: statusColor, textTransform: 'capitalize' }}>
              {workout.status.replace('_', ' ')}
            </AppText>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
