create or replace function public.handle_admin_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if lower(new.email) in ('scott@myaiwill.com', 'ronprynn77@outlook.com') then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict do nothing;
    insert into public.admin_users (user_id, email)
    values (new.id, new.email)
    on conflict do nothing;
  end if;
  return new;
end;
$function$;