-- Existing Supabase projects may have turf-submission triggers that call this
-- helper even if it was missing from the original schema.
create or replace function public.notify_admins(notification_title text, notification_body text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.notifications (user_id, title, body)
  select p.id, notification_title, notification_body
  from public.profiles p
  where p.role = 'admin';
$$;

revoke all on function public.notify_admins(text, text) from public, anon;
grant execute on function public.notify_admins(text, text) to authenticated;
