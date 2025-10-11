-- INSTRUKCJE: Wykonaj w Supabase Dashboard → SQL Editor

-- 1. Utwórz użytkownika w auth.users (używając service role)
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    aud,
    role
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    '00000000-0000-0000-0000-000000000000',
    'mockuser@test.com',
    crypt('mockpassword123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    'authenticated',
    'authenticated'
);

-- 2. Utwórz profil
INSERT INTO profiles (
    id,
    display_name,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Mock Test User',
    NOW(),
    NOW()
);

-- 3. Sprawdź czy zostało utworzone
SELECT 'Auth User' as type, id, email FROM auth.users WHERE id = '550e8400-e29b-41d4-a716-446655440000'
UNION ALL
SELECT 'Profile' as type, id, display_name FROM profiles WHERE id = '550e8400-e29b-41d4-a716-446655440000';
