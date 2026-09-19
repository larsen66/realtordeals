alter table public.cards
  add column selection_status text check (
    selection_status is null
    or selection_status in ('waiting', 'awaiting_reply')
  ),
  add column referral_status text check (
    referral_status is null
    or referral_status in ('posted', 'not_posted')
  );
