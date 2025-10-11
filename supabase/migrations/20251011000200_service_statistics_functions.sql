-- ============================================================================
-- Migration: Service Statistics Functions
-- Description: Creates helper functions for service record statistics
-- Functions: get_service_totals
-- Dependencies: service_records table
-- ============================================================================

-- ============================================================================
-- Function: get_service_totals
-- Description: Calculates total statistics for service records in date range
-- Parameters: p_bike_id (uuid), p_from_date (date), p_to_date (date)
-- Returns: total_cost, total_services, cost_per_km, total_mileage
-- ============================================================================

CREATE OR REPLACE FUNCTION get_service_totals(
  p_bike_id UUID,
  p_from_date DATE,
  p_to_date DATE
)
RETURNS TABLE(
  total_cost NUMERIC,
  total_services INTEGER,
  cost_per_km NUMERIC,
  total_mileage INTEGER
) AS $$
DECLARE
  min_mileage INTEGER;
  max_mileage INTEGER;
BEGIN
  -- Calculate aggregated statistics
  SELECT 
    COALESCE(SUM(cost), 0) as t_cost,
    COUNT(*) as t_services,
    MIN(mileage_at_service) as min_mile,
    MAX(mileage_at_service) as max_mile
  INTO total_cost, total_services, min_mileage, max_mileage
  FROM service_records
  WHERE bike_id = p_bike_id
    AND service_date >= p_from_date
    AND service_date <= p_to_date;

  -- Calculate total mileage and cost per km
  total_mileage := COALESCE(max_mileage - min_mileage, 0);
  
  IF total_mileage > 0 THEN
    cost_per_km := total_cost / total_mileage;
  ELSE
    cost_per_km := 0;
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_service_totals TO authenticated;

COMMENT ON FUNCTION get_service_totals IS 'Calculates total statistics for service records in date range';
