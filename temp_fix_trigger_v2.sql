-- NAPRAWA TRIGGERA v2 - BEZPIECZNIEJSZA WERSJA

-- Usuń istniejący trigger i funkcję
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_profile_for_user();

-- Stwórz funkcję z lepszą obsługą błędów
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_email TEXT;
    display_name TEXT;
BEGIN
    -- Pobierz email i nazwę użytkownika
    user_email := COALESCE(NEW.email, '');
    display_name := COALESCE(NEW.raw_user_meta_data->>'full_name', user_email);

    -- Sprawdź czy profil już istnieje (na wypadek duplikatów)
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = NEW.id) THEN
        -- Wstaw nowy profil
        INSERT INTO profiles (id, display_name, created_at, updated_at)
        VALUES (NEW.id, display_name, NOW(), NOW());

        RAISE LOG 'Profile created for user: %', NEW.id;
    ELSE
        RAISE LOG 'Profile already exists for user: %', NEW.id;
    END IF;

    RETURN NEW;

EXCEPTION
    WHEN OTHERS THEN
        -- Zaloguj błąd, ale nie przerywaj rejestracji użytkownika
        RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Stwórz trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_user();

-- Nadaj uprawnienia dla funkcji SECURITY DEFINER
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT SELECT ON auth.users TO service_role;

-- Sprawdź czy wszystko zostało utworzone
SELECT
    'Function exists: ' || EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_profile_for_user')::text,
    'Trigger exists: ' || EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')::text;

-- Test: sprawdź czy możemy wstawić do profiles (jako service_role)
-- To powinno być możliwe jeśli wszystko jest skonfigurowane prawidłowo
