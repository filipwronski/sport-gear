-- ============================================================================
-- Migration: Triggers and Automations
-- Description: Creates all trigger functions and triggers for automation
-- Triggers: 11 total triggers for consistency and user experience
-- Dependencies: All previous tables and functions
-- ============================================================================

-- ============================================================================
-- trigger 1: auto-update updated_at timestamp
-- ============================================================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

comment on function update_updated_at_column is 'auto-update updated_at timestamp on every update';

-- apply to all tables with updated_at column
create trigger update_profiles_updated_at 
  before update on profiles
  for each row execute function update_updated_at_column();

create trigger update_user_locations_updated_at 
  before update on user_locations
  for each row execute function update_updated_at_column();

create trigger update_bikes_updated_at 
  before update on bikes
  for each row execute function update_updated_at_column();

create trigger update_service_records_updated_at 
  before update on service_records
  for each row execute function update_updated_at_column();

create trigger update_service_reminders_updated_at 
  before update on service_reminders
  for each row execute function update_updated_at_column();

create trigger update_outfit_feedbacks_updated_at 
  before update on outfit_feedbacks
  for each row execute function update_updated_at_column();

create trigger update_weather_cache_updated_at 
  before update on weather_cache
  for each row execute function update_updated_at_column();

create trigger update_default_service_intervals_updated_at 
  before update on default_service_intervals
  for each row execute function update_updated_at_column();

-- ============================================================================
-- trigger 2: auto-create profile on user registration
-- ============================================================================

