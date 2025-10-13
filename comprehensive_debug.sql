-- Comprehensive debug script for Supabase registration issues

-- 1. Check if all required tables exist
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'bikes', 'user_locations', 'service_records', 'service_reminders', 'outfit_feedbacks', 'shared_outfits', 'weather_cache', 'default_service_intervals')
ORDER BY table_name;

-- 2. Check if PostGIS extension is available
SELECT name, default_version, installed_version 
FROM pg_available_extensions 
WHERE name = 'postgis';

-- 3. Check trigger function exists and is valid
SELECT 
    routine_name,
    routine_type,
    security_type
FROM information_schema.routines 
WHERE routine_name = 'create_profile_for_user';

-- 4. Check trigger exists on auth.users
SELECT 
    trigger_name,
    event_object_table,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'auth.users';

-- 5. Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles';

-- 6. Test if we can manually create a profile (with RLS disabled temporarily)
-- This will help isolate if the issue is with the trigger function or RLS
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- INSERT INTO auth.users (id, email, created_at, email_confirmed_at) 
-- VALUES (gen_random_uuid(), 'debug@example.com', NOW(), NOW());
-- SELECT * FROM profiles WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'debug@example.com'
-- );
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Check if there are any foreign key constraints that might be failing
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'profiles';

-- 8. Check current auth configuration in database
SELECT * FROM auth.config;

-- 9. Check if there are any existing auth hooks that might be interfering
SELECT * FROM auth.hooks;
