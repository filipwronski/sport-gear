-- ============================================================================
-- Migration: Service Tables
-- Description: Creates service-related tables (records, reminders, intervals)
-- Tables: service_records, service_reminders, default_service_intervals
-- Dependencies: bikes table from previous migration
-- ============================================================================

-- ============================================================================
-- table: service_records
-- description: service history for bikes, cascades on bike deletion
-- ============================================================================

create table service_records (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- foreign keys
  bike_id uuid not null references bikes(id) on delete cascade,
  
  -- service data
  service_date date not null default current_date,
  mileage_at_service integer not null check (mileage_at_service >= 0),
  
  -- service type (varchar for flexibility, check constraint for validation)
  service_type text not null check (service_type in (
    'lancuch', 'kaseta', 'klocki_przod', 'klocki_tyl', 
    'opony', 'przerzutki', 'hamulce', 'przeglad_ogolny', 'inne'
  )),
  
  -- location
  service_location text check (service_location in ('warsztat', 'samodzielnie')),
  
  -- cost (optional, pln only in mvp)
  cost numeric(10, 2) check (cost >= 0),
  currency text default 'PLN' check (currency = 'PLN'),
  
  -- notes
  notes text,
  
  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- indexes
create index idx_service_records_bike_id on service_records(bike_id);
create index idx_service_records_service_type on service_records(service_type);
create index idx_service_records_timeline on service_records(bike_id, service_date desc);
create index idx_service_records_mileage on service_records(bike_id, mileage_at_service desc);

-- comments
comment on table service_records is 'service history for bikes, cascades on bike deletion';
comment on column service_records.service_type is 'varchar instead of enum for flexibility, check constraint for validation';
comment on column service_records.cost is 'optional cost in pln (mvp), prepared for multi-currency in future';
comment on column service_records.mileage_at_service is 'mileage at time of service, no validation against previous records (too complex for mvp)';

-- ============================================================================
-- table: service_reminders
-- description: service reminders with soft complete, auto-creates new reminder
-- ============================================================================

create table service_reminders (
  -- primary key
  id uuid primary key default gen_random_uuid(),
  
  -- foreign keys
  bike_id uuid not null references bikes(id) on delete cascade,
  completed_service_id uuid references service_records(id) on delete set null,
  
  -- reminder config
  service_type text not null check (service_type in (
    'lancuch', 'kaseta', 'klocki_przod', 'klocki_tyl', 
    'opony', 'przerzutki', 'hamulce', 'przeglad_ogolny', 'inne'
  )),
  
  -- mileage tracking
  triggered_at_mileage integer not null check (triggered_at_mileage >= 0),
  interval_km integer not null check (interval_km > 0),
  -- generated column: triggered_at_mileage + interval_km
  target_mileage integer generated always as (triggered_at_mileage + interval_km) stored,
  
  -- completion (soft delete)
  completed_at timestamptz,
  
  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- indexes
create index idx_service_reminders_bike_id on service_reminders(bike_id);
create index idx_service_reminders_completed_service_id on service_reminders(completed_service_id);
create index idx_service_reminders_active on service_reminders(bike_id, completed_at) 
  where completed_at is null;
create index idx_service_reminders_target on service_reminders(bike_id, target_mileage) 
  where completed_at is null;

-- comments
comment on table service_reminders is 'service reminders with soft complete, auto-creates new reminder after completion';
comment on column service_reminders.target_mileage is 'generated column: triggered_at_mileage + interval_km, no manual updates needed';
comment on column service_reminders.completed_at is 'soft complete timestamp instead of delete, links to completed_service_id';

-- ============================================================================
-- table: default_service_intervals
-- description: lookup table for default service intervals
-- ============================================================================

create table default_service_intervals (
  -- primary key
  service_type text primary key check (service_type in (
    'lancuch', 'kaseta', 'klocki_przod', 'klocki_tyl', 
    'opony', 'przerzutki', 'hamulce', 'przeglad_ogolny', 'inne'
  )),
  
  -- default interval
  default_interval_km integer not null check (default_interval_km > 0),
  
  -- metadata
  description text,
  
  -- timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- seed data: default service intervals
insert into default_service_intervals (service_type, default_interval_km, description) values
  ('lancuch', 3000, 'wymiana łańcucha co 3000 km'),
  ('kaseta', 9000, 'wymiana kasety co 9000 km (3 łańcuchy)'),
  ('klocki_przod', 2000, 'klocki hamulcowe przód co 2000 km'),
  ('klocki_tyl', 2500, 'klocki hamulcowe tył co 2500 km'),
  ('opony', 4000, 'wymiana opon co 4000 km'),
  ('przerzutki', 10000, 'serwis przerzutek co 10000 km'),
  ('hamulce', 5000, 'przegląd hamulców co 5000 km'),
  ('przeglad_ogolny', 5000, 'przegląd ogólny co 5000 km'),
  ('inne', 5000, 'inne czynności co 5000 km');

-- comments
comment on table default_service_intervals is 'lookup table for default service intervals, editable by admin without deployment';

-- ============================================================================
-- enable row level security on all tables
-- ============================================================================

alter table service_records enable row level security;
alter table service_reminders enable row level security;
alter table default_service_intervals enable row level security;
