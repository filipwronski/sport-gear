-- ============================================================================
-- Migration: Fix Shared Outfit Trigger
-- Description: Update create_shared_outfit_from_feedback trigger to handle NULL location_id
-- Date: 2025-11-09
-- ============================================================================

-- Update the trigger function to only create shared outfits when location_id is provided
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

-- Update comment
comment on function create_shared_outfit_from_feedback is 'auto-create shared_outfit entry when feedback is shared with community and location is provided';
