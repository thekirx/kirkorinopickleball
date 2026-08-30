-- =====================================================================
-- KirQ fix v2 — no pgcrypto required.
--
-- gen_random_bytes() comes from the pgcrypto extension, whose schema
-- varies between Supabase projects. gen_random_uuid() is built into
-- Postgres core (13+), is backed by the same strong RNG, and is already
-- proven to work in this database because the table's default uses it.
-- So we build the code and token out of UUIDs instead and drop the
-- dependency altogether.
--
-- Safe to run more than once. Only replaces kirq_create_session; the
-- table and any existing sessions are untouched.
-- =====================================================================

create or replace function public.kirq_create_session(p_payload jsonb)
returns table (code text, edit_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code    text;
  v_token   text;
  v_attempt int := 0;
begin
  if pg_column_size(p_payload) > 400000 then
    raise exception 'KirQ payload too large';
  end if;

  delete from public.kirq_sessions where expires_at < now();

  -- 18 hex chars (72 bits) for the shared code, 64 (256 bits) for the
  -- private edit token.
  loop
    v_attempt := v_attempt + 1;

    v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
    v_token := replace(gen_random_uuid()::text, '-', '')
            || replace(gen_random_uuid()::text, '-', '');

    begin
      insert into public.kirq_sessions (code, edit_token, payload)
      values (v_code, v_token, p_payload);
      exit;
    exception when unique_violation then
      if v_attempt >= 5 then
        raise exception 'KirQ could not allocate a unique share code';
      end if;
    end;
  end loop;

  return query select v_code, v_token;
end;
$$;

revoke all on function public.kirq_create_session(jsonb) from public;
grant execute on function public.kirq_create_session(jsonb) to anon, authenticated;
