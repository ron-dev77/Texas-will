-- Phase 2: capture emails from over-$8M off-ramp (no checkout).
create table if not exists public.qualifier_off_ramp_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  estate_bracket text not null default 'over_8m',
  plan_type text,
  marital_status text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.qualifier_off_ramp_leads enable row level security;

create policy "Anyone can submit off-ramp lead"
  on public.qualifier_off_ramp_leads
  for insert
  to anon, authenticated
  with check (true);

create policy "Admins read off-ramp leads"
  on public.qualifier_off_ramp_leads
  for select
  to authenticated
  using (
    exists (
      select 1 from public.admin_users au where au.user_id = auth.uid()
    )
  );
