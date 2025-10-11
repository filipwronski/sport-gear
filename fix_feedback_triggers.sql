-- Fix for thermal adjustment trigger - remove ORDER BY from aggregate query
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
    -- count cold (rating 1-2) and hot (rating 4-5) feedbacks from last 30
    with recent_feedbacks as (
      select overall_rating
      from outfit_feedbacks
      where user_id = new.id
      order by created_at desc
      limit 30
    )
    select 
      count(*) filter (where overall_rating <= 2),
      count(*) filter (where overall_rating >= 4),
      count(*)
    into cold_count, hot_count, total_feedbacks
    from recent_feedbacks;
    
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

-- Fix for shared outfit trigger - handle NULL location_id
create or replace function create_shared_outfit_from_feedback()
returns trigger as $$
declare
  user_record record;
  location_point geography;
begin
  -- only if shared with community AND has location
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
    
    -- only proceed if location exists
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
