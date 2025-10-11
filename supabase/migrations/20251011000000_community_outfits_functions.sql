-- ============================================================================
-- Migration: Community Outfits RPC Functions
-- Description: Creates PostgreSQL functions for spatial community queries
-- Functions: get_community_outfits, get_community_outfits_count, extract_coordinates
-- Dependencies: shared_outfits table, PostGIS extension
-- ============================================================================

-- ============================================================================
-- Function: extract_coordinates
-- Description: Helper function to extract lat/lng from PostGIS geography point
-- ============================================================================

CREATE OR REPLACE FUNCTION extract_coordinates(location_point geography)
RETURNS TABLE (
  latitude numeric,
  longitude numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ST_Y(location_point::geometry) as latitude,
    ST_X(location_point::geometry) as longitude;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION extract_coordinates IS 'Extract latitude and longitude from PostGIS geography point';

-- ============================================================================
-- Function: get_community_outfits_count
-- Description: Count total outfits matching spatial and filter criteria
-- ============================================================================

CREATE OR REPLACE FUNCTION get_community_outfits_count(
  center_lng numeric,
  center_lat numeric,
  radius_meters integer,
  time_range_hours integer,
  temperature numeric DEFAULT NULL,
  temperature_range integer DEFAULT 3,
  activity_type text DEFAULT NULL,
  min_rating integer DEFAULT NULL,
  reputation_filter text DEFAULT NULL
)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM shared_outfits so
    WHERE 
      -- Spatial filter (primary - most selective)
      ST_DWithin(
        so.location, 
        ST_MakePoint(center_lng, center_lat)::geography, 
        radius_meters
      )
      -- Time range filter
      AND so.created_at > NOW() - (time_range_hours || ' hours')::interval
      -- Temperature filter (if provided)
      AND (
        temperature IS NULL OR 
        (so.weather_conditions->>'temperature')::numeric 
          BETWEEN temperature - temperature_range AND temperature + temperature_range
      )
      -- Activity type filter (if provided)
      AND (activity_type IS NULL OR so.activity_type = activity_type)
      -- Min rating filter (if provided)
      AND (min_rating IS NULL OR so.overall_rating >= min_rating)
      -- Reputation filter (if provided)
      AND (reputation_filter IS NULL OR so.reputation_badge = reputation_filter)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_community_outfits_count IS 'Count community outfits matching spatial and filter criteria for pagination';

-- ============================================================================
-- Function: get_community_outfits
-- Description: Main spatial query for community outfits with all filters
-- ============================================================================

CREATE OR REPLACE FUNCTION get_community_outfits(
  center_lng numeric,
  center_lat numeric,
  radius_meters integer,
  time_range_hours integer,
  temperature numeric DEFAULT NULL,
  temperature_range integer DEFAULT 3,
  activity_type text DEFAULT NULL,
  min_rating integer DEFAULT NULL,
  reputation_filter text DEFAULT NULL,
  sort_by text DEFAULT 'reputation',
  result_limit integer DEFAULT 10,
  result_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_pseudonym text,
  reputation_badge text,
  feedback_count integer,
  distance_km numeric,
  weather_conditions jsonb,
  outfit_activity_type text,
  outfit jsonb,
  overall_rating integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    so.user_pseudonym,
    so.reputation_badge,
    so.feedback_count,
    ROUND((ST_Distance(
      so.location, 
      ST_MakePoint(center_lng, center_lat)::geography
    ) / 1000)::numeric, 1) as distance_km,
    so.weather_conditions,
    so.activity_type as outfit_activity_type,
    so.outfit,
    so.overall_rating,
    so.created_at
  FROM shared_outfits so
  WHERE 
    -- Spatial filter (primary - most selective)
    ST_DWithin(
      so.location, 
      ST_MakePoint(center_lng, center_lat)::geography, 
      radius_meters
    )
    -- Time range filter
    AND so.created_at > NOW() - (time_range_hours || ' hours')::interval
    -- Temperature filter (if provided)
    AND (
      temperature IS NULL OR 
      (so.weather_conditions->>'temperature')::numeric 
        BETWEEN temperature - temperature_range AND temperature + temperature_range
    )
    -- Activity type filter (if provided)
    AND (activity_type IS NULL OR so.activity_type = activity_type)
    -- Min rating filter (if provided)
    AND (min_rating IS NULL OR so.overall_rating >= min_rating)
    -- Reputation filter (if provided)
    AND (reputation_filter IS NULL OR so.reputation_badge = reputation_filter)
  ORDER BY 
    CASE 
      WHEN sort_by = 'reputation' THEN 
        CASE so.reputation_badge
          WHEN 'mistrz' THEN 1
          WHEN 'ekspert' THEN 2
          WHEN 'regularny' THEN 3
          WHEN 'nowicjusz' THEN 4
        END
      WHEN sort_by = 'distance' THEN distance_km::integer
      WHEN sort_by = 'rating' THEN -so.overall_rating
      ELSE NULL
    END,
    so.created_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_community_outfits IS 'Get community outfits with spatial filtering, advanced filters, sorting and pagination';

-- ============================================================================
-- Grant permissions to authenticated users
-- ============================================================================

-- Grant EXECUTE permissions to authenticated role
GRANT EXECUTE ON FUNCTION extract_coordinates TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_outfits_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_community_outfits TO authenticated;

-- ============================================================================
-- Performance optimization notes
-- ============================================================================

-- These functions leverage existing indexes:
-- 1. idx_shared_outfits_geography (GIST) - for ST_DWithin spatial queries
-- 2. idx_shared_outfits_community (reputation_badge, created_at DESC) - for sorting
-- 3. idx_shared_outfits_recent (created_at DESC) - for time filtering
--
-- Expected query performance:
-- - p50: < 100ms for 50km radius
-- - p95: < 300ms for 50km radius  
-- - p99: < 500ms for 50km radius
--
-- The spatial filter (ST_DWithin) is applied first as it's most selective,
-- followed by time range and other filters in order of selectivity.
