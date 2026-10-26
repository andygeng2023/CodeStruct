-- Sytely Production schema for cloud projects, collaboration, CMS, assets and form inbox.
-- Safe to run on the existing Sytely Production project; project records are preserved.
create table if not exists public.sytely_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Untitled website' check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  document jsonb not null default '{"nodes":[],"version":1}'::jsonb check (jsonb_typeof(document)='object'),
  published_document jsonb,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.sytely_projects add column if not exists revision bigint not null default 1;
alter table public.sytely_projects add column if not exists lease_owner uuid references auth.users(id) on delete set null;
alter table public.sytely_projects add column if not exists lease_expires_at timestamptz;
alter table public.sytely_projects enable row level security;
drop policy if exists "Owners can read their projects" on public.sytely_projects;
create policy "Owners can read their projects" on public.sytely_projects for select to authenticated using (owner_id=(select auth.uid()));
drop policy if exists "Owners can create their projects" on public.sytely_projects;
create policy "Owners can create their projects" on public.sytely_projects for insert to authenticated with check (owner_id=(select auth.uid()));
drop policy if exists "Owners can update their projects" on public.sytely_projects;
create policy "Owners can update their projects" on public.sytely_projects for update to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
drop policy if exists "Owners can delete their projects" on public.sytely_projects;
create policy "Owners can delete their projects" on public.sytely_projects for delete to authenticated using (owner_id=(select auth.uid()));

create table if not exists public.sytely_project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sytely_projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Saved version' check (char_length(label) between 1 and 120),
  document jsonb not null check (jsonb_typeof(document)='object'),
  created_at timestamptz not null default now()
);
create index if not exists sytely_project_versions_project_created_idx on public.sytely_project_versions(project_id,created_at desc);
alter table public.sytely_project_versions enable row level security;
drop policy if exists "Owners can read their project versions" on public.sytely_project_versions;
create policy "Owners can read their project versions" on public.sytely_project_versions for select to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.sytely_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
drop policy if exists "Owners can create project versions" on public.sytely_project_versions;
create policy "Owners can create project versions" on public.sytely_project_versions for insert to authenticated with check (owner_id=(select auth.uid()) and exists(select 1 from public.sytely_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
drop policy if exists "Owners can delete their project versions" on public.sytely_project_versions;
create policy "Owners can delete their project versions" on public.sytely_project_versions for delete to authenticated using (owner_id=(select auth.uid()) and exists(select 1 from public.sytely_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
grant select,insert,delete on public.sytely_project_versions to authenticated;

create table if not exists public.sytely_form_submissions (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.sytely_projects(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists sytely_form_submissions_rate_limit_idx on public.sytely_form_submissions(project_id,ip_hash,created_at desc);
alter table public.sytely_form_submissions enable row level security;
drop policy if exists "Owners can read their form submissions" on public.sytely_form_submissions;
create policy "Owners can read their form submissions" on public.sytely_form_submissions for select to authenticated using (exists(select 1 from public.sytely_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
drop policy if exists "Owners can delete their form submissions" on public.sytely_form_submissions;
create policy "Owners can delete their form submissions" on public.sytely_form_submissions for delete to authenticated using (exists(select 1 from public.sytely_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
revoke all on public.sytely_form_submissions from anon,authenticated;
grant select,delete on public.sytely_form_submissions to authenticated;

create table if not exists public.sytely_cms_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.sytely_projects(id) on delete cascade,
  collection text not null check (char_length(collection) between 1 and 80),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug)<=100),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body)<=20000),
  fields jsonb not null default '{}'::jsonb check (jsonb_typeof(fields)='object'),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id,collection,slug)
);
create index if not exists sytely_cms_items_public_idx on public.sytely_cms_items(project_id,collection,is_published,updated_at desc);
alter table public.sytely_cms_items enable row level security;
drop policy if exists "Owners manage CMS items" on public.sytely_cms_items;
create policy "Owners manage CMS items" on public.sytely_cms_items for all to authenticated using (exists(select 1 from public.sytely_projects p where p.id=project_id and p.owner_id=(select auth.uid()))) with check (exists(select 1 from public.sytely_projects p where p.id=project_id and p.owner_id=(select auth.uid())));
grant select,insert,update,delete on public.sytely_cms_items to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('sytely-assets','sytely-assets',true,10485760,array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif'])
on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Public can read Sytely assets" on storage.objects;
create policy "Public can read Sytely assets" on storage.objects for select using(bucket_id='sytely-assets');
drop policy if exists "Users can upload their own Sytely assets" on storage.objects;
create policy "Users can upload their own Sytely assets" on storage.objects for insert to authenticated with check(bucket_id='sytely-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users can update their own Sytely assets" on storage.objects;
create policy "Users can update their own Sytely assets" on storage.objects for update to authenticated using(bucket_id='sytely-assets' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='sytely-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "Users can delete their own Sytely assets" on storage.objects;
create policy "Users can delete their own Sytely assets" on storage.objects for delete to authenticated using(bucket_id='sytely-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.sytely_save_project_v2(p_project_id uuid,p_expected_revision bigint,p_document jsonb,p_name text,p_publish boolean default false,p_published_document jsonb default null)
returns table(ok boolean,current_revision bigint)
language plpgsql security invoker set search_path=public
as $$
declare v_user uuid:=auth.uid(); v_revision bigint;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if jsonb_typeof(p_document)<>'object' or char_length(p_name) not between 1 and 120 then raise exception 'Invalid project data' using errcode='22023'; end if;
 if p_publish and (p_published_document is null or jsonb_typeof(p_published_document)<>'object') then raise exception 'Published snapshot is required' using errcode='22023'; end if;
 select revision into v_revision from public.sytely_projects where id=p_project_id and owner_id=v_user for update;
 if not found then raise exception 'Project not found or access denied' using errcode='42501'; end if;
 if v_revision<>p_expected_revision then return query select false,v_revision; return; end if;
 update public.sytely_projects set document=p_document,name=p_name,revision=revision+1,updated_at=now(),is_published=case when p_publish then true else is_published end,published_document=case when p_publish then p_published_document else published_document end,published_at=case when p_publish then now() else published_at end where id=p_project_id returning revision into v_revision;
 return query select true,v_revision;
end $$;
revoke all on function public.sytely_save_project_v2(uuid,bigint,jsonb,text,boolean,jsonb) from public,anon;
grant execute on function public.sytely_save_project_v2(uuid,bigint,jsonb,text,boolean,jsonb) to authenticated;

create or replace function public.sytely_submit_form(p_project_id uuid,p_payload jsonb,p_ip_hash text)
returns boolean language plpgsql security definer set search_path=public
as $$
declare v_count integer;
begin
 if jsonb_typeof(p_payload)<>'object' or p_payload='{}'::jsonb or char_length(p_ip_hash) not between 1 and 128 then raise exception 'Invalid form submission' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_project_id::text||':'||p_ip_hash,0));
 if not exists(select 1 from public.sytely_projects where id=p_project_id and is_published=true) then raise exception 'Published site not found' using errcode='P0002'; end if;
 select count(*) into v_count from public.sytely_form_submissions where project_id=p_project_id and ip_hash=p_ip_hash and created_at>=now()-interval '10 minutes';
 if v_count>=5 then return false; end if;
 insert into public.sytely_form_submissions(project_id,payload,ip_hash) values(p_project_id,p_payload,p_ip_hash);
 return true;
end $$;
revoke all on function public.sytely_submit_form(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.sytely_submit_form(uuid,jsonb,text) to service_role;
