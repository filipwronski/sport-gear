-- ROZWIĄZANIE: Utwórz mock profil bezpośrednio w Supabase Dashboard
-- 
-- Instrukcje:
-- 1. Otwórz Supabase Dashboard
-- 2. Przejdź do SQL Editor
-- 3. Wykonaj poniższe SQL:

-- Utwórz mock profil (service role ma pełne uprawnienia)
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
) 
ON CONFLICT (id) DO NOTHING; -- Nie błąd jeśli już istnieje

-- Sprawdź czy został utworzony
SELECT * FROM profiles WHERE id = '550e8400-e29b-41d4-a716-446655440000';
