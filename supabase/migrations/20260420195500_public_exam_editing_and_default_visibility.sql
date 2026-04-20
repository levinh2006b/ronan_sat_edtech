update public.tests
set visibility = 'public'
where visibility <> 'public';

create or replace function public.can_edit_test(target_test_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.tests t
    where t.id = target_test_id
      and (
        public.current_app_role() = 'admin'
        or (t.visibility = 'public' and public.has_app_permission('edit_public_exams'))
        or (
          t.owner_user_id = auth.uid()
          and t.visibility = 'private'
          and public.has_app_permission('edit_private_exams')
        )
      )
  );
$$;

drop policy if exists "tests_insert_authorized" on public.tests;

create policy "tests_insert_authorized" on public.tests
for insert with check (
  auth.uid() is not null and (
    public.current_app_role() = 'admin'
    or (visibility = 'public' and public.has_app_permission('edit_public_exams'))
    or (visibility = 'private' and owner_user_id = auth.uid() and public.has_app_permission('edit_private_exams'))
  )
);
