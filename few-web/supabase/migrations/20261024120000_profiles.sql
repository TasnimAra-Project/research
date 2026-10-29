-- Quiz answers and the life-stage switch live on the profile row created at signup.

alter table public.profiles
  add column life_stage text,
  add column trimester smallint,
  add column due_date date,
  add column diets text[] not null default '{}',
  add column allergies text[] not null default '{}',
  add column dislikes text not null default '',
  add column skill text,
  add column weeknight_minutes integer,
  add column budget_per_serving numeric(4, 2),
  add column onboarded boolean not null default false,
  add column updated_at timestamptz not null default now();

alter table public.profiles
  add constraint profiles_life_stage_check check (life_stage is null or life_stage in ('pregnancy', 'breastfeeding', 'family')),
  add constraint profiles_trimester_check check (trimester is null or trimester between 1 and 3),
  add constraint profiles_skill_check check (skill is null or skill in ('starting', 'comfortable', 'confident')),
  add constraint profiles_weeknight_check check (weeknight_minutes is null or weeknight_minutes in (15, 30, 40)),
  add constraint profiles_budget_check check (budget_per_serving is null or budget_per_serving > 0);
