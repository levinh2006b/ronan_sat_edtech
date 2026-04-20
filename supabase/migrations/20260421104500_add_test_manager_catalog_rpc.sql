create or replace function public.get_test_manager_catalog_page(
  search_query text default '',
  search_scope text default 'testTitle',
  sort_option text default 'updated_desc',
  page_offset integer default 0,
  page_limit integer default 20
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with normalized as (
    select
      btrim(coalesce(search_query, '')) as query,
      case
        when search_scope in ('testTitle', 'passage', 'options') then search_scope
        else 'testTitle'
      end as scope,
      case
        when sort_option in ('updated_desc', 'updated_asc', 'test_asc', 'test_desc', 'question_asc', 'question_desc') then sort_option
        else 'updated_desc'
      end as sort,
      greatest(coalesce(page_offset, 0), 0) as page_offset,
      greatest(1, least(coalesce(page_limit, 20), 50)) as page_limit,
      case
        when btrim(coalesce(search_query, '')) ~ '^\d+$' then btrim(coalesce(search_query, ''))::integer
        else null
      end as question_number
  ),
  filtered_questions as (
    select
      q.id as question_id,
      t.id as test_id,
      t.title as test_title,
      ts.name as section_name,
      ts.module_number,
      q.position as question_number,
      q.question_type,
      q.difficulty,
      q.domain,
      q.skill,
      q.updated_at
    from public.questions q
    join public.test_sections ts on ts.id = q.section_id
    join public.tests t on t.id = ts.test_id
    cross join normalized n
    where t.visibility = 'public'
      and (
        n.query = ''
        or (
          (n.scope = 'testTitle' and t.title ilike '%' || n.query || '%')
          or (n.scope = 'passage' and coalesce(q.passage, '') ilike '%' || n.query || '%')
          or (
            n.scope = 'options'
            and exists (
              select 1
              from public.question_options qo
              where qo.question_id = q.id
                and qo.option_text ilike '%' || n.query || '%'
            )
          )
        )
        or (n.question_number is not null and q.position = n.question_number)
      )
  ),
  total_count as (
    select count(*)::integer as total
    from filtered_questions
  ),
  paged_rows as (
    select
      fq.*,
      row_number() over (
        order by
          case when n.sort = 'updated_asc' then fq.updated_at end asc,
          case when n.sort = 'updated_desc' then fq.updated_at end desc,
          case when n.sort = 'test_asc' then fq.test_title end asc,
          case when n.sort = 'test_desc' then fq.test_title end desc,
          case when n.sort = 'question_asc' then fq.question_number end asc,
          case when n.sort = 'question_desc' then fq.question_number end desc,
          fq.test_title asc,
          fq.section_name asc,
          coalesce(fq.module_number, 0) asc,
          fq.question_number asc,
          fq.question_id asc
      ) as row_order
    from filtered_questions fq
    cross join normalized n
  ),
  sliced_rows as (
    select pr.*
    from paged_rows pr
    cross join normalized n
    where pr.row_order > n.page_offset
      and pr.row_order <= n.page_offset + n.page_limit
  )
  select jsonb_build_object(
    'rows',
    coalesce(
      (
        select jsonb_agg(
          jsonb_strip_nulls(
            jsonb_build_object(
              'questionId', sr.question_id,
              'testId', sr.test_id,
              'testTitle', sr.test_title,
              'section', sr.section_name,
              'module', sr.module_number,
              'questionNumber', sr.question_number,
              'questionType', sr.question_type,
              'difficulty', sr.difficulty,
              'domain', sr.domain,
              'skill', sr.skill,
              'updatedAt', sr.updated_at
            )
          )
          order by sr.row_order
        )
        from sliced_rows sr
      ),
      '[]'::jsonb
    ),
    'total', (select total from total_count),
    'offset', (select page_offset from normalized),
    'limit', (select page_limit from normalized),
    'nextOffset', (select page_offset from normalized) + (select count(*) from sliced_rows),
    'hasMore', ((select page_offset from normalized) + (select count(*) from sliced_rows)) < (select total from total_count)
  );
$$;

grant execute on function public.get_test_manager_catalog_page(text, text, text, integer, integer) to authenticated;
grant execute on function public.get_test_manager_catalog_page(text, text, text, integer, integer) to service_role;
