-- Планирование личных активностей менеджера. Доступ через Express API.
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('flyers', 'telegram', 'promo_stand')),
  scheduled_at timestamptz not null,
  notes text not null default '' check (char_length(notes) <= 5000),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activities_scheduled_at_idx on public.activities (scheduled_at);
create index activities_completed_at_idx on public.activities (completed_at) where completed_at is not null;
create trigger activities_set_updated_at before update on public.activities
for each row execute function public.set_updated_at();
alter table public.activities enable row level security;
