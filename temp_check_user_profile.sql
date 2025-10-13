-- SPRAWDŹ PROFIL ZALOGOWANEGO UŻYTKOWNIKA
-- Zamień USER_ID_HERE na prawdziwe userId z sesji Supabase

-- Najpierw znajdź ID zalogowanego użytkownika
SELECT auth.uid() as current_user_id;

-- Sprawdź czy użytkownik ma profil
SELECT
  p.id,
  p.display_name,
  p.default_location_id,
  p.created_at
FROM profiles p
WHERE p.id = auth.uid();

-- Jeśli nie ma profilu, utwórz go
INSERT INTO profiles (id, display_name, created_at, updated_at)
SELECT
  auth.uid(),
  COALESCE(
    (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'Użytkownik'
  ),
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid()
);

-- Sprawdź ponownie po utworzeniu
SELECT
  p.id,
  p.display_name,
  p.default_location_id,
  p.created_at
FROM profiles p
WHERE p.id = auth.uid();
