# Plan implementacji widoku Auth

## 1. Przegląd
Widok Auth zapewnia kompleksowe rozwiązanie autentyfikacji dla aplikacji CycleGear, obsługując rejestrację, logowanie oraz reset hasła. Implementuje bezpieczny dostęp do aplikacji z wykorzystaniem Supabase Auth, zawierając zarówno tradycyjną rejestrację email/hasło, jak i nowoczesne rozwiązanie Google OAuth. Widok jest zaprojektowany zgodnie z zasadami mobile-first, zapewniając pełną responsywność i dostępność.

## 2. Routing widoku
Widok dostępny jest pod ścieżką `/auth/*` z następującymi sub-ścieżkami:
- `/auth/login` - strona logowania
- `/auth/register` - strona rejestracji  
- `/auth/reset-password` - strona resetowania hasła
- `/auth/callback` - callback dla Google OAuth (jeśli wymagany)

## 3. Struktura komponentów
```
AuthLayout (główny kontener z routingiem)
├── AuthTabs (przełącznik login/register)
│   ├── LoginForm
│   │   ├── EmailInput
│   │   ├── PasswordInput
│   │   ├── RememberMeCheckbox
│   │   ├── LoginButton
│   │   ├── ForgotPasswordLink
│   │   └── GoogleAuthButton
│   └── RegisterForm
│       ├── EmailInput
│       ├── PasswordInput
│       ├── ConfirmPasswordInput
│       ├── RegisterButton
│       └── GoogleAuthButton
└── ResetPasswordForm
    ├── EmailInput
    ├── ResetButton
    └── BackToLoginLink
```

## 4. Szczegóły komponentów

### AuthLayout
- **Opis**: Główny kontener widoku Auth, odpowiedzialny za routing sub-stron i zapewnienie spójnego layoutu. Implementuje zasadę mobile-first z responsywnym designem.
- **Główne elementy**: 
  - Container div z maksymalną szerokością
  - Logo aplikacji na górze
  - Główny obszar treści z AuthTabs lub ResetPasswordForm
  - Footer z linkami do polityki prywatności
- **Obsługiwane interakcje**: 
  - Automatyczne przekierowanie jeśli użytkownik już zalogowany
  - Obsługa callbacków OAuth
- **Obsługiwana walidacja**: Brak bezpośredniej walidacji, deleguje do komponentów dzieci
- **Typy**: `AuthLayoutProps`
- **Propsy**: `{ currentPath: string, onAuthSuccess: () => void }`

### AuthTabs
- **Opis**: Komponent przełączający między formularzami logowania i rejestracji. Zapewnia płynne przejścia między zakładkami z zachowaniem stanu formularzy.
- **Główne elementy**: 
  - Tabs container z shadcn/ui
  - Tab "Zaloguj się" i "Zarejestruj się"
  - Conditional rendering LoginForm/RegisterForm
- **Obsługiwane interakcje**: 
  - Kliknięcie na zakładki
  - Zachowanie danych formularza przy przełączaniu
- **Obsługiwana walidacja**: Brak
- **Typy**: `AuthTabsProps`
- **Propsy**: `{ activeTab: 'login' | 'register', onTabChange: (tab) => void }`

### LoginForm
- **Opis**: Formularz logowania z obsługą email/hasło oraz Google OAuth. Implementuje ochronę przed brute-force i walidację pól.
- **Główne elementy**: 
  - Form container z react-hook-form
  - Email input z walidacją formatu
  - Password input z toggle widoczności
  - Checkbox "Zapamiętaj mnie"
  - Primary button "Zaloguj się"
  - Link "Zapomniałeś hasła?"
  - Google OAuth button
  - Error messages display
- **Obsługiwane interakcje**: 
  - Submit formularza
  - Toggle hasła
  - Checkbox remember me
  - Link do reset hasła
  - Google OAuth click
- **Obsługiwana walidacja**: 
  - Email: wymagany, prawidłowy format email
  - Password: wymagane, minimum 8 znaków
  - Blokada po 5 nieudanych próbach (15 minut)
