import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { todayISO } from '@/lib/format';
import type {
  Exercise,
  Profile,
  SetRow,
  Workout,
  WorkoutExercise,
} from '@/types/database';

// --- composed shapes ------------------------------------------------------- //
export type WorkoutExerciseFull = WorkoutExercise & {
  exercise: Exercise;
  sets: SetRow[];
};

export type WorkoutDetail = Workout & {
  workout_exercises: WorkoutExerciseFull[];
};

export type WorkoutWithClient = Workout & { client: Profile | null };

// --- builder payload ------------------------------------------------------- //
export interface BuilderTarget {
  exercise_id: string;
  target_sets?: number | null;
  target_reps?: number | null;
  target_weight?: number | null;
  target_duration_sec?: number | null;
  target_distance?: number | null;
  target_pace?: string | null;
  rest_sec?: number | null;
  trainer_note?: string | null;
}

export interface CreateWorkoutInput {
  trainer_id: string;
  client_id: string;
  name: string;
  scheduled_date: string;
  items: BuilderTarget[];
}

// ========================================================================== //
// Queries
// ========================================================================== //

/** All of a client's workouts (newest scheduled first). */
export function useClientWorkouts(clientId: string | undefined) {
  return useQuery<Workout[]>({
    queryKey: ['workouts', 'client', clientId],
    enabled: !!clientId,
    queryFn: async (): Promise<Workout[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientId!)
        .order('scheduled_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Workout[];
    },
  });
}

/** All workouts a trainer programmed, with the client's profile attached. */
export function useTrainerWorkouts(trainerId: string | undefined) {
  return useQuery<WorkoutWithClient[]>({
    queryKey: ['workouts', 'trainer', trainerId],
    enabled: !!trainerId,
    queryFn: async (): Promise<WorkoutWithClient[]> => {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('trainer_id', trainerId!)
        .order('scheduled_date', { ascending: false, nullsFirst: false });
      if (error) throw error;
      const workouts = (data ?? []) as Workout[];

      const clientIds = [...new Set(workouts.map((w) => w.client_id))];
      let byId = new Map<string, Profile>();
      if (clientIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientIds);
        byId = new Map((profiles ?? []).map((p) => [p.id, p]));
      }
      return workouts.map((w) => ({ ...w, client: byId.get(w.client_id) ?? null }));
    },
  });
}

/** One workout with its exercises (joined to the catalog) and logged sets. */
export function useWorkoutDetail(workoutId: string | undefined) {
  return useQuery<WorkoutDetail | null>({
    queryKey: ['workout', workoutId],
    enabled: !!workoutId,
    queryFn: async (): Promise<WorkoutDetail | null> => {
      const { data, error } = await supabase
        .from('workouts')
        .select(
          '*, workout_exercises(*, exercise:exercises(*), sets(*))'
        )
        .eq('id', workoutId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      // Sort embedded rows client-side (stable, avoids fragile nested ordering).
      const detail = data as unknown as WorkoutDetail;
      detail.workout_exercises = (detail.workout_exercises ?? []).sort(
        (a, b) => a.order_index - b.order_index
      );
      detail.workout_exercises.forEach((we) => {
        we.sets = (we.sets ?? []).sort((a, b) => a.set_number - b.set_number);
      });
      return detail;
    },
  });
}

// ========================================================================== //
// Mutations
// ========================================================================== //

/** Trainer creates a workout and its exercises in one go. */
export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWorkoutInput): Promise<Workout> => {
      const { data: workout, error } = await supabase
        .from('workouts')
        .insert({
          trainer_id: input.trainer_id,
          client_id: input.client_id,
          name: input.name,
          scheduled_date: input.scheduled_date,
          status: 'scheduled',
        })
        .select('*')
        .single();
      if (error) throw error;

      if (input.items.length) {
        const rows = input.items.map((it, i) => ({ ...it, workout_id: workout.id, order_index: i }));
        const { error: weErr } = await supabase.from('workout_exercises').insert(rows);
        if (weErr) throw weErr;
      }
      return workout as Workout;
    },
    onSuccess: (_w, vars) => {
      qc.invalidateQueries({ queryKey: ['workouts', 'trainer', vars.trainer_id] });
      qc.invalidateQueries({ queryKey: ['workouts', 'client', vars.client_id] });
    },
  });
}

/** Client starts an ad hoc (self-assigned) workout. Returns the new id. */
export function useCreateAdHocWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string): Promise<Workout> => {
      const { data, error } = await supabase
        .from('workouts')
        .insert({
          client_id: clientId,
          trainer_id: null,
          name: 'Ad hoc workout',
          scheduled_date: todayISO(),
          status: 'in_progress',
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as Workout;
    },
    onSuccess: (_w, clientId) =>
      qc.invalidateQueries({ queryKey: ['workouts', 'client', clientId] }),
  });
}

/** Add an exercise to an existing workout (used in builder + ad hoc logging). */
export function useAddWorkoutExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workoutId: string;
      exerciseId: string;
      orderIndex: number;
    }): Promise<WorkoutExercise> => {
      const { data, error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: params.workoutId,
          exercise_id: params.exerciseId,
          order_index: params.orderIndex,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as WorkoutExercise;
    },
    onSuccess: (_we, params) =>
      qc.invalidateQueries({ queryKey: ['workout', params.workoutId] }),
  });
}

export function useRemoveWorkoutExercise(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (workoutExerciseId: string) => {
      const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', workoutExerciseId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', workoutId] }),
  });
}

/** Insert or update a single logged set. Returns the row (with its id). */
export function useUpsertSet(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draft: Partial<SetRow> & { workout_exercise_id: string }): Promise<SetRow> => {
      if (draft.id) {
        const { id, ...rest } = draft;
        const { data, error } = await supabase
          .from('sets')
          .update(rest)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as SetRow;
      }
      const { data, error } = await supabase
        .from('sets')
        .insert(draft)
        .select('*')
        .single();
      if (error) throw error;
      return data as SetRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', workoutId] }),
  });
}

export function useDeleteSet(workoutId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (setId: string) => {
      const { error } = await supabase.from('sets').delete().eq('id', setId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workout', workoutId] }),
  });
}

/** Flip a workout's status (scheduled -> in_progress -> completed). */
export function useSetWorkoutStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      workoutId: string;
      status: Workout['status'];
    }): Promise<Workout> => {
      const patch: Partial<Workout> = { status: params.status };
      patch.completed_at = params.status === 'completed' ? new Date().toISOString() : null;
      const { data, error } = await supabase
        .from('workouts')
        .update(patch)
        .eq('id', params.workoutId)
        .select('*')
        .single();
      if (error) throw error;
      return data as Workout;
    },
    onSuccess: (w) => {
      qc.invalidateQueries({ queryKey: ['workout', w.id] });
      qc.invalidateQueries({ queryKey: ['workouts', 'client', w.client_id] });
      if (w.trainer_id) qc.invalidateQueries({ queryKey: ['workouts', 'trainer', w.trainer_id] });
    },
  });
}
