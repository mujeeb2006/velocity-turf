-- Run this once in your Supabase project's SQL Editor.

-- 1. Profiles table: one row per auth user, holds the role.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text not null default 'player' check (role in ('player', 'owner', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile and edit their name, but cannot change roles.
create policy "Profiles are viewable by owner"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Profiles are editable by owner" on public.profiles;
create policy "Profiles are editable by owner"
  on public.profiles for update
  using (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

-- 2. Auto-create a profile row whenever someone signs up.
-- Public signups always receive the player role; client metadata cannot assign roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'player'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. To provision the first admin account, sign up through the public form,
--    then run this statement manually from the trusted Supabase SQL Editor:
--
-- update public.profiles set role = 'admin' where email = 'you@example.com';
