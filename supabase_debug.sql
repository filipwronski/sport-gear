-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if trigger exists
SELECT trigger_name, event_object_table, event_manipulation 
FROM information_schema.triggers 
WHERE event_object_table = 'auth.users';

-- Check if trigger function exists
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'create_profile_for_user';

-- Check RLS policies on profiles
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Check current auth config
SELECT * FROM auth.config LIMIT 1;

-- Check if there are any existing users
SELECT COUNT(*) as user_count FROM auth.users;

-- Check if there are any profiles
SELECT COUNT(*) as profile_count FROM profiles;
