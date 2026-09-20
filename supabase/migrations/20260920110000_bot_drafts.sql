create table public.bot_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  role text not null check (role in ('seller', 'buyer')),
  status text not null default 'collecting' check (status in ('collecting', 'confirmed')),
  revision integer not null default 0 check (revision >= 0),
  candidate jsonb not null default '{}'::jsonb,
  source_texts jsonb not null default '[]'::jsonb check (jsonb_typeof(source_texts) = 'array'),
  processed_updates jsonb not null default '[]'::jsonb check (jsonb_typeof(processed_updates) = 'array'),
  card_id uuid references public.cards(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bot_drafts_owner_created_idx
  on public.bot_drafts (owner_key, created_at desc);

create trigger bot_drafts_set_updated_at
before update on public.bot_drafts
for each row
execute function public.set_updated_at();

create table public.bot_create_requests (
  owner_key text not null,
  request_id text not null,
  draft_id uuid not null references public.bot_drafts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (owner_key, request_id)
);

alter table public.bot_drafts enable row level security;
alter table public.bot_create_requests enable row level security;

create function public.create_bot_draft(
  p_owner_key text,
  p_role text,
  p_request_id text
)
returns public.bot_drafts
language plpgsql
set search_path = public
as $$
declare
  v_draft public.bot_drafts;
begin
  select d.* into v_draft
  from public.bot_create_requests r
  join public.bot_drafts d on d.id = r.draft_id
  where r.owner_key = p_owner_key and r.request_id = p_request_id;
  if found then return v_draft; end if;

  begin
    insert into public.bot_drafts (owner_key, role, candidate)
    values (
      p_owner_key,
      p_role,
      jsonb_build_object(
        'name', null, 'phone', null, 'objectType', null, 'address', null,
        'source', 'telegram', 'budget', null, 'temperature', null,
        'payment', null, 'promisedCallAt', null, 'fields', '{}'::jsonb,
        'notes', '[]'::jsonb
      )
    ) returning * into v_draft;

    insert into public.bot_create_requests (owner_key, request_id, draft_id)
    values (p_owner_key, p_request_id, v_draft.id);
    return v_draft;
  exception when unique_violation then
    select d.* into v_draft
    from public.bot_create_requests r
    join public.bot_drafts d on d.id = r.draft_id
    where r.owner_key = p_owner_key and r.request_id = p_request_id;
    return v_draft;
  end;
end;
$$;

create function public.confirm_bot_draft(
  p_owner_key text,
  p_draft_id uuid,
  p_revision integer,
  p_card jsonb
)
returns public.bot_drafts
language plpgsql
set search_path = public
as $$
declare
  v_draft public.bot_drafts;
  v_card_id uuid;
begin
  select * into v_draft
  from public.bot_drafts
  where id = p_draft_id and owner_key = p_owner_key
  for update;

  if not found then return null; end if;
  if v_draft.status = 'confirmed' then return v_draft; end if;
  if v_draft.revision <> p_revision then return null; end if;

  insert into public.cards (
    role, deal_type, phone, name, object_type, address, source, budget,
    temperature, payment, stage, selection_status, referral_status,
    birthday, source_text, promised_call_at, fields
  ) values (
    p_card->>'role', p_card->>'deal_type', p_card->>'phone', p_card->>'name',
    p_card->>'object_type', p_card->>'address', p_card->>'source', p_card->>'budget',
    p_card->>'temperature', p_card->>'payment', p_card->>'stage',
    p_card->>'selection_status', p_card->>'referral_status',
    (p_card->>'birthday')::date, p_card->>'source_text',
    (p_card->>'promised_call_at')::timestamptz,
    coalesce(p_card->'fields', '{}'::jsonb)
  ) returning id into v_card_id;

  update public.bot_drafts
  set status = 'confirmed', card_id = v_card_id
  where id = p_draft_id
  returning * into v_draft;
  return v_draft;
end;
$$;
