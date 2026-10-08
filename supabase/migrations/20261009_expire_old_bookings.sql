create extension if not exists pg_cron;

create or replace function public.delete_expired_bookings()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  deleted_count integer;
begin
  delete from public.bookings b
  where b.booking_date <= current_date - 7
    and not exists (
      select 1 from public.reviews r where r.booking_id = b.id
    )
    and not exists (
      select 1 from public.disputes d where d.booking_id = b.id
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.delete_expired_bookings() from public, anon, authenticated;

select cron.unschedule(jobid)
from cron.job
where jobname = 'delete-expired-bookings';

select cron.schedule(
  'delete-expired-bookings',
  '0 0 * * *',
  'select public.delete_expired_bookings();'
);
