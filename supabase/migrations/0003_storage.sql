-- =============================================================================
-- Strong vAida — Storage bucket + policies for technique videos
-- Run this AFTER 0001_init.sql. (Videos are used in Phase 3, but setting the
-- bucket up now means you only touch Supabase config once.)
-- =============================================================================
-- Convention: every object is stored under a path that starts with the
-- uploading client's user id, e.g.  <client_id>/<workout_exercise_id>/<file>.
-- The policies below key off that first path segment so a client can only
-- write under their own prefix, while a trainer can READ a video belonging to
-- one of their active clients.
-- =============================================================================

-- Create a private bucket (no public listing; we serve via signed URLs).
insert into storage.buckets (id, name, public)
values ('technique-videos', 'technique-videos', false)
on conflict (id) do nothing;

-- Client can upload only under their own user-id prefix.
create policy "technique-videos: client uploads own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'technique-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Client can read/delete their own objects.
create policy "technique-videos: client reads own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'technique-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "technique-videos: client deletes own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'technique-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Trainer can read objects owned by one of their active clients.
create policy "technique-videos: trainer reads client videos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'technique-videos'
    and public.is_my_client(((storage.foldername(name))[1])::uuid)
  );
