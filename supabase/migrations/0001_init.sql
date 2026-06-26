-- =============================================================================
-- Strong vAida — Initial schema + Row Level Security
-- Run this first in the Supabase SQL Editor.
-- =============================================================================
-- Design notes:
--  * Every table has RLS enabled. Clients can only ever touch their own data;
--    trainers can touch their own data plus data belonging to clients actively
--    linked to them via `coach_links`.
--  * To keep policies readable AND to avoid RLS recursion (a policy on table A
--    that needs to read table B which itself has policies referencing A), the
--    relationship checks live in SECURITY DEFINER helper functions. Those run
--    as the function owner and therefore bypass RLS internally, so we get a
--    single trusted source of truth for "are these two users linked?".
-- =============================================================================

-- ----------------------------------------------------------------------------
-- TABLES
-- ----------------------------------------------------------------------------

-- One profile per auth user. Role is chosen at signup and is immutable in MVP.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null check (role in ('trainer', 'client')),
  full_name   text not null default '',
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- The trainer <-> client relationship. A pending row with a null client_id is
-- an outstanding invite code; redeeming it fills in client_id and flips status.
create table if not exists public.coach_links (
  id          uuid primary key default gen_random_uuid(),
  trainer_id  uuid not null references public.profiles (id) on delete cascade,
  client_id   uuid references public.profiles (id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'active')),
  invite_code text unique,
  created_at  timestamptz not null default now()
);
create index if not exists coach_links_trainer_idx on public.coach_links (trainer_id);
create index if not exists coach_links_client_idx  on public.coach_links (client_id);

-- Exercise catalog. Seeded rows have created_by = null and is_custom = false.
create table if not exists public.exercises (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null,
  category                 text not null check (category in ('strength', 'cardio')),
  muscle_group_or_modality text,
  equipment                text,
  instructions             text,
  demo_video_url           text,
  is_custom                boolean not null default false,
  created_by               uuid references public.profiles (id) on delete set null,
  created_at               timestamptz not null default now()
);

-- A scheduled (or ad hoc) workout for a client. trainer_id is null for ad hoc
-- workouts the client starts themselves.
create table if not exists public.workouts (
  id             uuid primary key default gen_random_uuid(),
  trainer_id     uuid references public.profiles (id) on delete set null,
  client_id      uuid not null references public.profiles (id) on delete cascade,
  name           text not null default 'Workout',
  scheduled_date date,
  status         text not null default 'scheduled'
                   check (status in ('scheduled', 'in_progress', 'completed')),
  notes          text,
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);
create index if not exists workouts_client_idx on public.workouts (client_id);
create index if not exists workouts_trainer_idx on public.workouts (trainer_id);

-- One row per exercise within a workout, with the trainer's targets.
create table if not exists public.workout_exercises (
  id                  uuid primary key default gen_random_uuid(),
  workout_id          uuid not null references public.workouts (id) on delete cascade,
  exercise_id         uuid not null references public.exercises (id) on delete restrict,
  order_index         integer not null default 0,
  target_sets         integer,
  target_reps         integer,
  target_weight       numeric,
  target_duration_sec integer,
  target_distance     numeric,
  target_pace         text,
  rest_sec            integer,
  trainer_note        text
);
create index if not exists workout_exercises_workout_idx on public.workout_exercises (workout_id);

