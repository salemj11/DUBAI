create table if not exists public.custom_places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('food', 'chill', 'activity')),
  area text,
  notes text,
  submitted_by text not null,
  status text not null default 'pending' check (status in ('pending', 'added', 'skipped')),
  created_at timestamptz not null default now()
);

create index if not exists custom_places_status_created_at_idx
  on public.custom_places (status, created_at desc);

grant select, insert on public.custom_places to authenticated;

alter table public.custom_places enable row level security;

drop policy if exists "custom_places_select_authenticated" on public.custom_places;
create policy "custom_places_select_authenticated"
on public.custom_places
for select
to authenticated
using (true);

drop policy if exists "custom_places_insert_authenticated" on public.custom_places;
create policy "custom_places_insert_authenticated"
on public.custom_places
for insert
to authenticated
with check (true);
