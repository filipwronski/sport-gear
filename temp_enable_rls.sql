-- WŁĄCZENIE RLS - PRZYWRÓĆ BEZPIECZEŃSTWO BAZY DANYCH
-- UWAGA: Wykonaj to PO przywróceniu autentyfikacji!

-- Włącz RLS na wszystkich tabelach z politykami RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bikes ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE outfit_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_service_intervals ENABLE ROW LEVEL SECURITY;

-- Sprawdź status RLS na wszystkich tabelach
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_locations', 'profiles', 'bikes', 'service_records', 'service_reminders', 'outfit_feedbacks', 'shared_outfits', 'weather_cache', 'default_service_intervals')
ORDER BY tablename;