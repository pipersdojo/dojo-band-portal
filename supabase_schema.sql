-- Supabase schema for Dojo University Band Portal
-- Table: bands
create table bands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  admin_id uuid, -- will add FK after users table is created
  subscription_status text not null default 'inactive',
  created_at timestamptz default now()
);

-- Table: users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  band_id uuid references bands(id),
  role text not null check (role in ('admin', 'member')),
  kajabi_offer_id text,
  created_at timestamptz default now()
);

-- Alter bands table to add admin_id FK
alter table bands add constraint bands_admin_id_fkey foreign key (admin_id) references users(id);

-- Table: folders
create table folders (
  id uuid primary key default gen_random_uuid(),
  band_id uuid references bands(id) not null,
  name text not null,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- Table: lessons
create table lessons (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references folders(id) not null,
  soundslice_id text not null,
  title text not null,
  created_at timestamptz default now()
);

-- Table: custom_requests
create table custom_requests (
  id uuid primary key default gen_random_uuid(),
  band_id uuid references bands(id) not null,
  user_id uuid references users(id) not null,
  type text not null check (type in ('composition', 'conversion')),
  description text,
  status text not null default 'pending',
  created_at timestamptz default now()
);

-- RLS Policies (examples)
-- Enable RLS
alter table bands enable row level security;
alter table users enable row level security;
alter table folders enable row level security;
alter table lessons enable row level security;
alter table custom_requests enable row level security;

-- Example RLS: Only band admins can manage their band
create policy "Admins can manage their band" on bands
  for all using (auth.uid() = admin_id);

-- Example RLS: Users can see their own user row
create policy "Users can view their own profile" on users
  for select using (auth.uid() = id);

-- Example RLS: Band members can see their band's folders
create policy "Band members can view folders" on folders
  for select using (band_id = (select band_id from users where id = auth.uid()));

-- Example RLS: Band members can view lessons in their folders
create policy "Band members can view lessons" on lessons
  for select using (folder_id in (select id from folders where band_id = (select band_id from users where id = auth.uid())));

-- Example RLS: Band members can create custom requests for their band
create policy "Band members can create custom requests" on custom_requests
  for insert with check (band_id = (select band_id from users where id = auth.uid()));
