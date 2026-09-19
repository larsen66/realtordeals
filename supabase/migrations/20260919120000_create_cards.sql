create table public.cards (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('seller', 'buyer')),
  deal_type text not null check (deal_type in ('sale', 'purchase')),
  phone text not null,
  name text,
  object_type text,
  address text,
  source text,
  budget text,
  temperature text check (
    temperature is null
    or temperature in ('cold', 'warm', 'hot')
  ),
  payment text check (payment is null or payment in ('cash', 'mortgage')),
  stage text check (
    stage is null
    or stage in ('selection', 'viewing', 'close', 'deal', 'referral')
  ),
  birthday date,
  source_text text,
  promised_call_at timestamptz,
  fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cards_role_idx on public.cards (role);
create index cards_temperature_idx on public.cards (temperature);
create index cards_stage_idx on public.cards (stage);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cards_set_updated_at
before update on public.cards
for each row
execute function public.set_updated_at();

alter table public.cards enable row level security;
