alter table public.user_reports
add column resolved_at timestamptz,
add column resolved_by_user_id uuid references public.profiles(id) on delete set null;

create index user_reports_question_resolved_idx on public.user_reports (question_id, resolved_at);

create policy "user_reports_update_managers" on public.user_reports
for update using (public.has_app_permission('edit_public_exams'))
with check (public.has_app_permission('edit_public_exams'));

create policy "user_reports_delete_managers" on public.user_reports
for delete using (public.has_app_permission('edit_public_exams'));
