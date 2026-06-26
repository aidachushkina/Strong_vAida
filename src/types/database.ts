/**
 * Hand-written types mirroring the SQL schema in supabase/migrations.
 *
 * Once your Supabase project is up you can REPLACE this file with generated
 * types for perfect fidelity:
 *
 *   npx supabase login
 *   npx supabase gen types typescript --project-id <your-ref> > src/types/database.ts
 *
 * Until then, these keep the app fully typed against the schema.
 */

export type Role = 'trainer' | 'client';
export type ExerciseCategory = 'strength' | 'cardio';
export type WorkoutStatus = 'scheduled' | 'in_progress' | 'completed';
export type LinkStatus = 'pending' | 'active';

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export type CoachLink = {
  id: string;
  trainer_id: string;
  client_id: string | null;
  status: LinkStatus;
  invite_code: string | null;
  created_at: string;
}

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscle_group_or_modality: string | null;
  equipment: string | null;
  instructions: string | null;
  demo_video_url: string | null;
  is_custom: boolean;
  created_by: string | null;
  created_at: string;
}

export type Workout = {
  id: string;
  trainer_id: string | null;
  client_id: string;
  name: string;
  scheduled_date: string | null;
  status: WorkoutStatus;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

export type WorkoutExercise = {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight: number | null;
  target_duration_sec: number | null;
  target_distance: number | null;
  target_pace: string | null;
  rest_sec: number | null;
  trainer_note: string | null;
}

export type SetRow = {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  actual_reps: number | null;
  actual_weight: number | null;
  actual_rpe: number | null;
  actual_duration_sec: number | null;
  actual_distance: number | null;
  actual_pace: string | null;
  completed: boolean;
  created_at: string;
}

export type TechniqueVideo = {
  id: string;
  workout_exercise_id: string;
  client_id: string;
  storage_path: string;
  public_url: string | null;
  uploaded_at: string;
}

export type Feedback = {
  id: string;
  workout_id: string;
  workout_exercise_id: string | null;
  technique_video_id: string | null;
  author_id: string;
  body: string;
  is_cue: boolean;
  created_at: string;
}

/**
 * Minimal `Database` shape consumed by `createClient<Database>`. We type the
 * row/insert/update payloads loosely (Partial for writes) to keep the client
 * ergonomic without a full generated schema. Swap in generated types later.
 */
type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      coach_links: Table<CoachLink>;
      exercises: Table<Exercise>;
      workouts: Table<Workout>;
      workout_exercises: Table<WorkoutExercise>;
      sets: Table<SetRow>;
      technique_videos: Table<TechniqueVideo>;
      feedback: Table<Feedback>;
    };
    Views: Record<string, never>;
    Functions: {
      create_invite_code: { Args: Record<string, never>; Returns: string };
      redeem_invite_code: { Args: { p_code: string }; Returns: CoachLink };
      link_client_by_email: { Args: { p_email: string }; Returns: CoachLink };
      latest_cue_for_exercise: {
        Args: { p_client: string; p_exercise: string };
        Returns: string | null;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
