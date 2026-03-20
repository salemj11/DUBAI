alter table public.rooms replica identity full;
alter table public.events replica identity full;
alter table public.event_votes replica identity full;

alter table public.events
  add column if not exists external_key text,
  add column if not exists locked boolean not null default false,
  add column if not exists notes text;

create unique index if not exists events_external_key_key on public.events (external_key);
