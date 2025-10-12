import { useState, useCallback } from 'react';
import { supabaseClient } from '../../db/supabase.client';
import type { AuthError } from '@supabase/supabase-js';
import { useToast, authToastMessages, type ToastMessage } from './useToast';

// Form data types based on implementation plan
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordFormData {
  email: string;
}

// Auth state types
export interface AuthState {
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

export interface AuthHookReturn {
  authState: AuthState;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  resetPassword: (data: ResetPasswordFormData) => Promise<void>;
  googleAuth: () => Promise<void>;
  clearError: () => void;
}

// Brute force protection
const FAILED_ATTEMPTS_KEY = 'auth_failed_attempts';
const LOCKOUT_KEY = 'auth_lockout_until';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export const useAuth = (): AuthHookReturn => {
  const { showToast } = useToast();
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: false,
    error: null,
    successMessage: null,
  });

  // Clear error message
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }));
  }, []);

  // Check if user is locked out
  const isLockedOut = useCallback((): boolean => {
    const lockoutUntil = localStorage.getItem(LOCKOUT_KEY);
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      return true;
    }
    // Clear expired lockout
    if (lockoutUntil) {
      localStorage.removeItem(LOCKOUT_KEY);
      localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    }
    return false;
  }, []);

  // Handle failed login attempt
  const handleFailedAttempt = useCallback(() => {
    const attempts = parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || '0') + 1;
    localStorage.setItem(FAILED_ATTEMPTS_KEY, attempts.toString());
    
    if (attempts >= MAX_ATTEMPTS) {
      localStorage.setItem(LOCKOUT_KEY, (Date.now() + LOCKOUT_DURATION).toString());
    }
  }, []);

  // Clear failed attempts on successful login
  const clearFailedAttempts = useCallback(() => {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
    localStorage.removeItem(LOCKOUT_KEY);
  }, []);

  // Translate Supabase errors to Polish messages
  const translateError = useCallback((error: AuthError | Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid login credentials') || message.includes('invalid email or password')) {
      return 'Nieprawidłowy email lub hasło';
    }
    if (message.includes('user already registered')) {
      return 'Konto z tym adresem email już istnieje';
    }
    if (message.includes('password should be at least')) {
      return 'Hasło musi mieć co najmniej 8 znaków i zawierać wielką literę, małą literę oraz cyfrę';
    }
    if (message.includes('signup is disabled')) {
      return 'Rejestracja jest obecnie wyłączona';
    }
    if (message.includes('email not confirmed')) {
      return 'Sprawdź swoją skrzynkę email i kliknij link weryfikacyjny';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'Brak połączenia z internetem. Spróbuj ponownie.';
    }
    
    return 'Wystąpił błąd. Spróbuj ponownie później.';
  }, []);

  // Login function
  const login = useCallback(async (data: LoginFormData): Promise<void> => {
    if (isLockedOut()) {
      showToast(authToastMessages.loginTooManyAttempts);
      setAuthState({
        isLoading: false,
        error: 'Zbyt wiele prób. Spróbuj ponownie za 15 minut',
        successMessage: null,
      });
      return;
    }

    setAuthState({ isLoading: true, error: null, successMessage: null });

    try {
      const { data: authData, error } = await supabaseClient.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        handleFailedAttempt();

        // Show specific error messages via toast
        const errorMessage = translateError(error);
        if (errorMessage.includes('Nieprawidłowy email lub hasło')) {
          showToast(authToastMessages.loginError);
        } else if (errorMessage.includes('Zbyt wiele prób')) {
          showToast(authToastMessages.loginTooManyAttempts);
        } else {
          showToast({
            type: 'error',
            title: 'Błąd logowania',
            description: errorMessage,
          });
        }

        throw error;
      }

      if (authData.user && authData.session) {
        clearFailedAttempts();

        // Set remember me cookie if requested
        if (data.rememberMe) {
          document.cookie = `remember_user=true; max-age=${30 * 24 * 60 * 60}; path=/; secure; samesite=strict`;
        }

        // Show success toast and redirect
        showToast(authToastMessages.loginSuccess);
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      }
    } catch (error) {
      setAuthState({
        isLoading: false,
        error: translateError(error as AuthError),
        successMessage: null,
      });
    }
  }, [isLockedOut, handleFailedAttempt, clearFailedAttempts, translateError, showToast]);

  // Register function
  const register = useCallback(async (data: RegisterFormData): Promise<void> => {
    setAuthState({ isLoading: true, error: null, successMessage: null });

    try {
      const { data: authData, error } = await supabaseClient.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const errorMessage = translateError(error);
        if (errorMessage.includes('już istnieje')) {
          showToast(authToastMessages.registerEmailExists);
        } else {
          showToast({
            type: 'error',
            title: 'Błąd rejestracji',
            description: errorMessage,
          });
        }
        throw error;
      }

      if (authData.user) {
        showToast(authToastMessages.registerSuccess);
        setAuthState({
          isLoading: false,
          error: null,
          successMessage: 'Sprawdź swoją skrzynkę email i kliknij link weryfikacyjny, aby aktywować konto.',
        });
      }
    } catch (error) {
      setAuthState({
        isLoading: false,
        error: translateError(error as AuthError),
        successMessage: null,
      });
    }
  }, [translateError, showToast]);

  // Reset password function
  const resetPassword = useCallback(async (data: ResetPasswordFormData): Promise<void> => {
    setAuthState({ isLoading: true, error: null, successMessage: null });

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        showToast(authToastMessages.resetPasswordError);
        throw error;
      }

      showToast(authToastMessages.resetPasswordSuccess);
      setAuthState({
        isLoading: false,
        error: null,
        successMessage: 'Link do resetowania hasła został wysłany na Twój adres email.',
      });
    } catch (error) {
      setAuthState({
        isLoading: false,
        error: translateError(error as AuthError),
        successMessage: null,
      });
    }
  }, [translateError, showToast]);

  // Google OAuth function
  const googleAuth = useCallback(async (): Promise<void> => {
    setAuthState({ isLoading: true, error: null, successMessage: null });

    try {
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        showToast(authToastMessages.googleAuthError);
        throw error;
      }

      // OAuth will redirect, so we don't need to handle success here
    } catch (error) {
      setAuthState({
        isLoading: false,
        error: 'Błąd autoryzacji Google. Spróbuj ponownie.',
        successMessage: null,
      });
    }
  }, [showToast]);

  return {
    authState,
    login,
    register,
    resetPassword,
    googleAuth,
    clearError,
  };
};
