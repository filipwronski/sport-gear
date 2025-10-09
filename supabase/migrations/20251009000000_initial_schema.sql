-- ============================================================================
-- Migration: Initial Schema - Core Tables
-- Description: Creates core tables (profiles, user_locations, bikes) with 
--              PostGIS extension, indexes, and constraints
-- Tables: profiles, user_locations, bikes
-- Dependencies: Supabase Auth (auth.users), PostGIS extension
-- ============================================================================

-- enable postgis extension for spatial queries
create extension if not exists postgis;

-- ============================================================================
-- table: profiles
-- description: user profiles extending supabase auth with app-specific data
-- ============================================================================

create table profiles (
  -- primary key: 1:1 relationship with auth.users
  id uuid primary key references auth.users(id) on delete cascade,
  
  -- personal data
  display_name text,
  
  -- thermal preferences (from onboarding quiz)
  -- structure: {
  --   "general_feeling": "marzlak" | "neutralnie" | "szybko_mi_goraco",
  --   "cold_hands": true | false,
  --   "cold_feet": true | false,
  --   "cap_threshold_temp": 5 | 10 | 15 | 20
  -- }
  thermal_preferences jsonb default '{}'::jsonb,
  
  -- ai personalization
  thermal_adjustment numeric(3,1) default 0.0 check (thermal_adjustment between -2.0 and 2.0),
  feedback_count integer default 0 check (feedback_count >= 0),
  
  -- community settings
  pseudonym text unique,
  reputation_badge text default 'nowicjusz' check (reputation_badge in ('nowicjusz', 'regularny', 'ekspert', 'mistrz')),
  share_with_community boolean default true,
  
  -- user preferences
  units text default 'metric' check (units in ('metric', 'imperial')),
  
  -- location (fk to default location) - will be set after user_locations table exists
  default_location_id uuid,
  
  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- indexes
create index idx_profiles_reputation_badge on profiles(reputation_badge);
create index idx_profiles_pseudonym on profiles(pseudonym) where pseudonym is not null;

-- comments
comment on table profiles is 'user profiles extending supabase auth with app-specific data';
comment on column profiles.thermal_preferences is 'jsonb storing 4 quiz answers from onboarding';
comment on column profiles.thermal_adjustment is 'ai-calculated adjustment (-2°C to +2°C) based on feedback history';
comment on column profiles.feedback_count is 'total number of outfit feedbacks, used for reputation badge';
comment on column profiles.pseudonym is 'unique pseudonym for community sharing, auto-generated on first share';
comment on column profiles.reputation_badge is 'badge based on feedback_count: <10 nowicjusz, 10-50 regularny, 50-100 ekspert, >100 mistrz';

-- ============================================================================
-- table: user_locations
-- description: multiple locations per user (home, work, parents, weekends)
-- ============================================================================

create table user_locations (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key
  user_id uuid not null references profiles(id) on delete cascade,
  
  -- location data (postgis geography point)
  -- structure: st_makepoint(longitude, latitude)
  -- rounded to 3 decimal places (~100m accuracy for privacy)
  location geography(point, 4326) not null,
  
  city text not null,
  country_code text not null, -- iso 3166-1 alpha-2 (pl, de, etc.)
  
  -- settings
  is_default boolean default false,
  label text, -- optional: "dom", "praca", "rodzice"
  
  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- partial unique constraint: only one default location per user
create unique index unique_default_location_per_user 
  on user_locations(user_id, is_default) 
  where is_default = true;

-- indexes
create index idx_user_locations_user_id on user_locations(user_id);
create index idx_user_locations_geography on user_locations using gist(location);
create index idx_user_locations_default on user_locations(user_id) where is_default = true;

-- comments
comment on table user_locations is 'multiple locations per user for weather and community features';
comment on column user_locations.location is 'postgis geography point for spatial queries (50km radius)';
comment on column user_locations.is_default is 'only one default location per user, enforced by partial unique constraint and trigger';

-- ============================================================================
-- update profiles table with foreign key to user_locations
-- ============================================================================

alter table profiles
  add constraint fk_profiles_default_location
  foreign key (default_location_id)
  references user_locations(id)
  on delete set null;

create index idx_profiles_default_location on profiles(default_location_id);

-- ============================================================================
-- table: bikes
-- description: user bikes, supports multiple bikes per user, hard delete only
-- ============================================================================

create table bikes (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- foreign key
  user_id uuid not null references profiles(id) on delete cascade,
  
  -- basic info
  name text not null check (length(name) > 0 and length(name) <= 50),
  type text not null check (type in ('szosowy', 'gravelowy', 'mtb', 'czasowy')),
  purchase_date date,
  
  -- mileage
  current_mileage integer default 0 check (current_mileage >= 0),
  
  -- status
  status text default 'active' check (status in ('active', 'archived', 'sold')),
  
  -- optional
  notes text,
  
  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- indexes
create index idx_bikes_user_id on bikes(user_id);
create index idx_bikes_status on bikes(status);
create index idx_bikes_active on bikes(user_id, status) where status = 'active';

-- comments
comment on table bikes is 'user bikes, supports multiple bikes per user, hard delete only';
comment on column bikes.current_mileage is 'current total mileage in km, manually updated or auto-updated from service_records';
comment on column bikes.status is 'active (in use), archived (not used but kept), sold (historical only)';

-- ============================================================================
-- enable row level security on all tables
-- ============================================================================

alter table profiles enable row level security;
alter table user_locations enable row level security;
alter table bikes enable row level security;
