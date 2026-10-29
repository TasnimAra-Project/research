-- Families Eat Well
-- Content tables for recipes, ingredients, food-safety lookups, superfoods, and resources.
-- Safety verdicts are stored only when a source document states them.
-- "unknown" means this project has no reviewed verdict. It is not a guess of safe or unsafe.

create extension if not exists pgcrypto;

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.stage_type as enum ('pregnancy', 'breastfeeding', 'both');
create type public.safety_verdict as enum (
  'okay',
  'okay_if_prepared',
  'limit',
  'avoid',
  'unknown'
);
create type public.effort_tag as enum ('no-cook', 'one-pot', 'sheet-pan', 'make-ahead');
create type public.diet_tag as enum ('vegetarian', 'vegan', 'pescatarian', 'gluten-free option');

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  aliases text[] not null default '{}',
  preparation text,
  verdict public.safety_verdict not null default 'unknown',
  reason text,
  safe_version text,
  source_name text,
  source_url text,
  constraint foods_named_verdict_is_sourced check (
    verdict = 'unknown'
    or (reason is not null and source_name is not null)
  ),
  constraint foods_change_has_safe_version check (
    verdict <> 'okay_if_prepared' or safe_version is not null
  )
);

comment on column public.foods.verdict is
  'okay, okay_if_prepared, limit, avoid, or unknown. unknown means not reviewed in the source documents.';

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  meal public.meal_type not null,
  meals public.meal_type[] not null,
  servings integer not null check (servings > 0),
  servings_label text,
  prep_min integer not null check (prep_min >= 0),
  cook_min integer not null check (cook_min >= 0),
  total_min integer not null check (total_min >= 0),
  inactive_time_note text,
  total_cost numeric(10, 2) not null check (total_cost >= 0),
  cost_per_serving numeric(10, 2) generated always as (round(total_cost / servings, 2)) stored,
  cost_is_approximate boolean not null default false,
  cost_store text,
  cost_checked_date date,
  effort_tags public.effort_tag[] not null default '{}',
  diet_tags public.diet_tag[] not null default '{}',
  wic_friendly boolean,
  stage public.stage_type not null,
  chef_tips text[] not null default '{}',
  superfood_spotlight text,
  nutrition_highlights text[] not null default '{}',
  benefits text[] not null default '{}',
  evidence_links jsonb not null default '[]'::jsonb,
  photo_url text,
  reviewed_by text,
  reviewed_date date,
  safety_note text,
  source_document text not null default '25 recipes.pdf',
  constraint recipes_meals_include_primary check (meal = any (meals)),
  constraint recipes_evidence_is_array check (jsonb_typeof(evidence_links) = 'array')
);

comment on column public.recipes.meal is
  'Primary meal. meals holds every meal named in the source when a recipe says lunch or dinner, or breakfast or snack.';
comment on column public.recipes.wic_friendly is
  'Null means the source documents do not say whether the recipe is WIC-friendly.';
comment on column public.recipes.reviewed_by is
  'Null means no reviewer is named in the source documents.';
comment on column public.recipes.cost_store is
  'Null means the source did not name the store used for the cost estimate.';

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position integer not null check (position > 0),
  amount numeric,
  unit text,
  item text not null,
  optional boolean not null default false,
  food_id uuid references public.foods (id),
  alternate_food_id uuid references public.foods (id),
  display text not null,
  unique (recipe_id, position)
);

comment on column public.recipe_ingredients.alternate_food_id is
  'Set when the source gives an or-choice, such as 2% milk or fortified soy milk.';

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  step_order integer not null check (step_order > 0),
  text text not null,
  timer_seconds integer check (timer_seconds is null or timer_seconds > 0),
  unique (recipe_id, step_order)
);

comment on column public.recipe_steps.step_order is
  'Step order. Named step_order because ORDER is reserved in SQL.';

create table public.superfoods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  group_name text not null check (group_name in ('core', 'pantry', 'snack', 'profiled')),
  food_id uuid references public.foods (id),
  key_nutrients text,
  meal_ideas text,
  nutrition_per_100g jsonb,
  nutrition_state text,
  benefits text,
  prices jsonb not null default '[]'::jsonb,
  difficulty text,
  best_value_rank integer check (best_value_rank is null or best_value_rank between 1 and 8),
  best_value_label text,
  best_value_reason text,
  source_documents text[] not null default '{}'
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('video', 'evidence')),
  title text not null,
  description text,
  url text not null,
  recipe_slug text references public.recipes (slug)
);

create unique index resources_url_recipe_uidx
  on public.resources (url, coalesce(recipe_slug, ''));

create table public.nutrient_roles (
  id uuid primary key default gen_random_uuid(),
  nutrient text not null,
  food_examples text not null,
  source_note text not null
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  stage public.stage_type,
  created_at timestamptz not null default now()
);

create index recipes_meal_idx on public.recipes (meal);
create index foods_verdict_idx on public.foods (verdict);
create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);
create index recipe_steps_recipe_idx on public.recipe_steps (recipe_id);
create index resources_recipe_idx on public.resources (recipe_slug);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.foods enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.superfoods enable row level security;
alter table public.resources enable row level security;
alter table public.nutrient_roles enable row level security;
alter table public.profiles enable row level security;

create policy "Public can read foods" on public.foods for select to anon, authenticated using (true);
create policy "Public can read recipes" on public.recipes for select to anon, authenticated using (true);
create policy "Public can read recipe ingredients" on public.recipe_ingredients for select to anon, authenticated using (true);
create policy "Public can read recipe steps" on public.recipe_steps for select to anon, authenticated using (true);
create policy "Public can read superfoods" on public.superfoods for select to anon, authenticated using (true);
create policy "Public can read resources" on public.resources for select to anon, authenticated using (true);
create policy "Public can read nutrient roles" on public.nutrient_roles for select to anon, authenticated using (true);
create policy "Users read their own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Users update their own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

grant usage on schema public to anon, authenticated;
grant select on public.foods, public.recipes, public.recipe_ingredients, public.recipe_steps,
  public.superfoods, public.resources, public.nutrient_roles to anon, authenticated;
grant select, update on public.profiles to authenticated;
