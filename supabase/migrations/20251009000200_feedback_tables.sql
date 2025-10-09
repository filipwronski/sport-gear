-- ============================================================================
-- Migration: Feedback Tables
-- Description: Creates outfit feedback and shared outfits tables
-- Tables: outfit_feedbacks, shared_outfits
-- Dependencies: profiles, user_locations tables
-- ============================================================================

-- ============================================================================
-- table: outfit_feedbacks
-- description: user feedback after training, max 30 per user (trigger cleanup)
-- ============================================================================

create table outfit_feedbacks (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- foreign keys
  user_id uuid not null references profiles(id) on delete cascade,
  location_id uuid references user_locations(id) on delete set null,
  
  -- weather input parameters (for reconstruction of recommendation)
  temperature numeric(4,1) not null,
  feels_like numeric(4,1) not null,
  wind_speed numeric(5,2) not null check (wind_speed >= 0),
  humidity integer not null check (humidity between 0 and 100),
  rain_mm numeric(5,2) default 0 check (rain_mm >= 0),
  
  -- activity context
  activity_type text not null check (activity_type in ('recovery', 'spokojna', 'tempo', 'interwaly')),
  duration_minutes integer not null check (duration_minutes > 0),
  
  -- actual outfit (what user actually wore)
  -- structure: {
  --   "head": "czapka" | "opaska" | "buff" | "nic",
  --   "torso": {
  --     "base": "koszulka_kr" | "koszulka_dl" | "termo",
  --     "mid": "kurtka_lekka" | "softshell" | "nic",
  --     "outer": "kurtka_zimowa" | "wiatrowka" | "nic"
  --   },
  --   "arms": "rekawki" | "naramienniki" | "nic",
  --   "hands": "rekawiczki_zimowe" | "przejsciowe" | "letnie" | "nic",
  --   "legs": "dlugie" | "3/4" | "krotkie" | "getry",
  --   "feet": {
  --     "socks": "zimowe" | "letnie",
  --     "covers": "ochraniacze" | "nic"
  --   },
  --   "neck": "komin" | "buff" | "nic"
  -- }
  actual_outfit jsonb not null,
  
  -- feedback
  -- 1 = bardzo zimno, 2 = zimno, 3 = komfortowo, 4 = ciepło, 5 = bardzo gorąco
  overall_rating integer not null check (overall_rating between 1 and 5),
  
  -- optional per-zone ratings: {"head": 3, "hands": 2, ...}
  zone_ratings jsonb default '{}'::jsonb,
  
  notes text,
  
  -- community sharing
  shared_with_community boolean default false,
  
  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- indexes
create index idx_outfit_feedbacks_user_id on outfit_feedbacks(user_id);
create index idx_outfit_feedbacks_location_id on outfit_feedbacks(location_id);
create index idx_outfit_feedbacks_timeline on outfit_feedbacks(user_id, created_at desc);
-- Note: Removed partial index with now() as it's not IMMUTABLE
-- This index will be created without time filter for better compatibility
create index idx_outfit_feedbacks_recent on outfit_feedbacks(user_id, created_at desc);
create index idx_outfit_feedbacks_shared on outfit_feedbacks(user_id) 
  where shared_with_community = true;

-- comments
comment on table outfit_feedbacks is 'user feedback after training, max 30 per user (trigger cleanup), basis for ai personalization';
comment on column outfit_feedbacks.actual_outfit is 'jsonb storing what user actually wore (7 zones), not ai recommendation';
comment on column outfit_feedbacks.overall_rating is '1-5 scale: 1=very cold, 2=cold, 3=comfortable, 4=warm, 5=very hot';
comment on column outfit_feedbacks.zone_ratings is 'optional per-zone ratings in jsonb format';
comment on column outfit_feedbacks.shared_with_community is 'if true, trigger creates entry in shared_outfits';

-- ============================================================================
-- table: shared_outfits
-- description: community-shared outfits, anonymized, ttl 30 days, denormalized
-- ============================================================================

create table shared_outfits (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- foreign keys (user_id set null for gdpr)
  user_id uuid references profiles(id) on delete set null,
  feedback_id uuid unique references outfit_feedbacks(id) on delete cascade,
  
  -- denormalized user data (updated via triggers)
  user_pseudonym text not null,
  reputation_badge text not null,
  feedback_count integer not null,
  
  -- location for spatial queries
  location geography(point, 4326) not null,
  
  -- denormalized weather conditions
  -- structure: {
  --   "temperature": 10,
  --   "feels_like": 8,
  --   "wind_speed": 15,
  --   "humidity": 70,
  --   "rain_mm": 0
  -- }
  weather_conditions jsonb not null,
  
  -- activity context
  activity_type text not null,
  
  -- outfit (categories only, no brands)
  -- same structure as outfit_feedbacks.actual_outfit
  outfit jsonb not null,
  
  -- rating
  overall_rating integer not null check (overall_rating between 1 and 5),
  
  -- timestamps (ttl 30 days)
  created_at timestamptz default now()
);

-- indexes
create index idx_shared_outfits_user_id on shared_outfits(user_id);
create index idx_shared_outfits_feedback_id on shared_outfits(feedback_id);
create index idx_shared_outfits_geography on shared_outfits using gist(location);
create index idx_shared_outfits_community on shared_outfits(reputation_badge, created_at desc);
-- Note: Removed partial index with now() as it's not IMMUTABLE  
-- This index will be created without time filter for better compatibility
create index idx_shared_outfits_recent on shared_outfits(created_at desc);

-- comments
comment on table shared_outfits is 'community-shared outfits, anonymized, ttl 30 days, denormalized for performance';
comment on column shared_outfits.user_id is 'set null on user deletion for gdpr, pseudonym remains for community data integrity';
comment on column shared_outfits.weather_conditions is 'denormalized weather data to avoid joins in spatial queries';
comment on column shared_outfits.location is 'postgis geography point for 50km radius queries';
comment on column shared_outfits.outfit is 'jsonb with outfit categories only (no brand names), copied from feedback';

-- ============================================================================
-- enable row level security on all tables
-- ============================================================================

alter table outfit_feedbacks enable row level security;
alter table shared_outfits enable row level security;
