create table public.user_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  source_label text not null,
  source_url text,
  ingredients jsonb not null,
  steps jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.user_recipes enable row level security;

create policy "Users read their recipes" on public.user_recipes for select to authenticated using (auth.uid() = user_id);
create policy "Users save their recipes" on public.user_recipes for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete their recipes" on public.user_recipes for delete to authenticated using (auth.uid() = user_id);

grant select, insert, delete on public.user_recipes to authenticated;
