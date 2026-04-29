create table if not exists public.test_pdf_assets (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  section_name text,
  module_number integer,
  mode public.attempt_mode not null,
  asset_kind text not null default 'flattened_pdf',
  object_key text not null,
  file_name text not null,
  content_type text not null default 'application/pdf',
  sha256 text,
  file_size_bytes bigint,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint test_pdf_assets_mode_shape check (
    (mode = 'full' and section_name is null and module_number is null)
    or
    (mode = 'sectional' and section_name is not null)
  )
);

create unique index if not exists test_pdf_assets_active_unique_idx
on public.test_pdf_assets (
  test_id,
  mode,
  coalesce(section_name, ''),
  coalesce(module_number, -1),
  asset_kind
)
where is_active = true;

create index if not exists test_pdf_assets_lookup_idx
on public.test_pdf_assets (test_id, mode, section_name, module_number, is_active);

drop trigger if exists set_test_pdf_assets_updated_at on public.test_pdf_assets;
create trigger set_test_pdf_assets_updated_at
before update on public.test_pdf_assets
for each row execute function public.set_updated_at();

alter table public.test_pdf_assets enable row level security;

drop policy if exists "test_pdf_assets_read_authorized" on public.test_pdf_assets;
create policy "test_pdf_assets_read_authorized" on public.test_pdf_assets
for select using (
  public.current_app_role() = 'admin'
  or public.can_read_test(test_id)
);

drop policy if exists "test_pdf_assets_manage_admin" on public.test_pdf_assets;
create policy "test_pdf_assets_manage_admin" on public.test_pdf_assets
for all using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

create table if not exists public.test_pdf_download_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  test_id uuid not null references public.tests(id) on delete cascade,
  pdf_asset_id uuid references public.test_pdf_assets(id) on delete set null,
  mode public.attempt_mode not null,
  section_name text,
  module_number integer,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists test_pdf_download_events_user_created_idx
on public.test_pdf_download_events (user_id, created_at desc);

create index if not exists test_pdf_download_events_test_created_idx
on public.test_pdf_download_events (test_id, created_at desc);

alter table public.test_pdf_download_events enable row level security;

drop policy if exists "test_pdf_download_events_read_admin" on public.test_pdf_download_events;
create policy "test_pdf_download_events_read_admin" on public.test_pdf_download_events
for select using (public.current_app_role() = 'admin');

drop policy if exists "test_pdf_download_events_insert_authenticated" on public.test_pdf_download_events;
create policy "test_pdf_download_events_insert_authenticated" on public.test_pdf_download_events
for insert with check (auth.uid() = user_id or public.current_app_role() = 'admin');
