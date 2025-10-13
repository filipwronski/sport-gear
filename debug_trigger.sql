-- Check if trigger exists
SELECT 
    trigger_name, 
    event_object_table, 
    event_manipulation, 
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if profiles table exists and has correct structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Test trigger function manually (replace with actual user ID)
-- First, let's see what happens when we try to insert manually
-- INSERT INTO auth.users (id, email, created_at, email_confirmed_at) 
-- VALUES (gen_random_uuid(), 'debug@example.com', NOW(), NOW());

-- Then check if profile was created:
-- SELECT * FROM profiles WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'debug@example.com'
-- );
