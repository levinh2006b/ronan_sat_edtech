create or replace function public.get_user_dashboard_overview(target_user_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with user_attempts as (
    select
      ta.id,
      ta.mode,
      ta.score,
      ta.total_score,
      ta.reading_score,
      ta.math_score,
      ta.submitted_at,
      ts.name as sectional_subject,
      ts.module_number as sectional_module
    from public.test_attempts ta
    left join public.test_sections ts on ts.id = ta.section_id
    where ta.user_id = target_user_id
  ),
  completed_attempts as (
    select ua.*
    from user_attempts ua
    where exists (
      select 1
      from public.attempt_answers aa
      where aa.attempt_id = ua.id
    )
  ),
  stats as (
    select
      count(*)::int as tests_taken,
      coalesce(max(coalesce(total_score, score)) filter (where mode = 'full'), 0)::int as highest_score
    from completed_attempts
  ),
  activity as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'dateKey', day_key,
          'count', day_count
        )
        order by day_key
      ),
      '[]'::jsonb
    ) as days
    from (
      select
        to_char(date_trunc('day', submitted_at), 'YYYY-MM-DD') as day_key,
        count(*)::int as day_count
      from completed_attempts
      where submitted_at >= date_trunc('day', now()) - interval '29 days'
      group by 1
    ) activity_days
  ),
  recent_results as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          '_id', id,
          'createdAt', submitted_at,
          'score', score,
          'totalScore', total_score,
          'readingScore', reading_score,
          'mathScore', math_score,
          'isSectional', mode = 'sectional',
          'sectionalSubject', sectional_subject,
          'sectionalModule', sectional_module
        )
        order by submitted_at desc
      ),
      '[]'::jsonb
    ) as results
    from (
      select *
      from completed_attempts
      order by submitted_at desc
      limit 5
    ) recent_attempts
  ),
  trend as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'dateKey', day_key,
          'score', best_score,
          'tests', tests
        )
        order by day_key
      ),
      '[]'::jsonb
    ) as points
    from (
      select
        to_char(date_trunc('day', submitted_at), 'YYYY-MM-DD') as day_key,
        max(coalesce(total_score, score))::int as best_score,
        count(*)::int as tests
      from completed_attempts
      where mode = 'full'
        and submitted_at >= date_trunc('day', now()) - interval '29 days'
        and coalesce(total_score, score) is not null
      group by 1
    ) trend_days
  )
  select jsonb_build_object(
    'userStats', jsonb_build_object(
      'testsTaken', stats.tests_taken,
      'highestScore', stats.highest_score
    ),
    'activity', activity.days,
    'recentResults', recent_results.results,
    'trend', trend.points
  )
  from stats, activity, recent_results, trend;
$$;

grant execute on function public.get_user_dashboard_overview(uuid) to authenticated;
grant execute on function public.get_user_dashboard_overview(uuid) to service_role;
