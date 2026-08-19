-- PACE & PULSE — PROFILE PICTURE + ONBOARDING FIX

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  alter column platform set default '';

update public.profiles
set platform = ''
where onboarding_complete = false
  and platform = 'Spotify';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public profile pictures are viewable" on storage.objects;
create policy "Public profile pictures are viewable"
on storage.objects for select
using (bucket_id = 'profile-pictures');

drop policy if exists "Users can upload their own profile picture" on storage.objects;
create policy "Users can upload their own profile picture"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own profile picture" on storage.objects;
create policy "Users can update their own profile picture"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own profile picture" on storage.objects;
create policy "Users can delete their own profile picture"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = auth.uid()::text
);
