import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  View,
} from 'react-native';
import { AppText, Button, Spacer, TextField } from '@/components/ui';
import { useExercises, useCreateCustomExercise } from '@/api/exercises';
import { useAuth } from '@/lib/auth';
import { colors, radius, spacing } from '@/theme/theme';
import type { Exercise, ExerciseCategory } from '@/types/database';

/**
 * Bottom-sheet style modal for picking an exercise from the catalog, with a
 * search box, a strength/cardio filter, and an inline "create custom" form.
 * Calls onSelect(exercise) and closes.
 */
export function ExercisePickerModal({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
}) {
  const { profile } = useAuth();
  const { data: exercises, isLoading } = useExercises();
  const createCustom = useCreateCustomExercise(profile?.id);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | ExerciseCategory>('all');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<ExerciseCategory>('strength');

  const filtered = useMemo(() => {
    const list = exercises ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((e) => {
      const matchesFilter = filter === 'all' || e.category === filter;
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        (e.muscle_group_or_modality ?? '').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [exercises, search, filter]);

  const reset = () => {
    setSearch('');
    setCreating(false);
    setNewName('');
  };

  const onCreate = async () => {
    if (!newName.trim()) return;
    const created = await createCustom.mutateAsync({
      name: newName.trim(),
      category: newCategory,
    });
    reset();
    onSelect(created);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xl }}>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="heading">Add exercise</AppText>
            <Pressable onPress={() => { reset(); onClose(); }}>
              <AppText style={{ color: colors.accent, fontWeight: '600' }}>Close</AppText>
            </Pressable>
          </View>
          <Spacer />

          {creating ? (
            <View>
              <TextField label="Exercise name" value={newName} onChangeText={setNewName} placeholder="e.g. Hack Squat" />
              <AppText variant="label" style={{ marginBottom: spacing.xs }}>Category</AppText>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg }}>
                {(['strength', 'cardio'] as ExerciseCategory[]).map((c) => (
                  <FilterChip key={c} label={c} active={newCategory === c} onPress={() => setNewCategory(c)} />
                ))}
              </View>
              <Button title="Create & add" onPress={onCreate} loading={createCustom.isPending} />
              <Spacer size={spacing.sm} />
              <Button title="Cancel" variant="ghost" onPress={() => setCreating(false)} />
            </View>
          ) : (
            <>
              <TextField value={search} onChangeText={setSearch} placeholder="Search exercises…" autoCorrect={false} />
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
                <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
                <FilterChip label="Strength" active={filter === 'strength'} onPress={() => setFilter('strength')} />
                <FilterChip label="Cardio" active={filter === 'cardio'} onPress={() => setFilter('cardio')} />
              </View>
            </>
          )}
        </View>

        {!creating && (
          <>
            {isLoading ? (
              <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.accent} />
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(e) => e.id}
                contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => { reset(); onSelect(item); }}
                    style={{
                      paddingVertical: spacing.md,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                  >
                    <AppText variant="body" style={{ fontWeight: '600' }}>{item.name}</AppText>
                    <AppText variant="caption">
                      {item.category === 'strength' ? 'Strength' : 'Cardio'}
                      {item.muscle_group_or_modality ? ` · ${item.muscle_group_or_modality}` : ''}
                      {item.is_custom ? ' · Custom' : ''}
                    </AppText>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <AppText variant="muted" style={{ marginTop: spacing.lg }}>
                    No matches.
                  </AppText>
                }
                ListFooterComponent={
                  <View style={{ marginTop: spacing.lg }}>
                    <Button title="+ Create custom exercise" variant="secondary" onPress={() => setCreating(true)} />
                  </View>
                }
              />
            )}
          </>
        )}
      </View>
    </Modal>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
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
      <AppText style={{ color: active ? colors.onAccent : colors.textMuted, fontWeight: '600', textTransform: 'capitalize' }}>
        {label}
      </AppText>
    </Pressable>
  );
}
