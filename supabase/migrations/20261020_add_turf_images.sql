-- Migration: Support turf photos and gallery
-- Adds images column to turfs table and grants necessary permissions

alter table public.turfs
  add column if not exists images text[] not null default '{}';

grant insert (images) on public.turfs to authenticated;
grant select on public.turfs to anon, authenticated;
