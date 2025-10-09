-- ============================================================================
-- Migration: Weather Cache
-- Description: Creates weather cache table for shared weather data
-- Tables: weather_cache
-- Dependencies: None
-- ============================================================================

-- ============================================================================
-- table: weather_cache
-- description: shared weather cache per location, ttl 30min/6h
-- ============================================================================

create table weather_cache (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- location key (unique identifier per location)
  -- format: "city_countrycode" e.g. "warsaw_pl" or geohash for precision
  location_key text not null unique,
  
  -- cached data
  -- structure from openweather api current weather data 2.5:
  -- {
  --   "temp": 10.5,
  --   "feels_like": 8.2,
  --   "humidity": 65,
  --   "wind_speed": 12.5,
  --   "wind_deg": 180,
  --   "weather": [{"main": "clouds", "description": "scattered clouds", "icon": "03d"}],
  --   "rain": {"1h": 0.5}
  -- }
  current_weather jsonb,
  
  -- structure: 7-day forecast array from openweather api
  forecast_data jsonb,
  
  -- ttl: 30min (current) / 6h (forecast)
  expires_at timestamptz not null,
  
  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- indexes
create unique index idx_weather_cache_location_key on weather_cache(location_key);
-- Note: Removed partial index with now() as it's not IMMUTABLE
-- This index will be created without time filter for better compatibility  
create index idx_weather_cache_valid on weather_cache(location_key, expires_at);
create index idx_weather_cache_expires on weather_cache(expires_at);

-- comments
comment on table weather_cache is 'shared weather cache per location, ttl 30min (current) / 6h (forecast)';
comment on column weather_cache.location_key is 'unique key per location: "city_countrycode" or geohash';
comment on column weather_cache.expires_at is 'ttl expiration, different for current (30min) vs forecast (6h)';

-- ============================================================================
-- enable row level security
-- ============================================================================

alter table weather_cache enable row level security;
