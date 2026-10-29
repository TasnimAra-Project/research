-- Extra fields for a recipe the user writes or confirms from a link.

alter table public.user_recipes
  add column servings integer not null default 1,
  add column total_min integer not null default 0,
  add column meals text[] not null default '{}',
  add column nutrition jsonb;
