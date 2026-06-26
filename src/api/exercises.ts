import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Exercise, ExerciseCategory } from '@/types/database';

/** Full exercise catalog (seeded + custom), sorted by name. */
export function useExercises() {
  return useQuery<Exercise[]>({
    queryKey: ['exercises'],
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Exercise[];
    },
  });
}

export interface NewCustomExercise {
  name: string;
  category: ExerciseCategory;
  muscle_group_or_modality?: string | null;
  equipment?: string | null;
  instructions?: string | null;
}

export function useCreateCustomExercise(createdBy: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewCustomExercise): Promise<Exercise> => {
      const { data, error } = await supabase
        .from('exercises')
        .insert({ ...input, is_custom: true, created_by: createdBy })
        .select('*')
        .single();
      if (error) throw error;
      return data as Exercise;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}