-- Actual logged sets. One row per set for strength; one+ rows for cardio.
create table if not exists public.sets (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number          integer not null default 1,
  actual_reps         integer,
  actual_weight       numeric,
  actual_rpe          numeric,
  actual_duration_sec integer,
  actual_distance     numeric,
  actual_pace         text,
  completed           boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists sets_workout_exercise_idx on public.sets (workout_exercise_id);

-- A short technique clip the client uploaded for a specific exercise instance.
create table if not exists public.technique_videos (
  id                  uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  client_id           uuid not null references public.profiles (id) on delete cascade,
  storage_path        text not null,
  public_url          text,
  uploaded_at         timestamptz not null default now()
);
create index if not exists technique_videos_we_idx on public.technique_videos (workout_exercise_id);

-- Trainer feedback. Can be general (workout-level), attached to an exercise,
-- or attached to a specific video. is_cue flags a corrective coaching cue that
-- gets surfaced the next time the client does that exercise.
create table if not exists public.feedback (
  id                  uuid primary key default gen_random_uuid(),
  workout_id          uuid not null references public.workouts (id) on delete cascade,
  workout_exercise_id uuid references public.workout_exercises (id) on delete cascade,
  technique_video_id  uuid references public.technique_videos (id) on delete set null,
  author_id           uuid not null references public.profiles (id) on delete cascade,
  body                text not null,
  is_cue              boolean not null default false,
  created_at          timestamptz not null default now()
);
create index if not exists feedback_workout_idx on public.feedback (workout_id);
create index if not exists feedback_we_idx on public.feedback (workout_exercise_id);

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS (SECURITY DEFINER — bypass RLS to break recursion)
-- ----------------------------------------------------------------------------

-- Role of the currently authenticated user.
create or replace function public.current_role_name()
returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Is p_client an ACTIVE client of the current (trainer) user?
create or replace function public.is_my_client(p_client uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_links
    where trainer_id = auth.uid()
      and client_id = p_client
      and status = 'active'
  );
$$;

-- Do the current user and p_other share an active trainer/client link
-- (in either direction)? Used so each side can read the other's profile.
create or replace function public.shares_active_link(p_other uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_links
    where status = 'active'
      and (
        (trainer_id = auth.uid() and client_id = p_other) or
        (client_id  = auth.uid() and trainer_id = p_other)
      )
  );
$$;

-- Can the current user see/edit this workout? (client owns it, trainer created
-- it, or it belongs to one of the trainer's active clients).
create or replace function public.can_access_workout(p_workout uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workouts w
    where w.id = p_workout
      and (
        w.client_id = auth.uid()
        or w.trainer_id = auth.uid()
        or public.is_my_client(w.client_id)
      )
  );
$$;

-- Same check, one level deeper (for `sets` and `technique_videos`).
create or replace function public.can_access_workout_exercise(p_we uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.workout_exercises we
    join public.workouts w on w.id = we.workout_id
    where we.id = p_we
      and (
        w.client_id = auth.uid()
        or w.trainer_id = auth.uid()
        or public.is_my_client(w.client_id)
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- NEW USER TRIGGER — create a profile row from signup metadata
-- ----------------------------------------------------------------------------
-- Runs on every new auth.users row. Reads role/full_name out of the metadata
-- the app passes to supabase.auth.signUp({ options: { data: {...} } }). Doing
-- this server-side means it works even when email confirmation is enabled
-- (i.e. before the client ever has a session to insert its own profile).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'client'),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- LINKING RPCs (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- Trainer generates a fresh invite code. Returns the 6-char code. Creates a
-- pending coach_link with no client yet.
create or replace function public.create_invite_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if public.current_role_name() <> 'trainer' then
    raise exception 'Only trainers can create invite codes';
  end if;

  -- 6 uppercase alphanumeric chars, retry until unique.
  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.coach_links where invite_code = v_code);
  end loop;

  insert into public.coach_links (trainer_id, status, invite_code)
  values (auth.uid(), 'pending', v_code);

  return v_code;
end;
$$;

-- Client redeems an invite code, becoming an active client of that trainer.
-- Enforces "one trainer per client" by rejecting if already actively linked.
create or replace function public.redeem_invite_code(p_code text)
returns public.coach_links
language plpgsql security definer set search_path = public as $$
declare
  v_link public.coach_links;
begin
  if public.current_role_name() <> 'client' then
    raise exception 'Only clients can redeem invite codes';
  end if;

  if exists (
    select 1 from public.coach_links
    where client_id = auth.uid() and status = 'active'
  ) then
    raise exception 'You are already linked to a trainer';
  end if;

  select * into v_link
  from public.coach_links
  where invite_code = upper(trim(p_code)) and status = 'pending' and client_id is null
  for update;

  if not found then
    raise exception 'Invalid or already-used invite code';
  end if;

  update public.coach_links
  set client_id = auth.uid(), status = 'active'
  where id = v_link.id
  returning * into v_link;

  return v_link;
end;
$$;

-- Trainer links a client directly by email (alternative to invite codes).
-- Looks the user up in auth.users, verifies they're a client, and creates an
-- active link. Idempotent: re-linking an existing pair just returns it.
create or replace function public.link_client_by_email(p_email text)
returns public.coach_links
language plpgsql security definer set search_path = public as $$
declare
  v_client uuid;
  v_link   public.coach_links;
begin
  if public.current_role_name() <> 'trainer' then
    raise exception 'Only trainers can add clients';
  end if;

  select u.id into v_client
  from auth.users u
  where lower(u.email) = lower(trim(p_email));

  if v_client is null then
    raise exception 'No account found with that email';
  end if;

  if not exists (select 1 from public.profiles where id = v_client and role = 'client') then
    raise exception 'That account is not a client account';
  end if;

  if exists (
    select 1 from public.coach_links
    where client_id = v_client and status = 'active' and trainer_id <> auth.uid()
  ) then
    raise exception 'That client is already linked to another trainer';
  end if;

  select * into v_link
  from public.coach_links
  where trainer_id = auth.uid() and client_id = v_client;

  if found then
    update public.coach_links set status = 'active'
    where id = v_link.id returning * into v_link;
  else
    insert into public.coach_links (trainer_id, client_id, status)
    values (auth.uid(), v_client, 'active')
    returning * into v_link;
  end if;

  return v_link;
end;
$$;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.coach_links       enable row level security;
alter table public.exercises         enable row level security;
alter table public.workouts          enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.sets              enable row level security;
alter table public.technique_videos  enable row level security;
alter table public.feedback          enable row level security;

-- ---- profiles --------------------------------------------------------------
create policy "profiles: read self or linked"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_active_link(id));

create policy "profiles: update self"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---- coach_links -----------------------------------------------------------
create policy "coach_links: read own"
  on public.coach_links for select to authenticated
  using (trainer_id = auth.uid() or client_id = auth.uid());

-- Direct inserts are only for trainers creating their own links. (The RPCs run
-- as definer and bypass this, but this covers any direct client-side insert.)
create policy "coach_links: trainer inserts own"
  on public.coach_links for insert to authenticated
  with check (trainer_id = auth.uid() and public.current_role_name() = 'trainer');

create policy "coach_links: trainer updates own"
  on public.coach_links for update to authenticated
  using (trainer_id = auth.uid()) with check (trainer_id = auth.uid());

create policy "coach_links: trainer deletes own"
  on public.coach_links for delete to authenticated
  using (trainer_id = auth.uid());

-- ---- exercises -------------------------------------------------------------
-- Everyone authenticated can browse the full catalog (seeded + custom).
create policy "exercises: read all"
  on public.exercises for select to authenticated
  using (true);

create policy "exercises: insert own custom"
  on public.exercises for insert to authenticated
  with check (created_by = auth.uid() and is_custom = true);

create policy "exercises: update own custom"
  on public.exercises for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy "exercises: delete own custom"
  on public.exercises for delete to authenticated
  using (created_by = auth.uid());

-- ---- workouts --------------------------------------------------------------
create policy "workouts: read accessible"
  on public.workouts for select to authenticated
  using (
    client_id = auth.uid()
    or trainer_id = auth.uid()
    or public.is_my_client(client_id)
  );

create policy "workouts: insert"
  on public.workouts for insert to authenticated
  with check (
    -- trainer programming for one of their clients
    (trainer_id = auth.uid() and public.is_my_client(client_id))
    -- client starting their own ad hoc workout
    or (client_id = auth.uid() and trainer_id is null)
  );

create policy "workouts: update accessible"
  on public.workouts for update to authenticated
  using (
    client_id = auth.uid()
    or trainer_id = auth.uid()
    or public.is_my_client(client_id)
  )
  with check (
    client_id = auth.uid()
    or trainer_id = auth.uid()
    or public.is_my_client(client_id)
  );

create policy "workouts: delete own"
  on public.workouts for delete to authenticated
  using (client_id = auth.uid() or trainer_id = auth.uid());

-- ---- workout_exercises -----------------------------------------------------
create policy "workout_exercises: all via workout"
  on public.workout_exercises for all to authenticated
  using (public.can_access_workout(workout_id))
  with check (public.can_access_workout(workout_id));

-- ---- sets ------------------------------------------------------------------
create policy "sets: all via workout_exercise"
  on public.sets for all to authenticated
  using (public.can_access_workout_exercise(workout_exercise_id))
  with check (public.can_access_workout_exercise(workout_exercise_id));

-- ---- technique_videos ------------------------------------------------------
create policy "technique_videos: read via workout_exercise"
  on public.technique_videos for select to authenticated
  using (public.can_access_workout_exercise(workout_exercise_id));

create policy "technique_videos: client inserts own"
  on public.technique_videos for insert to authenticated
  with check (
    client_id = auth.uid()
    and public.can_access_workout_exercise(workout_exercise_id)
  );

create policy "technique_videos: client deletes own"
  on public.technique_videos for delete to authenticated
  using (client_id = auth.uid());

-- ---- feedback --------------------------------------------------------------
create policy "feedback: read via workout"
  on public.feedback for select to authenticated
  using (public.can_access_workout(workout_id));

-- Only trainers leave feedback, and only on workouts they can access.
create policy "feedback: trainer inserts"
  on public.feedback for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.current_role_name() = 'trainer'
    and public.can_access_workout(workout_id)
  );

create policy "feedback: author updates"
  on public.feedback for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy "feedback: author deletes"
  on public.feedback for delete to authenticated
  using (author_id = auth.uid());

-- ----------------------------------------------------------------------------
-- "SURFACE LATEST CUE" helper
-- ----------------------------------------------------------------------------
-- Returns the most recent corrective cue a trainer left for THIS client on THIS
-- exercise, across all their past workouts. Used to show "Coach's note on your
-- last {exercise}: {cue}" above the logging fields next time. SECURITY INVOKER
-- (default) so it still respects the caller's RLS — a client only ever gets
-- cues from feedback rows they're already allowed to read.
create or replace function public.latest_cue_for_exercise(
  p_client uuid,
  p_exercise uuid
)
returns text
language sql stable set search_path = public as $$
  select f.body
  from public.feedback f
  join public.workout_exercises we on we.id = f.workout_exercise_id
  join public.workouts w on w.id = f.workout_id
  where f.is_cue = true
    and we.exercise_id = p_exercise
    and w.client_id = p_client
  order by f.created_at desc
  limit 1;
$$;
