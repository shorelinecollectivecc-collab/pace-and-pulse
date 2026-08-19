alter table public.profiles
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists platform text not null default 'Spotify',
  add column if not exists currency text not null default 'ZAR',
  add column if not exists annotation_rate numeric(10, 2) not null default 3.13,
  add column if not exists daily_goal integer not null default 20,
  add column if not exists weekly_goal integer not null default 140,
  add column if not exists monthly_goal integer not null default 560,
  add column if not exists theme text not null default 'sand-sage',
  add column if not exists accent text not null default 'old-gold',
  add column if not exists font text not null default 'shadows-into-light',
  add column if not exists clock_format text not null default '24',
  add column if not exists date_format text not null default 'DD/MM/YYYY';

update public.profiles
set onboarding_complete = false
where onboarding_complete is null;
