-- =============================================================================
-- Strong vAida — Seed exercise catalog (~30 common exercises)
-- Run this AFTER 0001_init.sql in the Supabase SQL Editor.
-- Seeded rows have is_custom = false and created_by = null.
-- Safe to re-run: skips names that already exist as seeded exercises.
-- =============================================================================

insert into public.exercises
  (name, category, muscle_group_or_modality, equipment, instructions, is_custom)
select v.name, v.category, v.muscle, v.equipment, v.instructions, false
from (values
  -- ---- Strength: lower body ----
  ('Back Squat', 'strength', 'Quads / Glutes', 'Barbell',
   'Bar on upper back, brace, sit down and back to depth, drive up through midfoot.'),
  ('Front Squat', 'strength', 'Quads', 'Barbell',
   'Bar racked on front delts, elbows high, squat upright keeping the torso tall.'),
  ('Deadlift', 'strength', 'Hamstrings / Back', 'Barbell',
   'Hips back, flat spine, grip the bar and drive the floor away, lock out tall.'),
  ('Romanian Deadlift', 'strength', 'Hamstrings / Glutes', 'Barbell',
   'Soft knees, hinge at the hips, slide the bar down the thighs, feel the stretch, return.'),
  ('Leg Press', 'strength', 'Quads / Glutes', 'Machine',
   'Feet shoulder width on the platform, lower under control, press without locking hard.'),
  ('Walking Lunge', 'strength', 'Quads / Glutes', 'Dumbbell',
   'Step forward, drop the back knee toward the floor, push through the front heel.'),
  ('Bulgarian Split Squat', 'strength', 'Quads / Glutes', 'Dumbbell',
   'Rear foot elevated, lower straight down over the front leg, drive back up.'),
  ('Leg Curl', 'strength', 'Hamstrings', 'Machine',
   'Curl the pad toward your glutes, squeeze, lower slowly.'),
  ('Leg Extension', 'strength', 'Quads', 'Machine',
   'Extend the knees fully, pause, lower under control.'),
  ('Standing Calf Raise', 'strength', 'Calves', 'Machine',
   'Rise onto the balls of the feet, full stretch at the bottom, pause at the top.'),

  -- ---- Strength: push ----
  ('Bench Press', 'strength', 'Chest', 'Barbell',
   'Retract shoulder blades, lower to mid-chest, press up and slightly back.'),
  ('Incline Bench Press', 'strength', 'Upper Chest', 'Barbell',
   'Bench at ~30 degrees, lower to the upper chest, press up over the shoulders.'),
  ('Dumbbell Bench Press', 'strength', 'Chest', 'Dumbbell',
   'Press two dumbbells from chest level, control the descent, full stretch.'),
  ('Overhead Press', 'strength', 'Shoulders', 'Barbell',
   'Bar at shoulders, brace glutes and core, press overhead, lock out with the bar over the ears.'),
  ('Dumbbell Shoulder Press', 'strength', 'Shoulders', 'Dumbbell',
   'Press dumbbells overhead from ear height, avoid arching the lower back.'),
  ('Lateral Raise', 'strength', 'Side Delts', 'Dumbbell',
   'Raise the dumbbells out to the sides to shoulder height, lead with the elbows.'),
  ('Triceps Pushdown', 'strength', 'Triceps', 'Cable',
   'Elbows pinned, push the bar down to full extension, control the return.'),
  ('Dips', 'strength', 'Chest / Triceps', 'Bodyweight',
   'Lower until the upper arms are parallel, press back up, lean forward for chest.'),

  -- ---- Strength: pull ----
  ('Pull-up', 'strength', 'Back / Lats', 'Bodyweight',
   'Hang from the bar, pull the chest to the bar, control the descent to full hang.'),
  ('Lat Pulldown', 'strength', 'Back / Lats', 'Cable',
   'Pull the bar to the upper chest, drive the elbows down, squeeze the lats.'),
  ('Barbell Row', 'strength', 'Back', 'Barbell',
   'Hinge forward, row the bar to the lower ribs, squeeze the shoulder blades.'),
  ('Seated Cable Row', 'strength', 'Back', 'Cable',
   'Tall chest, pull the handle to the navel, squeeze, extend the arms under control.'),
  ('Dumbbell Row', 'strength', 'Back / Lats', 'Dumbbell',
   'One hand braced, row the dumbbell to the hip, control the lowering phase.'),
  ('Face Pull', 'strength', 'Rear Delts', 'Cable',
   'Pull the rope toward the face, elbows high, externally rotate at the end.'),
  ('Barbell Curl', 'strength', 'Biceps', 'Barbell',
   'Elbows fixed at the sides, curl the bar up, squeeze, lower slowly.'),
  ('Dumbbell Curl', 'strength', 'Biceps', 'Dumbbell',
   'Curl the dumbbells, supinate the wrists, control the eccentric.'),

  -- ---- Strength: core ----
  ('Plank', 'strength', 'Core', 'Bodyweight',
   'Forearms down, body in a straight line, brace and breathe, hold for time.'),
  ('Hanging Leg Raise', 'strength', 'Core', 'Bodyweight',
   'Hang from the bar, raise the legs to hip height or higher, lower with control.'),
  ('Cable Crunch', 'strength', 'Core', 'Cable',
   'Kneel, hold the rope by the head, crunch down rounding the spine, return.'),

  -- ---- Cardio ----
  ('Treadmill Run', 'cardio', 'Running', 'Treadmill',
   'Steady-state or interval running. Log duration, distance, and average pace.'),
  ('Outdoor Run', 'cardio', 'Running', 'None',
   'Road or trail run. Log duration, distance, and average pace.'),
  ('Indoor Cycling', 'cardio', 'Cycling', 'Stationary Bike',
   'Steady or interval ride. Log duration, distance, and average pace/power.'),
  ('Rowing', 'cardio', 'Rowing', 'Rowing Machine',
   'Drive with the legs, then back, then arms; return in reverse. Log time and distance.'),
  ('Elliptical', 'cardio', 'Cross-training', 'Elliptical',
   'Low-impact steady-state. Log duration and resistance/intensity.'),
  ('Jump Rope', 'cardio', 'Conditioning', 'Jump Rope',
   'Steady skipping or intervals. Log duration.'),
  ('Stair Climber', 'cardio', 'Conditioning', 'Stair Machine',
   'Continuous climbing. Log duration and intensity level.')
) as v(name, category, muscle, equipment, instructions)
where not exists (
  select 1 from public.exercises e
  where e.name = v.name and e.is_custom = false
);
