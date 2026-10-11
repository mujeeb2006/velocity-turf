-- Run after applying 20261011_turf_archiving_a.sql in the Supabase SQL Editor.
-- This targets the verified T Turf record by its UUID and verifies its owner.
begin;

do $$
declare
  updated_count integer;
begin
  if not exists (
    select 1
    from public.turfs
    where id = '1ef0b7d2-bd1d-468e-9331-3f8f810bcadc'::uuid
      and owner_id = '3c7b5838-be16-4276-b279-c9265f504148'::uuid
  ) then
    raise exception 'The expected turf ID and owner ID were not found; nothing was changed.';
  end if;

  update public.turfs
  set archived_at = coalesce(archived_at, now())
  where id = '1ef0b7d2-bd1d-468e-9331-3f8f810bcadc'::uuid
    and owner_id = '3c7b5838-be16-4276-b279-c9265f504148'::uuid;

  get diagnostics updated_count = row_count;
  if updated_count <> 1 then
    raise exception 'Expected to archive exactly one turf, but updated % rows.', updated_count;
  end if;
end;
$$;

commit;
