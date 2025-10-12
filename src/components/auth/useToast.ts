import { toast } from 'sonner';

// Types for toast messages
export interface ToastMessage {
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

// Centralized toast management for auth components
export const useToast = () => {
  const showToast = (message: ToastMessage) => {
    const { type, title, description } = message;

    switch (type) {
      case 'success':
        toast.success(title, {
          description,
          duration: 4000,
        });
        break;

      case 'error':
        toast.error(title, {
          description,
          duration: 6000,
          action: {
            label: 'Zamknij',
            onClick: () => {},
          },
        });
        break;

      case 'info':
        toast.info(title, {
          description,
          duration: 4000,
        });
        break;
    }
  };

  const clearToasts = () => {
    toast.dismiss();
  };

  return {
    showToast,
    clearToasts,
  };
};

// Auth-specific toast messages
export const authToastMessages = {
  // Login messages
  loginSuccess: {
    type: 'success' as const,
    title: 'Zalogowano pomyślnie!',
    description: 'Przekierowuję do dashboardu...',
  },

  loginError: {
    type: 'error' as const,
    title: 'Błąd logowania',
    description: 'Nieprawidłowy email lub hasło',
  },

  loginTooManyAttempts: {
    type: 'error' as const,
    title: 'Zbyt wiele prób logowania',
    description: 'Spróbuj ponownie za 15 minut',
  },

  // Register messages
  registerSuccess: {
    type: 'success' as const,
    title: 'Konto zostało utworzone!',
    description: 'Sprawdź swoją skrzynkę email i kliknij link weryfikacyjny',
  },

  registerEmailExists: {
    type: 'error' as const,
    title: 'Email już istnieje',
    description: 'Konto z tym adresem email już istnieje',
  },

  registerWeakPassword: {
    type: 'error' as const,
    title: 'Hasło zbyt słabe',
    description: 'Hasło musi zawierać co najmniej 8 znaków, wielką literę, małą literę i cyfrę',
  },

  // Reset password messages
  resetPasswordSuccess: {
    type: 'success' as const,
    title: 'Link został wysłany!',
    description: 'Sprawdź swoją skrzynkę email i kliknij link, aby zresetować hasło',
  },

  resetPasswordError: {
    type: 'error' as const,
    title: 'Błąd resetowania hasła',
    description: 'Wystąpił problem podczas wysyłania linku resetującego',
  },

  // Google OAuth messages
  googleAuthError: {
    type: 'error' as const,
    title: 'Błąd autoryzacji Google',
    description: 'Spróbuj ponownie lub użyj innej metody logowania',
  },

  // Network messages
  networkError: {
    type: 'error' as const,
    title: 'Brak połączenia',
    description: 'Sprawdź połączenie z internetem i spróbuj ponownie',
  },

  // Generic messages
  genericError: {
    type: 'error' as const,
    title: 'Wystąpił błąd',
    description: 'Spróbuj ponownie później',
  },
};
