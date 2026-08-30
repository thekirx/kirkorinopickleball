-- =====================================================================
-- KirQ — shared session storage
--
-- Design notes
--   * The table itself is completely off-limits to the public API:
--     RLS is on and no policies exist, so anon/authenticated roles
--     cannot read or write a single row directly.
--   * All access goes through three SECURITY DEFINER functions, so the
--     only possible operations are the three we allow, and a session can
--     only be read by someone who knows its unguessable code.
--   * Updating additionally requires an edit token that never leaves the
--     scorekeeper's device, so a share link cannot be used to overwrite
--     the session it points at.
--   * Sessions self-expire after 30 days and are swept on each insert,
--     so the table cannot grow without bound.
-- =====================================================================

create extension if not exists pgcrypto;

create table if not exists public.kirq_sessions (
  id          uuid primary key default gen_random_uuid(),
  code        text        not null unique,
  edit_token  text        not null,
  payload     jsonb       not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days'
);

create index if not exists kirq_sessions_code_idx on public.kirq_sessions (code);
create index if not exists kirq_sessions_expires_idx on public.kirq_sessions (expires_at);

alter table public.kirq_sessions enable row level security;

-- Deliberately no policies: direct table access is denied for everyone
-- except the definer functions below.
revoke all on table public.kirq_sessions from anon, authenticated;

-- ---------------------------------------------------------------------
-- Create a session. Returns the public share code and the private edit
-- token. Only the scorekeeper's browser ever stores the edit token.
-- ---------------------------------------------------------------------
create or replace function public.kirq_create_session(p_payload jsonb)
returns table (code text, edit_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code  text;
  v_token text;
begin
  if pg_column_size(p_payload) > 400000 then
    raise exception 'KirQ payload too large';
  end if;

  -- Opportunistic sweep of expired sessions.
  delete from public.kirq_sessions where expires_at < now();

  v_code  := encode(gen_random_bytes(9), 'hex');   -- 18 chars, 72 bits
  v_token := encode(gen_random_bytes(24), 'hex');  -- 48 chars, 192 bits

  insert into public.kirq_sessions (code, edit_token, payload)
  values (v_code, v_token, p_payload);

  return query select v_code, v_token;
end;
$$;

-- ---------------------------------------------------------------------
-- Overwrite a session's payload. Requires the matching edit token.
-- ---------------------------------------------------------------------
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
         expires_at = now() + interval '30 days'
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

-- ---------------------------------------------------------------------
-- Read a session by its share code. No token needed: the code is the
-- capability, which is what makes a scanned QR work.
-- ---------------------------------------------------------------------
create or replace function public.kirq_read_session(p_code text)
returns table (payload jsonb, updated_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select payload, updated_at
    from public.kirq_sessions
   where code = p_code
     and expires_at > now();
$$;

-- ---------------------------------------------------------------------
-- Expose exactly these three entry points to the public API.
-- ---------------------------------------------------------------------
revoke all on function public.kirq_create_session(jsonb) from public;
revoke all on function public.kirq_update_session(text, text, jsonb) from public;
revoke all on function public.kirq_read_session(text) from public;

grant execute on function public.kirq_create_session(jsonb)               to anon, authenticated;
grant execute on function public.kirq_update_session(text, text, jsonb)   to anon, authenticated;
grant execute on function public.kirq_read_session(text)                  to anon, authenticated;
