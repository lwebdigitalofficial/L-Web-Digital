-- L Web Digital: real customer rating system
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  rating smallint not null check (rating between 1 and 5),
  name text check (name is null or char_length(name) <= 80),
  ip_hash text not null,
  day_key date not null default current_date,
  created_at timestamptz not null default now(),
  unique (ip_hash, day_key)
);

alter table public.ratings enable row level security;

-- No public SELECT/INSERT policy is created. The website talks to the database
-- only through the server-side Vercel API using the service-role key.

create or replace function public.get_rating_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'average', (select round(avg(rating)::numeric, 1) from public.ratings),
    'count', (select count(*) from public.ratings),
    'ratings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', coalesce(nullif(name, ''), 'Anonymous'),
        'rating', rating,
        'created_at', created_at
      ) order by created_at desc)
      from (select name, rating, created_at from public.ratings order by created_at desc limit 20) recent
    ), '[]'::jsonb)
  );
$$;

create or replace function public.submit_rating(
  p_rating smallint,
  p_name text,
  p_ip_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
begin
  if p_rating < 1 or p_rating > 5 then
    raise exception 'Invalid rating';
  end if;

  clean_name := nullif(left(trim(coalesce(p_name, '')), 80), '');

  insert into public.ratings (rating, name, ip_hash, day_key)
  values (p_rating, clean_name, p_ip_hash, current_date);

  return public.get_rating_summary();
exception
  when unique_violation then
    raise exception 'Already rated today';
end;
$$;

revoke all on table public.ratings from anon, authenticated;
revoke all on function public.get_rating_summary() from public, anon, authenticated;
revoke all on function public.submit_rating(smallint, text, text) from public, anon, authenticated;
grant execute on function public.get_rating_summary() to service_role;
grant execute on function public.submit_rating(smallint, text, text) to service_role;
