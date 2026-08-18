-- Stop auto-promoting scott@myaiwill.com. Keep Ron as the only bootstrap admin.
create or replace function public.handle_admin_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if lower(new.email) = 'ronprynn77@outlook.com' then
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

revoke execute on function public.handle_admin_signup() from public, anon, authenticated;

-- Clear the one FK that does not ON DELETE SET NULL / CASCADE, then drop the user.
update public.will_documents
set approved_by = null
where approved_by in (
  select id from auth.users where lower(email) = 'scott@myaiwill.com'
);

delete from public.user_roles
where user_id in (
  select id from auth.users where lower(email) = 'scott@myaiwill.com'
);

delete from public.admin_users
where lower(email) = 'scott@myaiwill.com'
   or user_id in (
     select id from auth.users where lower(email) = 'scott@myaiwill.com'
   );

delete from auth.users where lower(email) = 'scott@myaiwill.com';
