create table if not exists public.workspace_backups (
  user_id uuid primary key references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.workspace_backups enable row level security;

create policy "people can read their own workspace"
on public.workspace_backups
for select
using (auth.uid() = user_id);

create policy "people can create their own workspace"
on public.workspace_backups
for insert
with check (auth.uid() = user_id);

create policy "people can update their own workspace"
on public.workspace_backups
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  timezone text not null default 'UTC',
  last_sent jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "people can read their own push subscription"
on public.push_subscriptions
for select
using (auth.uid() = user_id);

create policy "people can create their own push subscription"
on public.push_subscriptions
for insert
with check (auth.uid() = user_id);

create policy "people can update their own push subscription"
on public.push_subscriptions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "people can delete their own push subscription"
on public.push_subscriptions
for delete
using (auth.uid() = user_id);