create or replace function create_profile_for_user()
returns trigger as $$
begin
  insert into profiles (id, display_name, created_at, updated_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

comment on function create_profile_for_user is 'auto-create profile when user registers via supabase auth';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function create_profile_for_user();

-- ============================================================================
-- trigger 3: increment feedback count
-- ============================================================================

create or replace function increment_feedback_count()
returns trigger as $$
begin
  update profiles
  set feedback_count = feedback_count + 1
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

comment on function increment_feedback_count is 'auto-increment feedback_count in profiles when feedback is added';

create trigger on_outfit_feedback_insert
  after insert on outfit_feedbacks
  for each row
  execute function increment_feedback_count();

-- ============================================================================
-- trigger 4: update reputation badge
-- ============================================================================

create or replace function update_reputation_badge()
returns trigger as $$
declare
  new_badge text;
begin
  -- calculate badge based on feedback_count
  -- <10 nowicjusz, 10-50 regularny, 50-100 ekspert, >100 mistrz
  if new.feedback_count < 10 then
    new_badge := 'nowicjusz';
  elsif new.feedback_count < 50 then
    new_badge := 'regularny';
  elsif new.feedback_count < 100 then
    new_badge := 'ekspert';
  else
    new_badge := 'mistrz';
  end if;
  
  -- update if changed
  if new.reputation_badge != new_badge then
    new.reputation_badge := new_badge;
  end if;
  
  return new;
end;
$$ language plpgsql;

comment on function update_reputation_badge is 'auto-update reputation badge based on feedback_count';

create trigger on_profile_feedback_count_update
  before update of feedback_count on profiles
  for each row
  execute function update_reputation_badge();

-- ============================================================================
-- trigger 5: ensure pseudonym on first share
-- ============================================================================

create or replace function ensure_pseudonym_on_share()
returns trigger as $$
declare
  user_pseudonym text;
begin
  -- only process if sharing with community
  if new.shared_with_community = true then
    -- get user's pseudonym
    select pseudonym into user_pseudonym
    from profiles
    where id = new.user_id;
    
    -- generate pseudonym if doesn't exist
    if user_pseudonym is null then
      user_pseudonym := 'kolarz_' || substr(new.user_id::text, 1, 8);
      
      update profiles
      set pseudonym = user_pseudonym
      where id = new.user_id;
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

comment on function ensure_pseudonym_on_share is 'auto-generate pseudonym if user shares for the first time';

create trigger on_outfit_feedback_share
  before insert on outfit_feedbacks
  for each row
  execute function ensure_pseudonym_on_share();

-- ============================================================================
-- trigger 6: create shared outfit from feedback
-- ============================================================================

create or replace function create_shared_outfit_from_feedback()
returns trigger as $$
declare
  user_record record;
  location_point geography;
begin
  -- only if shared with community and location_id is provided
  if new.shared_with_community = true and new.location_id is not null then
    -- get user data (denormalized)
    select pseudonym, reputation_badge, feedback_count
    into user_record
    from profiles
    where id = new.user_id;

    -- get location geography
    select location into location_point
    from user_locations
    where id = new.location_id;

    -- only create shared outfit if location exists
    if location_point is not null then
      -- insert into shared_outfits
      insert into shared_outfits (
        user_id,
        feedback_id,
        user_pseudonym,
        reputation_badge,
        feedback_count,
        location,
        weather_conditions,
        activity_type,
        outfit,
        overall_rating,
        created_at
      ) values (
        new.user_id,
        new.id,
        user_record.pseudonym,
        user_record.reputation_badge,
        user_record.feedback_count,
        location_point,
        jsonb_build_object(
          'temperature', new.temperature,
          'feels_like', new.feels_like,
          'wind_speed', new.wind_speed,
          'humidity', new.humidity,
          'rain_mm', new.rain_mm
        ),
        new.activity_type,
        new.actual_outfit,
        new.overall_rating,
        new.created_at
      );
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

comment on function create_shared_outfit_from_feedback is 'auto-create shared_outfit entry when feedback is shared with community and location is provided';

create trigger on_outfit_feedback_create_shared
  after insert on outfit_feedbacks
  for each row
  execute function create_shared_outfit_from_feedback();

-- ============================================================================
-- trigger 7: auto-complete reminder on service
-- ============================================================================

create or replace function auto_complete_reminder_on_service()
returns trigger as $$
declare
  reminder_id uuid;
  default_interval integer;
begin
  -- find active reminder for this service type
  select id into reminder_id
  from service_reminders
  where bike_id = new.bike_id
    and service_type = new.service_type
    and completed_at is null
  limit 1;
  
  -- mark as completed
  if reminder_id is not null then
    update service_reminders
    set completed_at = now(),
        completed_service_id = new.id
    where id = reminder_id;
    
    -- get default interval for this service type
    select default_interval_km into default_interval
    from default_service_intervals
    where service_type = new.service_type;
    
    -- create new reminder
    if default_interval is not null then
      insert into service_reminders (
        bike_id,
        service_type,
        triggered_at_mileage,
        interval_km
      ) values (
        new.bike_id,
        new.service_type,
        new.mileage_at_service,
        default_interval
      );
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

comment on function auto_complete_reminder_on_service is 'auto-complete reminder and create new one when service is performed';

create trigger on_service_record_insert
  after insert on service_records
  for each row
  execute function auto_complete_reminder_on_service();

-- ============================================================================
-- trigger 8: update bike mileage on service
-- ============================================================================

create or replace function update_bike_mileage_on_service()
returns trigger as $$
begin
  -- update bike's current_mileage if service mileage is higher
  update bikes
  set current_mileage = greatest(current_mileage, new.mileage_at_service)
  where id = new.bike_id;
  
  return new;
end;
$$ language plpgsql security definer;

comment on function update_bike_mileage_on_service is 'auto-update bike current_mileage when service is added';

create trigger on_service_record_update_mileage
  after insert on service_records
  for each row
  execute function update_bike_mileage_on_service();

-- ============================================================================
-- trigger 9: enforce single default location
-- ============================================================================

create or replace function enforce_single_default_location()
returns trigger as $$
begin
  -- if setting as default, unset other defaults for this user
  if new.is_default = true then
    update user_locations
    set is_default = false
    where user_id = new.user_id
      and id != new.id
      and is_default = true;
    
    -- update profile's default_location_id
    update profiles
    set default_location_id = new.id
    where id = new.user_id;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

comment on function enforce_single_default_location is 'ensure only one default location per user';

create trigger on_user_location_set_default
  before insert or update on user_locations
  for each row
  when (new.is_default = true)
  execute function enforce_single_default_location();

-- ============================================================================
-- trigger 10: update thermal adjustment
-- ============================================================================

create or replace function update_thermal_adjustment()
returns trigger as $$
declare
  total_feedbacks integer;
  cold_count integer;
  hot_count integer;
  adjustment numeric;
begin
  -- only recalculate every 5 feedbacks
  if new.feedback_count % 5 = 0 and new.feedback_count >= 5 then
    -- count cold (rating 1-2) and hot (rating 4-5) feedbacks
    select 
      count(*) filter (where overall_rating <= 2),
      count(*) filter (where overall_rating >= 4),
      count(*)
    into cold_count, hot_count, total_feedbacks
    from outfit_feedbacks
    where user_id = new.id
    order by created_at desc
    limit 30;
    
    -- calculate adjustment
    if cold_count::float / total_feedbacks > 0.6 then
      -- user often cold: increase adjustment (+1 to +2°c)
      adjustment := least(2.0, 1.0 + (cold_count::float / total_feedbacks - 0.6) * 5);
    elsif hot_count::float / total_feedbacks > 0.6 then
      -- user often hot: decrease adjustment (-1 to -2°c)
      adjustment := greatest(-2.0, -1.0 - (hot_count::float / total_feedbacks - 0.6) * 5);
    else
      -- neutral: no adjustment
      adjustment := 0.0;
    end if;
    
    new.thermal_adjustment := adjustment;
  end if;
  
  return new;
end;
$$ language plpgsql;

comment on function update_thermal_adjustment is 'recalculate thermal adjustment every 5 feedbacks based on cold/hot ratings';

create trigger on_profile_recalculate_adjustment
  before update of feedback_count on profiles
  for each row
  execute function update_thermal_adjustment();

-- ============================================================================
-- trigger 11: cleanup old feedbacks (limit 30)
-- ============================================================================

create or replace function cleanup_old_feedbacks()
returns trigger as $$
begin
  -- delete feedbacks beyond the 30 most recent for this user
  delete from outfit_feedbacks
  where id in (
    select id
    from outfit_feedbacks
    where user_id = new.user_id
    order by created_at desc
    offset 30
  );
  
  return new;
end;
$$ language plpgsql security definer;

comment on function cleanup_old_feedbacks is 'automatically delete feedbacks beyond the 30 most recent per user';

create trigger on_outfit_feedback_limit
  after insert on outfit_feedbacks
  for each row
  execute function cleanup_old_feedbacks();
