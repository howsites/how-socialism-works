-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Stores anonymous answer sets (e.g. the burger questions) and returns totals.

create table if not exists public.responses (
  id           bigint generated always as identity primary key,
  question_set text        not null check (char_length(question_set) <= 40),
  answers      jsonb       not null check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 2000),
  created_at   timestamptz not null default now()
);

-- Row Level Security: visitors may add answers, but can never read, change or delete rows.
alter table public.responses enable row level security;
drop policy if exists "visitors can submit answers" on public.responses;
create policy "visitors can submit answers" on public.responses
  for insert to anon with check (true);

-- Totals only (no individual rows): { "self": { "no": 12, "yes": 3, ... }, "friend": {...}, ... }
create or replace function public.tally(set_name text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_object_agg(question, counts), '{}'::jsonb)
  from (
    select question, jsonb_object_agg(answer, n) as counts
    from (
      select e.key as question, e.value #>> '{}' as answer, count(*) as n
      from responses r, jsonb_each(r.answers) e
      where r.question_set = set_name
      group by e.key, e.value #>> '{}'
    ) per_answer
    group by question
  ) per_question;
$$;

revoke all on function public.tally(text) from public;
grant execute on function public.tally(text) to anon;
