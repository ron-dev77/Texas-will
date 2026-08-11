
-- 1. Auto-promote scott@myaiwill.com to admin on signup
create or replace function public.handle_admin_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(new.email) = 'scott@myaiwill.com' then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict do nothing;
    insert into public.admin_users (user_id, email)
    values (new.id, new.email)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_admin on auth.users;
create trigger on_auth_user_created_admin
  after insert on auth.users
  for each row execute function public.handle_admin_signup();

-- Backfill if scott already exists in auth.users
insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users
where lower(email) = 'scott@myaiwill.com'
on conflict do nothing;

insert into public.admin_users (user_id, email)
select id, email from auth.users
where lower(email) = 'scott@myaiwill.com'
on conflict do nothing;

-- 2. Admin read/update policies on operational tables
create policy "Admins can read all orders"
  on public.orders for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update orders"
  on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all questionnaire answers"
  on public.questionnaire_answers for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read all will documents"
  on public.will_documents for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update will documents"
  on public.will_documents for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can read email send log"
  on public.email_send_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- 3. OneDrive tracking on will_documents
alter table public.will_documents
  add column if not exists onedrive_item_id text,
  add column if not exists onedrive_path text,
  add column if not exists onedrive_web_url text,
  add column if not exists customer_download_url text,
  add column if not exists version int not null default 1;
