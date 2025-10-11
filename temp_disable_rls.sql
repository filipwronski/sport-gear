-- Tymczasowe wyłączenie RLS dla testów API
-- UWAGA: Wykonaj tylko w środowisku deweloperskim!
-- Po testach włącz ponownie RLS

-- Wyłącz RLS na kluczowych tabelach
ALTER TABLE user_locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache DISABLE ROW LEVEL SECURITY;

-- Sprawdź status RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_locations', 'profiles', 'weather_cache')
ORDER BY tablename;