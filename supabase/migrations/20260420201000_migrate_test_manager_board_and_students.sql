create table public.test_manager_boards (
  key text primary key,
  board jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.hall_of_fame_students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school text not null,
  score integer not null check (score >= 400 and score <= 1600),
  exam_date text not null,
  image_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.can_manage_test_manager_board()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and public.has_app_permission('edit_public_exams');
$$;

create trigger set_test_manager_boards_updated_at
before update on public.test_manager_boards
for each row execute function public.set_updated_at();

create trigger set_hall_of_fame_students_updated_at
before update on public.hall_of_fame_students
for each row execute function public.set_updated_at();

alter table public.test_manager_boards enable row level security;
alter table public.hall_of_fame_students enable row level security;

create policy "test_manager_boards_read_managers" on public.test_manager_boards
for select using (public.can_manage_test_manager_board());

create policy "test_manager_boards_insert_managers" on public.test_manager_boards
for insert with check (public.can_manage_test_manager_board());

create policy "test_manager_boards_update_managers" on public.test_manager_boards
for update using (public.can_manage_test_manager_board()) with check (public.can_manage_test_manager_board());

create policy "hall_of_fame_students_read_public" on public.hall_of_fame_students
for select using (true);

create policy "hall_of_fame_students_insert_admin" on public.hall_of_fame_students
for insert with check (public.current_app_role() = 'admin');

create policy "hall_of_fame_students_update_admin" on public.hall_of_fame_students
for update using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "hall_of_fame_students_delete_admin" on public.hall_of_fame_students
for delete using (public.current_app_role() = 'admin');
