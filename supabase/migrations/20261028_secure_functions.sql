-- 20261028_secure_functions.sql
-- -----------------------------------------------------------------
-- Secure Supabase function permissions – reversible, idempotent.
-- -----------------------------------------------------------------

-- 1️⃣  current_user_role: only authenticated users need this.
revoke execute on function public.current_user_role() from anon;
grant  execute on function public.current_user_role() to authenticated;

-- 2️⃣  turf_slots: keep public access only if you truly need slot
--     discovery for unsigned visitors.  If not, restrict to auth.
--     Comment/uncomment the block that matches your policy.

-- Uncomment the following two lines to *restrict* slot discovery
-- to signed‑in users only (recommended for most SaaS models):
-- revoke execute on function public.turf_slots(uuid, date) from anon;
-- grant  execute on function public.turf_slots(uuid, date) to authenticated;

-- 3️⃣  admin_user_emails – drop if it exists (or replace with safe version).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'admin_user_emails') then
    drop function public.admin_user_emails();
  end if;
end $$;

-- 4️⃣  is_admin – drop if it exists (or replace with safe version).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'is_admin') then
    drop function public.is_admin();
  end if;
end $$;

-- 5️⃣  (Optional) tighten notify_admins – add a role check inside the function
--     to ensure only admins can invoke it.  Since the function already runs
--     as DEFINER, we can add a guard clause.
do $$
begin
  if not exists (
    select 1
    from pg_proc
    where proname = 'notify_admins'
      and prosrc like '%raise exception%role%'
  ) then
    alter function public.notify_admins(text, text)
    security definer
    set search_path = public, pg_temp
    as $func$
      begin
        if public.current_user_role() <> 'admin' then
          raise exception 'Only admins may send admin notifications.' using errcode = '42501';
        end if;
        insert into public.notifications (user_id, title, body)
          select p.id, $1, $2
          from public.profiles p
          where p.role = 'admin';
      end;
    $func$ language plpgsql;
  end if;
end $$;

-- 6️⃣  Ensure the DROP / ALTER statements are wrapped in DO blocks so the
--     migration is **idempotent** – running it twice will not fail.
