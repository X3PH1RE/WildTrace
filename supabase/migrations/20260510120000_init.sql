-- WildTrace core schema (aligned with architecture doc)

-- Species catalogue
create table if not exists public.species (
  id uuid primary key default gen_random_uuid(),
  common_name text not null,
  scientific_name text not null,
  rarity_tier text not null default 'Common',
  conservation_status text not null default 'Unknown',
  is_invasive boolean not null default false,
  ecological_role text,
  description text,
  created_at timestamptz not null default now()
);

-- App profile (1:1 with auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  avatar_url text,
  xp integer not null default 0,
  level integer not null default 1,
  streak integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sightings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  species_id uuid references public.species (id) on delete set null,
  image_url text not null,
  latitude double precision not null,
  longitude double precision not null,
  timestamp timestamptz not null,
  confidence double precision,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.individuals (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species (id) on delete cascade,
  embedding_reference text,
  last_seen timestamptz,
  known_locations jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.expert_reviews (
  id uuid primary key default gen_random_uuid(),
  sighting_id uuid not null references public.sightings (id) on delete cascade,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists sightings_user_id_idx on public.sightings (user_id);
create index if not exists sightings_species_id_idx on public.sightings (species_id);
create index if not exists sightings_created_at_idx on public.sightings (created_at desc);
create index if not exists expert_reviews_sighting_id_idx on public.expert_reviews (sighting_id);

alter table public.species enable row level security;
alter table public.users enable row level security;
alter table public.sightings enable row level security;
alter table public.individuals enable row level security;
alter table public.expert_reviews enable row level security;

-- Public read for species; inserts via service role or controlled policies
create policy "species_select_authenticated"
  on public.species for select
  to authenticated
  using (true);

create policy "users_select_own"
  on public.users for select
  to authenticated
  using (auth.uid() = id);

create policy "users_insert_own"
  on public.users for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  to authenticated
  using (auth.uid() = id);

create policy "sightings_select_authenticated"
  on public.sightings for select
  to authenticated
  using (true);

create policy "sightings_insert_own"
  on public.sightings for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "individuals_select_authenticated"
  on public.individuals for select
  to authenticated
  using (true);

create policy "expert_reviews_select_authenticated"
  on public.expert_reviews for select
  to authenticated
  using (true);

-- Storage: sightings bucket (private uploads; signed URLs from app)
insert into storage.buckets (id, name, public)
values ('sightings', 'sightings', false)
on conflict (id) do nothing;

create policy "sightings_upload_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'sightings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "sightings_read_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'sightings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
