create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  reporter_user_id uuid references public.profiles(id) on delete set null,
  report_reason text not null check (report_reason in ('Question', 'Answers', 'Missing Graph/Image')),
  additional_context text,
  report_source text not null default 'test' check (report_source in ('test', 'review')),
  created_at timestamptz not null default now()
);

create index user_reports_question_created_idx on public.user_reports (question_id, created_at desc);
create index user_reports_reporter_created_idx on public.user_reports (reporter_user_id, created_at desc);
create unique index user_reports_question_reporter_unique_idx on public.user_reports (question_id, reporter_user_id)
where reporter_user_id is not null;

insert into public.user_reports (
  question_id,
  reporter_user_id,
  report_reason,
  additional_context,
  report_source,
  created_at
)
select
  (card.value ->> 'questionId')::uuid as question_id,
  case
    when (report.value ->> 'reporterId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (report.value ->> 'reporterId')::uuid
    else null
  end as reporter_user_id,
  case
    when report.value ->> 'errorType' in ('Question', 'Answers', 'Missing Graph/Image') then report.value ->> 'errorType'
    else 'Question'
  end as report_reason,
  nullif(btrim(report.value ->> 'note'), '') as additional_context,
  case
    when report.value ->> 'source' = 'review' then 'review'
    else 'test'
  end as report_source,
  coalesce(nullif(report.value ->> 'createdAt', '')::timestamptz, now()) as created_at
from public.test_manager_boards board
cross join lateral jsonb_each(coalesce(board.board -> 'cards', '{}'::jsonb)) as card(key, value)
cross join lateral jsonb_array_elements(coalesce(card.value -> 'reports', '[]'::jsonb)) as report(value)
where (card.value ->> 'questionId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
on conflict do nothing;

drop table public.test_manager_boards;
drop function if exists public.can_manage_test_manager_board();

alter table public.user_reports enable row level security;

create policy "user_reports_read_managers" on public.user_reports
for select using (public.has_app_permission('edit_public_exams'));

create policy "user_reports_insert_own" on public.user_reports
for insert with check (auth.uid() is not null and (reporter_user_id is null or reporter_user_id = auth.uid()));
