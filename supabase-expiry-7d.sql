-- =====================================================================
-- KirQ: shorten shared-session expiry from 30 days to 7 days.
--
-- A session now expires 7 days after its LAST update (every score
-- pushed by the scorekeeper pushes it forward again), so an active
-- session never expires mid-use. Only sessions left untouched for 7
-- days stop opening.
--
-- Existing sessions keep the expiry they already have (at most 30
-- days); they switch to the 7-day window on their next update.
--
-- Safe to run more than once. No data is deleted by this script.
-- =====================================================================

alter table public.kirq_sessions
  alter column expires_at set default now() + interval '7 days';

create or replace function public.kirq_update_session(
  p_code       text,
  p_edit_token text,
  p_payload    jsonb
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated timestamptz;
begin
  if pg_column_size(p_payload) > 400000 then
    raise exception 'KirQ payload too large';
  end if;

  update public.kirq_sessions
     set payload    = p_payload,
         updated_at = now(),
         expires_at = now() + interval '7 days'
   where code = p_code
     and edit_token = p_edit_token
     and expires_at > now()
  returning updated_at into v_updated;

  if v_updated is null then
    raise exception 'KirQ session not found, expired, or edit token rejected';
  end if;

  return v_updated;
end;
$$;

revoke all on function public.kirq_update_session(text, text, jsonb) from public;
grant execute on function public.kirq_update_session(text, text, jsonb) to anon, authenticated;
