-- Test Location API bez PostGIS functions
-- Tymczasowa wersja dla testowania podstawowej funkcjonalności

-- Sprawdź czy tabela user_locations istnieje
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'user_locations';

-- Sprawdź strukturę tabeli
\d user_locations;

-- Sprawdź czy funkcje RPC zostały utworzone
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('insert_location', 'update_location_coordinates');

-- Test prostego INSERT bez RPC
INSERT INTO user_locations (
  user_id, 
  location, 
  city, 
  country_code, 
  is_default, 
  label
) VALUES (
  'mock-user-id-12345'::uuid,
  ST_MakePoint(21.017, 52.237)::geography,
  'Warsaw',
  'PL',
  true,
  'Test Location'
);

-- Test SELECT z ekstraktowaniem współrzędnych
SELECT 
  id,
  city,
  country_code,
  is_default,
  label,
  created_at,
  updated_at,
  ST_Y(location::geometry) as latitude,
  ST_X(location::geometry) as longitude
FROM user_locations 
WHERE user_id = 'mock-user-id-12345'::uuid;
