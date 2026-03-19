create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id text primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  category text not null,
  subcategory text,
  place_id text,
  place_name text not null,
  created_by text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

create index if not exists events_day_start_time_idx on public.events (day, start_time);

create table if not exists public.event_votes (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id text not null,
  vote text not null check (vote in ('yes', 'no')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists event_votes_user_id_idx on public.event_votes (user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end
$$;

drop trigger if exists rooms_set_updated_at on public.rooms;
create trigger rooms_set_updated_at
before update on public.rooms
for each row
execute function public.set_updated_at();

grant usage on schema public to authenticated;
grant select, insert, update on public.rooms to authenticated;
grant select, insert, update on public.events to authenticated;
grant select, insert, update on public.event_votes to authenticated;

alter table public.rooms enable row level security;
alter table public.events enable row level security;
alter table public.event_votes enable row level security;

drop policy if exists "rooms_select_authenticated" on public.rooms;
create policy "rooms_select_authenticated"
on public.rooms
for select
to authenticated
using (true);

drop policy if exists "rooms_insert_authenticated" on public.rooms;
create policy "rooms_insert_authenticated"
on public.rooms
for insert
to authenticated
with check (true);

drop policy if exists "rooms_update_authenticated" on public.rooms;
create policy "rooms_update_authenticated"
on public.rooms
for update
to authenticated
using (true)
with check (true);

drop policy if exists "events_select_authenticated" on public.events;
create policy "events_select_authenticated"
on public.events
for select
to authenticated
using (true);

drop policy if exists "events_insert_authenticated" on public.events;
create policy "events_insert_authenticated"
on public.events
for insert
to authenticated
with check (true);

drop policy if exists "events_update_authenticated" on public.events;
create policy "events_update_authenticated"
on public.events
for update
to authenticated
using (true)
with check (true);

drop policy if exists "event_votes_select_authenticated" on public.event_votes;
create policy "event_votes_select_authenticated"
on public.event_votes
for select
to authenticated
using (true);

drop policy if exists "event_votes_insert_authenticated" on public.event_votes;
create policy "event_votes_insert_authenticated"
on public.event_votes
for insert
to authenticated
with check (true);

drop policy if exists "event_votes_update_authenticated" on public.event_votes;
create policy "event_votes_update_authenticated"
on public.event_votes
for update
to authenticated
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    alter publication supabase_realtime add table public.events;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'event_votes'
  ) then
    alter publication supabase_realtime add table public.event_votes;
  end if;
end
$$;
