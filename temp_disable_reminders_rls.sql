-- Temporary RLS disable for development testing
-- Execute in Supabase Dashboard SQL Editor (DEV ONLY!)

ALTER TABLE default_service_intervals DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_records DISABLE ROW LEVEL SECURITY;

-- Note: Re-enable after testing with:
-- ALTER TABLE default_service_intervals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE service_reminders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
