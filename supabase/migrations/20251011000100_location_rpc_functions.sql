-- ============================================================================
-- Migration: Location RPC Functions
-- Description: Creates RPC functions for Location Management API
-- Functions: insert_location, update_location_coordinates
-- Dependencies: user_locations table, PostGIS extension
-- ============================================================================

-- ============================================================================
-- Function: insert_location
-- Description: Creates new location with PostGIS point
-- Parameters: user_id, latitude, longitude, city, country_code, is_default, label
-- Returns: UUID of created location
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_location(
  p_user_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_city TEXT,
  p_country_code TEXT,
  p_is_default BOOLEAN DEFAULT FALSE,
  p_label TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_location_id UUID;
BEGIN
  -- Insert new location with PostGIS point
  INSERT INTO user_locations (
    user_id,
    location,
    city,
    country_code,
    is_default,
    label
  ) VALUES (
    p_user_id,
    ST_MakePoint(p_longitude, p_latitude)::geography,
    p_city,
    p_country_code,
    p_is_default,
    p_label
  )
  RETURNING id INTO v_location_id;
  
  RETURN v_location_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: update_location_coordinates
-- Description: Updates location coordinates using PostGIS
-- Parameters: location_id, user_id, latitude, longitude
-- Returns: void
-- ============================================================================

CREATE OR REPLACE FUNCTION update_location_coordinates(
  p_location_id UUID,
  p_user_id UUID,
  p_latitude DECIMAL,
  p_longitude DECIMAL
) RETURNS VOID AS $$
BEGIN
  -- Update coordinates with PostGIS point
  UPDATE user_locations
  SET 
    location = ST_MakePoint(p_longitude, p_latitude)::geography,
    updated_at = NOW()
  WHERE id = p_location_id AND user_id = p_user_id;
  
  -- Check if row was actually updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Location not found or access denied';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function: get_location_coordinates
-- Description: Helper function to extract coordinates from PostGIS geography
-- Parameters: location_id, user_id
-- Returns: record with latitude and longitude
-- ============================================================================

CREATE OR REPLACE FUNCTION get_location_coordinates(
  p_location_id UUID,
  p_user_id UUID
) RETURNS TABLE(latitude DECIMAL, longitude DECIMAL) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ST_Y(location::geometry)::DECIMAL as latitude,
    ST_X(location::geometry)::DECIMAL as longitude
  FROM user_locations
  WHERE id = p_location_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Grant execute permissions to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION insert_location TO authenticated;
GRANT EXECUTE ON FUNCTION update_location_coordinates TO authenticated;
GRANT EXECUTE ON FUNCTION get_location_coordinates TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================

COMMENT ON FUNCTION insert_location IS 'Creates new location with PostGIS GEOGRAPHY point';
COMMENT ON FUNCTION update_location_coordinates IS 'Updates location coordinates using PostGIS';
COMMENT ON FUNCTION get_location_coordinates IS 'Helper function to extract coordinates from PostGIS geography';
