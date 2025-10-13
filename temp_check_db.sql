-- Sprawdź czy tabela profiles istnieje
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
);

-- Sprawdź strukturę tabeli profiles jeśli istnieje
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Sprawdź czy trigger on_auth_user_created istnieje
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'users'
AND trigger_name = 'on_auth_user_created';

-- Sprawdź ostatnie błędy w logach (jeśli dostępne)
SELECT * FROM auth.audit_log_entries
ORDER BY created_at DESC
LIMIT 5;
