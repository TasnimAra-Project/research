-- Week grid and named copies of a week.

create table public.meal_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day smallint not null check (day between 0 and 6),
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  recipe_slug text not null,
  unique (user_id, day, meal)
);

create table public.plan_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slots jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.meal_slots enable row level security;
alter table public.plan_templates enable row level security;

create policy "Users read their meal plan" on public.meal_slots for select to authenticated using (auth.uid() = user_id);
create policy "Users add meal slots" on public.meal_slots for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update meal slots" on public.meal_slots for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete meal slots" on public.meal_slots for delete to authenticated using (auth.uid() = user_id);

create policy "Users read their plan templates" on public.plan_templates for select to authenticated using (auth.uid() = user_id);
create policy "Users save plan templates" on public.plan_templates for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete plan templates" on public.plan_templates for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.meal_slots to authenticated;
grant select, insert, delete on public.plan_templates to authenticated;
