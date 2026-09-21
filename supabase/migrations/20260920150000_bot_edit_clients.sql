alter table public.bot_drafts
  add column target_card_id uuid references public.cards(id),
  add column target_updated_at timestamptz;

create function public.create_bot_edit_draft(
  p_owner_key text, p_role text, p_request_id text,
  p_target_card_id uuid, p_target_updated_at timestamptz, p_candidate jsonb
)
returns public.bot_drafts
language plpgsql
set search_path = public
as $$
declare v_draft public.bot_drafts;
begin
  v_draft := public.create_bot_draft(p_owner_key, p_role, p_request_id);
  select * into v_draft from public.bot_drafts where id = v_draft.id for update;
  if v_draft.target_card_id is null and v_draft.revision = 0 then
    update public.bot_drafts set target_card_id = p_target_card_id,
      target_updated_at = p_target_updated_at, candidate = p_candidate
    where id = v_draft.id returning * into v_draft;
  end if;
  return v_draft;
end;
$$;

create or replace function public.confirm_bot_draft(
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

  if nullif(btrim(p_card->>'phone'), '') is null then
    raise exception 'phone is required';
  end if;

  if v_draft.target_card_id is not null then
    update public.cards set
      phone = p_card->>'phone', name = p_card->>'name',
      object_type = p_card->>'object_type', address = p_card->>'address',
      source = p_card->>'source', budget = p_card->>'budget',
      temperature = p_card->>'temperature', payment = p_card->>'payment',
      source_text = p_card->>'source_text',
      promised_call_at = (p_card->>'promised_call_at')::timestamptz,
      fields = coalesce(p_card->'fields', '{}'::jsonb)
    where id = v_draft.target_card_id and updated_at = v_draft.target_updated_at
    returning id into v_card_id;
    if not found then return null; end if;
  else
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

  end if;

  update public.bot_drafts
  set status = 'confirmed', card_id = v_card_id
  where id = p_draft_id
  returning * into v_draft;
  return v_draft;
end;
$$;

create table public.bot_usage (
  id uuid primary key,
  key_id text not null,
  draft_id text,
  total_tokens bigint check (total_tokens >= 0),
  estimated_usd numeric check (estimated_usd >= 0),
  created_at timestamptz not null default now()
);
alter table public.bot_usage enable row level security;
create index bot_usage_key_draft_idx on public.bot_usage (key_id, draft_id);
create function public.bot_usage_report(p_key_id text, p_draft_id text default null)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('count', count(*), 'tokens', coalesce(sum(total_tokens), 0),
    'usd', coalesce(sum(estimated_usd), 0),
    'unknown', count(*) filter (where total_tokens is null or estimated_usd is null))
  from public.bot_usage where key_id = p_key_id and (p_draft_id is null or draft_id = p_draft_id);
$$;
