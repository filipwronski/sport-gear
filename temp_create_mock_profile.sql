-- STWÓRZ PROFIL DLA MOCK USERA
-- Mock user ID używany w middleware: 550e8400-e29b-41d4-a716-446655440000

INSERT INTO profiles (id, display_name, created_at, updated_at)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Mock User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Sprawdź czy profil został utworzony
SELECT id, display_name, default_location_id
FROM profiles
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
