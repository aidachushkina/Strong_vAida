import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, Button, Card, Screen, Spacer, TextField } from '@/components/ui';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import { useAuth } from '@/lib/auth';
import {
  WorkoutExerciseFull,
  useAddWorkoutExercise,
  useDeleteSet,
  useRemoveWorkoutExercise,
  useSetWorkoutStatus,
  useUpsertSet,
  useWorkoutDetail,
} from '@/api/workouts';
import {
  formatDistance,
  formatWeight,
  minutesToSeconds,
  parseInteger,
  parseNumber,
  prettyDate,
  secondsToMinutes,
} from '@/lib/format';
import { colors, radius, spacing } from '@/theme/theme';
import type { Exercise, SetRow } from '@/types/database';

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const detail = useWorkoutDetail(id);
  const setStatus = useSetWorkoutStatus();
  const addExercise = useAddWorkoutExercise();
  const [pickerOpen, setPickerOpen] = useState(false);

  const workout = detail.data;
  const isClient = profile?.role === 'client' && workout?.client_id === profile?.id;
  const isCompleted = workout?.status === 'completed';
  const editable = !!isClient && !isCompleted;

  // When the client opens a still-scheduled workout, mark it in progress once.
  useEffect(() => {
    if (workout && isClient && workout.status === 'scheduled') {
      setStatus.mutate({ workoutId: workout.id, status: 'in_progress' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout?.id]);

  if (detail.isLoading) {
    return (
      <Screen scroll={false}>
        <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.accent} />
      </Screen>
    );
  }
  if (!workout) {
    return (
      <Screen>
        <Spacer size={spacing.xl} />
        <AppText variant="muted">Workout not found.</AppText>
      </Screen>
    );
  }

  const onAddExercise = async (exercise: Exercise) => {
    setPickerOpen(false);
    await addExercise.mutateAsync({
      workoutId: workout.id,
      exerciseId: exercise.id,
      orderIndex: workout.workout_exercises.length,
    });
  };

  const onFinish = () => {
    Alert.alert('Finish workout?', 'This marks the session complete and sends it to your trainer.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          await setStatus.mutateAsync({ workoutId: workout.id, status: 'completed' });
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Spacer size={spacing.sm} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <AppText variant="title">{workout.name}</AppText>
          <AppText variant="muted">{prettyDate(workout.scheduled_date)}</AppText>
        </View>
        <StatusBadge status={workout.status} />
      </View>

      {!isClient && (
        <AppText variant="caption" style={{ marginTop: spacing.sm, color: colors.textMuted }}>
          Read-only review. Video playback & feedback arrive in Phase 3.
        </AppText>
      )}

      <Spacer size={spacing.lg} />

      {workout.workout_exercises.length === 0 ? (
        <AppText variant="muted">No exercises yet.</AppText>
      ) : (
        <View style={{ gap: spacing.lg }}>
          {workout.workout_exercises.map((we, i) => (
            <ExerciseBlock
              key={we.id}
              index={i}
              we={we}
              workoutId={workout.id}
              editable={editable}
            />
          ))}
        </View>
      )}

      {editable && (
        <>
          <Spacer size={spacing.lg} />
          <Button title="+ Add exercise" variant="secondary" onPress={() => setPickerOpen(true)} />
          <Spacer size={spacing.xl} />
          <Button title="Finish workout" onPress={onFinish} loading={setStatus.isPending} />
        </>
      )}

      <Spacer size={spacing.xxl} />

      <ExercisePickerModal visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={onAddExercise} />
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// Exercise block — dispatches to strength or cardio UI
// ---------------------------------------------------------------------------
function ExerciseBlock({
  index,
  we,
  workoutId,
  editable,
}: {
  index: number;
  we: WorkoutExerciseFull;
  workoutId: string;
  editable: boolean;
}) {
  const removeWe = useRemoveWorkoutExercise(workoutId);
  const isStrength = we.exercise.category === 'strength';

  const target = isStrength
    ? [
        we.target_sets ? `${we.target_sets} sets` : null,
        we.target_reps ? `${we.target_reps} reps` : null,
        we.target_weight != null ? `@ ${formatWeight(we.target_weight)}` : null,
        we.rest_sec ? `${we.rest_sec}s rest` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : [
        we.target_duration_sec ? secondsToMinutes(we.target_duration_sec) : null,
        we.target_distance != null ? formatDistance(we.target_distance) : null,
        we.target_pace ? `${we.target_pace} /km` : null,
      ]
        .filter(Boolean)
        .join(' · ');

  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="heading" style={{ flex: 1 }}>
          {index + 1}. {we.exercise.name}
        </AppText>
        {editable && (
          <Pressable onPress={() => removeWe.mutate(we.id)} hitSlop={8}>
            <AppText style={{ color: colors.danger, fontWeight: '600' }}>Remove</AppText>
          </Pressable>
        )}
      </View>
      {target ? <AppText variant="muted" style={{ marginTop: 2 }}>Target: {target}</AppText> : null}
      {we.trainer_note ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm }}>
          <AppText variant="caption" style={{ color: colors.textMuted }}>Coach note</AppText>
          <AppText variant="body">{we.trainer_note}</AppText>
        </View>
      ) : null}

      <Spacer size={spacing.md} />
      {isStrength ? (
        <StrengthLogger we={we} workoutId={workoutId} editable={editable} />
      ) : (
        <CardioLogger we={we} workoutId={workoutId} editable={editable} />
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Strength: one editable row per set
// ---------------------------------------------------------------------------
type StrengthDraft = {
  id?: string;
  set_number: number;
  reps: string;
  weight: string;
  rpe: string;
  completed: boolean;
};

function StrengthLogger({
  we,
  workoutId,
  editable,
}: {
  we: WorkoutExerciseFull;
  workoutId: string;
  editable: boolean;
}) {
  const upsert = useUpsertSet(workoutId);
  const deleteSet = useDeleteSet(workoutId);

  // Seed drafts from saved sets; pad up to target_sets so the client sees the
  // planned number of empty rows to fill in.
  const initial = useMemo<StrengthDraft[]>(() => {
    const fromDb: StrengthDraft[] = we.sets.map((s) => ({
      id: s.id,
      set_number: s.set_number,
      reps: s.actual_reps?.toString() ?? '',
      weight: s.actual_weight?.toString() ?? '',
      rpe: s.actual_rpe?.toString() ?? '',
      completed: s.completed,
    }));
    const targetCount = we.target_sets ?? 0;
    while (editable && fromDb.length < targetCount) {
      fromDb.push({ set_number: fromDb.length + 1, reps: '', weight: '', rpe: '', completed: false });
    }
    return fromDb.length ? fromDb : [{ set_number: 1, reps: '', weight: '', rpe: '', completed: false }];
  }, [we.sets, we.target_sets, editable]);

  const [drafts, setDrafts] = useState<StrengthDraft[]>(initial);

  // Re-sync if the underlying saved sets change (e.g. after a refetch).
  useEffect(() => setDrafts(initial), [initial]);

  const patch = (i: number, p: Partial<StrengthDraft>) =>
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...p } : d)));

  const save = async (i: number, overrides?: Partial<StrengthDraft>) => {
    const d = { ...drafts[i], ...overrides };
    const saved = await upsert.mutateAsync({
      id: d.id,
      workout_exercise_id: we.id,
      set_number: d.set_number,
      actual_reps: parseInteger(d.reps),
      actual_weight: parseNumber(d.weight),
      actual_rpe: parseNumber(d.rpe),
      completed: d.completed,
    });
    patch(i, { id: saved.id });
  };

  const addRow = () =>
    setDrafts((prev) => [
      ...prev,
      { set_number: prev.length + 1, reps: '', weight: '', rpe: '', completed: false },
    ]);

  const removeRow = async (i: number) => {
    const d = drafts[i];
    if (d.id) await deleteSet.mutateAsync(d.id);
    setDrafts((prev) => prev.filter((_, idx) => idx !== i));
  };

  if (!editable) {
    // Read-only summary for trainer / completed sessions.
    return (
      <View style={{ gap: spacing.xs }}>
        {we.sets.length === 0 ? (
          <AppText variant="muted">No sets logged.</AppText>
        ) : (
          we.sets.map((s: SetRow) => (
            <AppText key={s.id} variant="body">
              Set {s.set_number}: {s.actual_reps ?? '—'} reps × {formatWeight(s.actual_weight)}
              {s.actual_rpe != null ? `  ·  RPE ${s.actual_rpe}` : ''} {s.completed ? '✓' : ''}
            </AppText>
          ))
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', paddingHorizontal: spacing.xs, marginBottom: 2 }}>
        <AppText variant="caption" style={{ width: 28 }}>Set</AppText>
        <AppText variant="caption" style={{ flex: 1, textAlign: 'center' }}>Reps</AppText>
        <AppText variant="caption" style={{ flex: 1, textAlign: 'center' }}>kg</AppText>
        <AppText variant="caption" style={{ flex: 1, textAlign: 'center' }}>RPE</AppText>
        <AppText variant="caption" style={{ width: 40, textAlign: 'center' }}>Done</AppText>
      </View>

      {drafts.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
          <AppText variant="body" style={{ width: 28, fontWeight: '600' }}>{d.set_number}</AppText>
          <CellInput value={d.reps} onChangeText={(v) => patch(i, { reps: v })} onEndEditing={() => save(i)} />
          <CellInput value={d.weight} onChangeText={(v) => patch(i, { weight: v })} onEndEditing={() => save(i)} />
          <CellInput value={d.rpe} onChangeText={(v) => patch(i, { rpe: v })} onEndEditing={() => save(i)} />
          <Pressable
            onPress={() => { patch(i, { completed: !d.completed }); save(i, { completed: !d.completed }); }}
            style={{
              width: 40,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: radius.sm,
                borderWidth: 1.5,
                borderColor: d.completed ? colors.success : colors.border,
                backgroundColor: d.completed ? colors.success : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {d.completed ? <AppText style={{ color: colors.onAccent, fontWeight: '700' }}>✓</AppText> : null}
            </View>
          </Pressable>
        </View>
      ))}

      <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs }}>
        <Pressable onPress={addRow} hitSlop={8}>
          <AppText style={{ color: colors.accent, fontWeight: '600' }}>+ Add set</AppText>
        </Pressable>
        {drafts.length > 1 ? (
          <Pressable onPress={() => removeRow(drafts.length - 1)} hitSlop={8}>
            <AppText style={{ color: colors.textMuted, fontWeight: '600' }}>− Remove set</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Cardio: a single editable summary row
// ---------------------------------------------------------------------------
function CardioLogger({
  we,
  workoutId,
  editable,
}: {
  we: WorkoutExerciseFull;
  workoutId: string;
  editable: boolean;
}) {
  const upsert = useUpsertSet(workoutId);
  const existing = we.sets[0];

  const [durationMin, setDurationMin] = useState(
    existing?.actual_duration_sec != null ? String(Math.round(existing.actual_duration_sec / 60)) : ''
  );
  const [distance, setDistance] = useState(existing?.actual_distance?.toString() ?? '');
  const [pace, setPace] = useState(existing?.actual_pace ?? '');
  const [savedId, setSavedId] = useState<string | undefined>(existing?.id);
  const [done, setDone] = useState(existing?.completed ?? false);

  const save = async (completed = done) => {
    const saved = await upsert.mutateAsync({
      id: savedId,
      workout_exercise_id: we.id,
      set_number: 1,
      actual_duration_sec: minutesToSeconds(durationMin),
      actual_distance: parseNumber(distance),
      actual_pace: pace.trim() || null,
      completed,
    });
    setSavedId(saved.id);
  };

  if (!editable) {
    if (!existing) return <AppText variant="muted">Not logged.</AppText>;
    return (
      <AppText variant="body">
        {secondsToMinutes(existing.actual_duration_sec)} · {formatDistance(existing.actual_distance)}
        {existing.actual_pace ? ` · ${existing.actual_pace} /km` : ''} {existing.completed ? '✓' : ''}
      </AppText>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <LabeledCell label="Duration (min)" value={durationMin} onChangeText={setDurationMin} onEndEditing={() => save()} />
        <LabeledCell label="Distance (km)" value={distance} onChangeText={setDistance} onEndEditing={() => save()} />
        <LabeledCell label="Avg pace" value={pace} onChangeText={setPace} onEndEditing={() => save()} numeric={false} />
      </View>
      <Pressable
        onPress={() => { setDone(!done); save(!done); }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          marginTop: spacing.xs,
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: radius.sm,
            borderWidth: 1.5,
            borderColor: done ? colors.success : colors.border,
            backgroundColor: done ? colors.success : 'transparent',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {done ? <AppText style={{ color: colors.onAccent, fontWeight: '700' }}>✓</AppText> : null}
        </View>
        <AppText variant="body">Mark complete</AppText>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Small inputs
// ---------------------------------------------------------------------------
function CellInput({
  value,
  onChangeText,
  onEndEditing,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onEndEditing: () => void;
}) {
  return (
    <View style={{ flex: 1, paddingHorizontal: 2 }}>
      <TextField
        value={value}
        onChangeText={onChangeText}
        onEndEditing={onEndEditing}
        keyboardType="numeric"
        style={{ height: 44, paddingHorizontal: spacing.xs, textAlign: 'center' }}
      />
    </View>
  );
}

function LabeledCell({
  label,
  value,
  onChangeText,
  onEndEditing,
  numeric = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  onEndEditing: () => void;
  numeric?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="caption" style={{ marginBottom: 2 }}>{label}</AppText>
      <TextField
        value={value}
        onChangeText={onChangeText}
        onEndEditing={onEndEditing}
        keyboardType={numeric ? 'numeric' : 'default'}
        style={{ height: 44, paddingHorizontal: spacing.sm, textAlign: 'center' }}
      />
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    scheduled: { bg: colors.surfaceAlt, fg: colors.textMuted, label: 'Scheduled' },
    in_progress: { bg: colors.accentMuted, fg: colors.accent, label: 'In progress' },
    completed: { bg: '#DDF3E8', fg: colors.success, label: 'Completed' },
  };
  const s = map[status] ?? map.scheduled;
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs }}>
      <AppText style={{ color: s.fg, fontWeight: '600', fontSize: 12 }}>{s.label}</AppText>
    </View>
  );
}
