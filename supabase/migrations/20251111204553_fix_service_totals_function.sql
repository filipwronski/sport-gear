-- ============================================================================
-- Migration: Fix Service Totals Function
-- Description: Fix get_service_totals function to properly calculate mileage
-- Functions: get_service_totals
-- Dependencies: service_records table
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS get_service_totals(UUID, DATE, DATE);

-- Recreate function with fixed mileage calculation
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
    COUNT(*) as t_services
  INTO total_cost, total_services
  FROM service_records
  WHERE bike_id = p_bike_id
    AND service_date >= p_from_date
    AND service_date <= p_to_date;

  -- Calculate total mileage as difference between first and last service in period
  -- Get mileage from chronologically first and last records
  SELECT
    (SELECT mileage_at_service
     FROM service_records
     WHERE bike_id = p_bike_id
       AND service_date >= p_from_date
       AND service_date <= p_to_date
       AND mileage_at_service IS NOT NULL
     ORDER BY service_date ASC
     LIMIT 1) as first_mileage,
    (SELECT mileage_at_service
     FROM service_records
     WHERE bike_id = p_bike_id
       AND service_date >= p_from_date
       AND service_date <= p_to_date
       AND mileage_at_service IS NOT NULL
     ORDER BY service_date DESC
     LIMIT 1) as last_mileage
  INTO min_mileage, max_mileage;

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
