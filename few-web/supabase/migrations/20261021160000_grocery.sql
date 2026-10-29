-- Grocery list, pantry, week plan, and partner invite links.
-- The site stores the list only. Payment stays on the store's own site.

create table public.week_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_slug text not null,
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (user_id, recipe_slug)
);

create table public.grocery_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  merge_key text not null,
  food_slug text,
  name text not null,
  amount numeric,
  unit text,
  aisle text not null,
  included boolean not null default true,
  got boolean not null default false,
  optional boolean not null default false,
  sources text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (user_id, merge_key)
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_slug text,
  name text not null,
  purchased_on date,
  expires_on date,
  created_at timestamptz not null default now()
);

create table public.list_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

create index week_recipes_user_idx on public.week_recipes (user_id, position);
create index grocery_items_user_idx on public.grocery_items (user_id);
create index pantry_items_user_idx on public.pantry_items (user_id);

alter table public.week_recipes enable row level security;
alter table public.grocery_items enable row level security;
alter table public.pantry_items enable row level security;
alter table public.list_shares enable row level security;

create policy "Users read their week" on public.week_recipes for select to authenticated using (auth.uid() = user_id);
create policy "Users add to their week" on public.week_recipes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update their week" on public.week_recipes for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete their week" on public.week_recipes for delete to authenticated using (auth.uid() = user_id);

create policy "Users read their grocery list" on public.grocery_items for select to authenticated using (auth.uid() = user_id);
create policy "Users add grocery items" on public.grocery_items for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update grocery items" on public.grocery_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete grocery items" on public.grocery_items for delete to authenticated using (auth.uid() = user_id);

create policy "Users read their pantry" on public.pantry_items for select to authenticated using (auth.uid() = user_id);
create policy "Users add pantry items" on public.pantry_items for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update pantry items" on public.pantry_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete pantry items" on public.pantry_items for delete to authenticated using (auth.uid() = user_id);

create policy "Users read their invite" on public.list_shares for select to authenticated using (auth.uid() = user_id);
create policy "Users create their invite" on public.list_shares for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update their invite" on public.list_shares for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete their invite" on public.list_shares for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update, delete on public.week_recipes, public.grocery_items, public.pantry_items, public.list_shares to authenticated;

-- Partner opens an invite link. The function returns the week and the list, not the pantry.
create or replace function public.shared_plan(share_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  owner uuid;
begin
  select user_id into owner from public.list_shares where token = share_token;
  if owner is null then
    return null;
  end if;

  return jsonb_build_object(
    'recipes',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('recipe_slug', recipe_slug, 'position', position)
          order by position
        )
        from public.week_recipes
        where user_id = owner
      ),
      '[]'::jsonb
    ),
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', name,
            'amount', amount,
            'unit', unit,
            'aisle', aisle,
            'included', included,
            'got', got,
            'optional', optional,
            'food_slug', food_slug,
            'sources', to_jsonb(sources)
          )
          order by aisle, name
        )
        from public.grocery_items
        where user_id = owner
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.shared_plan(text) from public;
grant execute on function public.shared_plan(text) to anon, authenticated;
