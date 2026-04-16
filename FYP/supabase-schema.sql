-- Easy Job - minimal schema for saving CV & Cover Letters
-- Run this in Supabase Dashboard -> SQL Editor

-- 1) CV documents
create table if not exists public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'CV',
  template text,
  content_html text not null,
  draft_json jsonb,
  created_at timestamptz not null default now()
);image.png

-- 2) Cover letters
create table if not exists public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Cover Letter',
  content_text text not null,
  wizard_json jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.cv_documents enable row level security;
alter table public.cover_letters enable row level security;

-- Policies: user can CRUD their own rows
drop policy if exists "cv_select_own" on public.cv_documents;
create policy "cv_select_own" on public.cv_documents
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "cv_insert_own" on public.cv_documents;
create policy "cv_insert_own" on public.cv_documents
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "cv_update_own" on public.cv_documents;
create policy "cv_update_own" on public.cv_documents
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "cv_delete_own" on public.cv_documents;
create policy "cv_delete_own" on public.cv_documents
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "cl_select_own" on public.cover_letters;
create policy "cl_select_own" on public.cover_letters
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "cl_insert_own" on public.cover_letters;
create policy "cl_insert_own" on public.cover_letters
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "cl_update_own" on public.cover_letters;
create policy "cl_update_own" on public.cover_letters
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "cl_delete_own" on public.cover_letters;
create policy "cl_delete_own" on public.cover_letters
for delete
to authenticated
using (auth.uid() = user_id);

