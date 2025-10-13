-- DEBUG: Sprawdź wszystko związane z triggerem i tabelami

-- 1. Sprawdź czy tabela profiles istnieje
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
) as profiles_exists;

-- 2. Sprawdź strukturę tabeli profiles
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Sprawdź czy funkcja istnieje
SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_profile_for_user'
) as function_exists;

-- 4. Sprawdź szczegóły funkcji
SELECT
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments,
    pg_get_function_result(oid) as return_type,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'create_profile_for_user';

-- 5. Sprawdź czy trigger istnieje
SELECT
    trigger_name,
    event_manipulation,
    event_object_schema,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 6. Sprawdź uprawnienia na tabeli profiles
SELECT
    grantee,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY grantee, privilege_type;

-- 7. Testuj ręcznie wstawienie do profiles (jeśli tabela istnieje)
-- SELECT id FROM auth.users LIMIT 1; -- żeby zobaczyć przykładowego użytkownika
