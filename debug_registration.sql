-- Debug script for registration issues

-- 1. Check trigger function definition
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'create_profile_for_user';

-- 2. Check RLS policies on profiles table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- 3. Temporarily disable RLS to test
-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 4. Test manual user creation
-- INSERT INTO auth.users (id, email, created_at, email_confirmed_at) 
-- VALUES (gen_random_uuid(), 'manual_test@example.com', NOW(), NOW());

-- 5. Check if profile was created
-- SELECT * FROM profiles WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'manual_test@example.com'
-- );

-- 6. Re-enable RLS if disabled
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 7. Check if there are any existing auth users
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- 8. Check if there are any profiles
SELECT COUNT(*) as profiles_count FROM profiles;
