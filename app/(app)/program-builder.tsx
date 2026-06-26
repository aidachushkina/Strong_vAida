import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText, Button, Card, Screen, Spacer, TextField } from '@/components/ui';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import { useAuth } from '@/lib/auth';
import { useRoster, RosterEntry } from '@/api/coach';
import { BuilderTarget, useCreateWorkout } from '@/api/workouts';
import { addDaysISO, minutesToSeconds, parseInteger, parseNumber, prettyDate, todayISO } from '@/lib/format';
import { colors, radius, spacing } from '@/theme/theme';
import type { Exercise } from '@/types/database';

interface DraftItem {
  exercise: Exercise;
  // strength
  sets: string;
  reps: string;
  weight: string;
  rest: string;
  // cardio
  durationMin: string;
  distance: string;
  pace: string;
  note: string;
}

function emptyDraft(exercise: Exercise): DraftItem {
  return {
    exercise,
    sets: exercise.category === 'strength' ? '3' : '',
    reps: exercise.category === 'strength' ? '10' : '',
    weight: '',
    rest: exercise.category === 'strength' ? '90' : '',
    durationMin: '',
    distance: '',
    pace: '',
    note: '',
  };
}

export default function ProgramBuilder() {
  const router = useRouter();
  const { profile } = useAuth();
  const roster = useRoster(profile?.id);
  const createWorkout = useCreateWorkout();

  const activeClients = (roster.data ?? []).filter(
    (e: RosterEntry) => e.link.status === 'active' && e.client
  );

  const [clientId, setClientId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [date, setDate] = useState<string>(todayISO());
  const [items, setItems] = useState<DraftItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addExercise = (exercise: Exercise) => {
    setItems((prev) => [...prev, emptyDraft(exercise)]);
    setPickerOpen(false);
  };

  const updateItem = (index: number, patch: Partial<DraftItem>) => {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const onSave = async () => {
    if (!clientId) return Alert.alert('Pick a client', 'Choose who this workout is for.');
    if (!items.length) return Alert.alert('Add exercises', 'Add at least one exercise.');

    const builderItems: BuilderTarget[] = items.map((it) => {
      if (it.exercise.category === 'strength') {
        return {
          exercise_id: it.exercise.id,
          target_sets: parseInteger(it.sets),
          target_reps: parseInteger(it.reps),
          target_weight: parseNumber(it.weight),
          rest_sec: parseInteger(it.rest),
          trainer_note: it.note.trim() || null,
        };
      }
      return {
        exercise_id: it.exercise.id,
        target_duration_sec: minutesToSeconds(it.durationMin),
        target_distance: parseNumber(it.distance),
        target_pace: it.pace.trim() || null,
        trainer_note: it.note.trim() || null,
      };
    });

    try {
      await createWorkout.mutateAsync({
        trainer_id: profile!.id,
        client_id: clientId,
        name: name.trim() || 'Workout',
        scheduled_date: date,
        items: builderItems,
      });
      Alert.alert('Workout scheduled', 'Your client will see it on their home screen.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Could not save', e.message ?? 'Unknown error');
    }
  };

  return (
    <Screen>
      <Spacer size={spacing.sm} />
      <AppText variant="title">New workout</AppText>
      <AppText variant="muted">Program a session and assign it to a client.</AppText>
      <Spacer size={spacing.lg} />

      {/* Client picker */}
      <AppText variant="label">Client</AppText>
      <Spacer size={spacing.xs} />
      {activeClients.length === 0 ? (
        <AppText variant="muted">No active clients yet — link one from your dashboard first.</AppText>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {activeClients.map((e: RosterEntry) => (
            <Chip
              key={e.client!.id}
              label={e.client!.full_name || 'Client'}
              active={clientId === e.client!.id}
              onPress={() => setClientId(e.client!.id)}
            />
          ))}
        </View>
      )}

      <Spacer size={spacing.lg} />
      <TextField label="Workout name" value={name} onChangeText={setName} placeholder="e.g. Lower Body A" />

      {/* Date */}
      <AppText variant="label" style={{ marginBottom: spacing.xs }}>Scheduled date</AppText>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Chip label="Today" active={date === todayISO()} onPress={() => setDate(todayISO())} />
        <Chip label="Tomorrow" active={date === addDaysISO(todayISO(), 1)} onPress={() => setDate(addDaysISO(todayISO(), 1))} />
        <Chip label="+2 days" active={date === addDaysISO(todayISO(), 2)} onPress={() => setDate(addDaysISO(todayISO(), 2))} />
      </View>
      <TextField value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      <AppText variant="caption" style={{ marginTop: -spacing.md, marginBottom: spacing.lg }}>
        {prettyDate(date)}
      </AppText>

      {/* Exercises */}
      <AppText variant="heading">Exercises</AppText>
      <Spacer size={spacing.sm} />
      {items.length === 0 ? (
        <AppText variant="muted">None added yet.</AppText>
      ) : (
        <View style={{ gap: spacing.md }}>
          {items.map((it, index) => (
            <Card key={`${it.exercise.id}-${index}`}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="body" style={{ fontWeight: '700', flex: 1 }}>
                  {index + 1}. {it.exercise.name}
                </AppText>
                <Pressable onPress={() => removeItem(index)} hitSlop={8}>
                  <AppText style={{ color: colors.danger, fontWeight: '600' }}>Remove</AppText>
                </Pressable>
              </View>
              <AppText variant="caption" style={{ marginBottom: spacing.sm }}>
                {it.exercise.category === 'strength' ? 'Strength' : 'Cardio'}
              </AppText>

              {it.exercise.category === 'strength' ? (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <MiniField label="Sets" value={it.sets} onChange={(v) => updateItem(index, { sets: v })} />
                  <MiniField label="Reps" value={it.reps} onChange={(v) => updateItem(index, { reps: v })} />
                  <MiniField label="Weight (kg)" value={it.weight} onChange={(v) => updateItem(index, { weight: v })} />
                  <MiniField label="Rest (s)" value={it.rest} onChange={(v) => updateItem(index, { rest: v })} />
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <MiniField label="Duration (min)" value={it.durationMin} onChange={(v) => updateItem(index, { durationMin: v })} />
                  <MiniField label="Distance (km)" value={it.distance} onChange={(v) => updateItem(index, { distance: v })} />
                  <MiniField label="Pace (min/km)" value={it.pace} onChange={(v) => updateItem(index, { pace: v })} numeric={false} />
                </View>
              )}

              <Spacer size={spacing.sm} />
              <TextField
                value={it.note}
                onChangeText={(v) => updateItem(index, { note: v })}
                placeholder="Note for your client (optional)"
              />
            </Card>
          ))}
        </View>
      )}

      <Spacer size={spacing.md} />
      <Button title="+ Add exercise" variant="secondary" onPress={() => setPickerOpen(true)} />

      <Spacer size={spacing.xl} />
      <Button title="Schedule workout" onPress={onSave} loading={createWorkout.isPending} />
      <Spacer size={spacing.xl} />

      <ExercisePickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addExercise}
      />
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.accent : colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
      }}
    >
      <AppText style={{ color: active ? colors.onAccent : colors.text, fontWeight: '600' }}>{label}</AppText>
    </Pressable>
  );
}

function MiniField({
  label,
  value,
  onChange,
  numeric = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <AppText variant="caption" style={{ marginBottom: 2 }}>{label}</AppText>
      <TextField
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? 'numeric' : 'default'}
        style={{ height: 44, paddingHorizontal: spacing.sm, textAlign: 'center' }}
      />
    </View>
  );
}