- **Typy**: `LoginFormData`, `LoginFormProps`
- **Propsy**: `{ onSuccess: () => void, onForgotPassword: () => void }`

### RegisterForm
- **Opis**: Formularz rejestracji obsługujący zarówno email/hasło jak i Google OAuth. Przeprowadza kompleksową walidację danych wejściowych.
- **Główne elementy**: 
  - Form container z react-hook-form
  - Email input z walidacją formatu i unikalności
  - Password input z wymaganiami siły
  - Confirm password input
  - Primary button "Zarejestruj się"
  - Google OAuth button
  - Error messages i success states
- **Obsługiwane interakcje**: 
  - Submit formularza
  - Real-time walidacja siły hasła
  - Google OAuth click
- **Obsługiwana walidacja**: 
  - Email: wymagany, prawidłowy format, unikalność
  - Password: min 8 znaków, wielka litera, mała litera, cyfra
  - Confirm password: musi być identyczne z password
- **Typy**: `RegisterFormData`, `RegisterFormProps`
- **Propsy**: `{ onSuccess: () => void }`

### ResetPasswordForm
- **Opis**: Formularz resetowania hasła wysyłający link resetujący na email użytkownika.
- **Główne elementy**: 
  - Form container
  - Email input
  - Primary button "Wyślij link resetujący"
  - Success message po wysłaniu
  - Link powrotu do logowania
- **Obsługiwane interakcje**: 
  - Submit formularza
  - Link powrotu do logowania
- **Obsługiwana walidacja**: 
  - Email: wymagany, prawidłowy format email
- **Typy**: `ResetPasswordFormData`, `ResetPasswordFormProps`
- **Propsy**: `{ onSuccess: () => void, onBack: () => void }`

### GoogleAuthButton
- **Opis**: Przycisk inicjalizujący proces Google OAuth. Obsługuje loading states i error handling.
- **Główne elementy**: 
  - Button z ikoną Google
  - Loading spinner podczas przetwarzania
  - Error state display
- **Obsługiwane interakcje**: 
  - Kliknięcie przycisku
  - Obsługa popup OAuth
- **Obsługiwana walidacja**: Brak
- **Typy**: `GoogleAuthButtonProps`
- **Propsy**: `{ isLoading: boolean, onSuccess: () => void, onError: (error) => void }`

## 5. Typy

### Form Data Types
```typescript
interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface ResetPasswordFormData {
  email: string;
}
```

### Component Props Types
```typescript
interface AuthLayoutProps {
  currentPath: string;
  onAuthSuccess: () => void;
}

interface AuthTabsProps {
  activeTab: 'login' | 'register';
  onTabChange: (tab: 'login' | 'register') => void;
}

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
}

interface RegisterFormProps {
  onSuccess: () => void;
}

interface ResetPasswordFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

interface GoogleAuthButtonProps {
  isLoading: boolean;
  onSuccess: () => void;
  onError: (error: string) => void;
}
```

### Auth State Types
```typescript
interface AuthState {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

interface AuthHookReturn {
  authState: AuthState;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  resetPassword: (data: ResetPasswordFormData) => Promise<void>;
  googleAuth: () => Promise<void>;
  clearError: () => void;
}
```

## 6. Zarządzanie stanem
Widok wykorzystuje customowy hook `useAuth` do zarządzania stanem autentyfikacji. Hook integruje się z Supabase Auth i zapewnia:

- **Loading states**: Dla wszystkich async operations (login, register, reset password, OAuth)
- **Error handling**: Centralne zarządzanie błędami z tłumaczeniem na komunikaty użytkownika
- **Success states**: Potwierdzenia wysłania emaili resetujących
- **Form state**: Zarządzanie stanem formularzy z react-hook-form
- **Redirect logic**: Automatyczne przekierowanie po udanej autentyfikacji

Hook `useAuth` izoluje logikę biznesową od komponentów UI, umożliwiając łatwe testowanie i reużycie.

## 7. Integracja API
Widok integruje się bezpośrednio z Supabase Auth SDK poprzez `supabaseClient`. Wszystkie operacje są asynchroniczne i zwracają Promise:

