-- Supabase schema for Dojo University Band Portal (many-to-many band membership, lessons, folders)

create table bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_status text not null default 'inactive',
  created_at timestamptz default now(),
  code text unique,
  lesson_limit integer not null default 20
);

create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text,
  kajabi_offer_id text,
  created_at timestamptz default now()
);

create table band_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  band_id uuid not null references bands(id),
  role text not null check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  unique (user_id, band_id)
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  soundslice_id text not null,
  title text not null,
  created_at timestamptz default now(),
  is_public boolean not null default false,
  band_id uuid references bands(id)
);

create table band_lessons (
  band_id uuid not null references bands(id),
  lesson_id uuid not null references lessons(id),
  added_by uuid references users(id),
  added_at timestamptz default now(),
  primary key (band_id, lesson_id)
);

create table folders (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references bands(id),
  name text not null,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table folder_lessons (
  folder_id uuid not null references folders(id),
  lesson_id uuid not null references lessons(id),
  primary key (folder_id, lesson_id)
);

create table invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  band_id uuid references bands(id),
  role text not null,
  token text not null unique,
  created_at timestamptz default now(),
  used_at timestamptz,
  expires_at timestamptz,
  claimed boolean not null default false
);

create table custom_requests (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references bands(id),
  user_id uuid not null references users(id),
  type text not null check (type in ('composition', 'conversion')),
  description text,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- RLS Policies (updated for band_members)
-- Enable RLS
alter table bands enable row level security;
alter table users enable row level security;
alter table folders enable row level security;
alter table lessons enable row level security;
alter table custom_requests enable row level security;
alter table invitations enable row level security;
alter table band_members enable row level security;

-- Only band members can select their bands
create policy "Band members can view their bands" on bands
  for select using (exists (
    select 1 from band_members
    where band_members.band_id = bands.id
      and band_members.user_id = auth.uid()
  ));

-- Only band admins can manage their bands
create policy "Band admins can manage their bands" on bands
  for all using (exists (
    select 1 from band_members
    where band_members.band_id = bands.id
      and band_members.user_id = auth.uid()
      and band_members.role = 'admin'
  ));

-- Users can see their own user row
create policy "Users can view their own profile" on users
  for select using (auth.uid() = id);

-- Band members can view their band's folders
create policy "Band members can view folders" on folders
  for select using (exists (
    select 1 from band_members
    where band_members.band_id = folders.band_id
      and band_members.user_id = auth.uid()
  ));

-- Band members can view lessons in their folders
create policy "Band members can view lessons" on lessons
  for select using (exists (
    select 1 from band_members
    join folders on band_members.band_id = folders.band_id
    where folders.id = lessons.folder_id
      and band_members.user_id = auth.uid()
  ));

-- Band members can create custom requests for their band
create policy "Band members can create custom requests" on custom_requests
  for insert with check (exists (
    select 1 from band_members
    where band_members.band_id = custom_requests.band_id
      and band_members.user_id = auth.uid()
  ));

-- Band members can view invitations for their band
create policy "Band members can view invitations" on invitations
  for select using (exists (
    select 1 from band_members
    where band_members.band_id = invitations.band_id
      and band_members.user_id = auth.uid()
  ));
