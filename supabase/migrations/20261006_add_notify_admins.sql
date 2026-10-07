-- Existing Supabase projects may have turf-submission triggers that call this
-- helper even if it was missing from the original schema. This migration is
-- idempotent and can be applied to a fresh project or an existing deployment.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

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

alter table public.notifications enable row level security;

grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own" on public.notifications for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_update_own_read_flag" on public.notifications;
create policy "notifications_update_own_read_flag" on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