- **Rejestracja**: `supabase.auth.signUp({ email, password })`
  - Request: `{ email: string, password: string }`
  - Response: `{ user, session, error }` - wymaga email verification
  
- **Logowanie**: `supabase.auth.signInWithPassword({ email, password })`
  - Request: `{ email: string, password: string }`
  - Response: `{ user, session, error }`
  
- **Google OAuth**: `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
  - Request: `{ provider: 'google', options: { redirectTo: string } }`
  - Response: Redirect do Google OAuth
  
- **Reset hasła**: `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
  - Request: `{ email: string, redirectTo: string }`
  - Response: Wysyłka emaila z linkiem resetującym

Wszystkie błędy są obsługiwane przez centralny error handler z tłumaczeniem na polskie komunikaty.

## 8. Interakcje użytkownika
1. **Przejście między zakładkami**: Kliknięcie "Zaloguj się" / "Zarejestruj się" przełącza formularze bez utraty danych
2. **Logowanie**: Wypełnienie email/password → submit → przekierowanie do dashboardu lub błąd
3. **Rejestracja**: Wypełnienie wszystkich pól → submit → wysłanie emaila weryfikacyjnego → komunikat sukcesu
4. **Google OAuth**: Kliknięcie przycisku → popup OAuth → automatyczne utworzenie konta → przekierowanie
5. **Reset hasła**: Wypełnienie email → submit → komunikat o wysłaniu linku → przekierowanie do logowania
6. **Walidacja realtime**: Błędy walidacji wyświetlane natychmiast po opuszczeniu pola
7. **Loading states**: Spinner podczas przetwarzania, disabled button podczas submit

## 9. Warunki i walidacja
- **Email validation**: Regex pattern + HTML5 email input type
- **Password strength**: Minimum 8 znaków, przynajmniej jedna wielka litera, mała litera i cyfra
- **Confirm password**: Porównanie z polem password w czasie rzeczywistym
- **Brute force protection**: Licznik nieudanych prób w localStorage, blokada 15 minut po 5 próbach
- **Unikalność email**: Sprawdzana po stronie Supabase podczas rejestracji
- **Required fields**: Wszystkie pola oznaczone jako wymagane z wizualną indykacją

## 10. Obsługa błędów
- **Network errors**: Toast z komunikatem "Brak połączenia z internetem. Spróbuj ponownie."
- **Invalid credentials**: "Nieprawidłowy email lub hasło"
- **Email exists**: "Konto z tym adresem email już istnieje"
- **Weak password**: Szczegółowy opis wymagań siły hasła
- **Rate limiting**: "Zbyt wiele prób. Spróbuj ponownie za 15 minut"
- **OAuth errors**: "Błąd autoryzacji Google. Spróbuj ponownie."
- **Email verification**: "Sprawdź swoją skrzynkę email i kliknij link weryfikacyjny"
- **Generic fallback**: "Wystąpił błąd. Spróbuj ponownie później."

## 11. Kroki implementacji
1. **Utworzenie struktury plików**: `src/pages/auth/[...slug].astro`, `src/components/auth/`
2. **Implementacja AuthLayout**: Główny kontener z routingiem Astro
3. **Utworzenie hooka useAuth**: Centralne zarządzanie stanem i integracja z Supabase
4. **Implementacja AuthTabs**: Komponent przełączający z shadcn/ui Tabs
5. **Budowa LoginForm**: Formularz z react-hook-form i walidacją
6. **Budowa RegisterForm**: Formularz rejestracji z porównaniem haseł
7. **Implementacja ResetPasswordForm**: Prosty formularz email
8. **Dodanie GoogleAuthButton**: Komponent OAuth z obsługą popup
9. **Integracja walidacji**: Reguły walidacji dla wszystkich formularzy
10. **Obsługa błędów**: Centralny error handler z polskimi komunikatami
11. **Responsywność**: Mobile-first design z Tailwind CSS
12. **Dostępność**: ARIA labels, keyboard navigation, screen reader support
13. **Testowanie**: Unit tests dla hooków, integration tests dla formularzy
14. **SEO i performance**: Meta tags, lazy loading, code splitting
