import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';
import { supabaseClient } from '../../db/supabase.client';
import { useToast, authToastMessages } from './useToast';

// Mock the modules
vi.mock('../../db/supabase.client');
vi.mock('./useToast');

describe('useAuth', () => {
  const mockSignInWithPassword = vi.mocked(supabaseClient.auth.signInWithPassword);
  const mockSignUp = vi.mocked(supabaseClient.auth.signUp);
  const mockResetPasswordForEmail = vi.mocked(supabaseClient.auth.resetPasswordForEmail);
  const mockSignInWithOAuth = vi.mocked(supabaseClient.auth.signInWithOAuth);
  const mockShowToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock implementations
    vi.mocked(useToast).mockReturnValue({
      showToast: mockShowToast,
      clearToasts: vi.fn(),
    });

    // Clear localStorage
    localStorage.clear();
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { href: 'http://localhost:3000', origin: 'http://localhost:3000' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should successfully login user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockSession = { access_token: 'token', refresh_token: 'refresh' };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false,
        });
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        authToastMessages.loginSuccess
      );
    });

    it('should handle login error', async () => {
      const mockError = { message: 'Invalid login credentials' };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
          rememberMe: false,
        });
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'error' })
      );
    });

    it('should enforce rate limiting after failed attempts', async () => {
      const mockError = { message: 'Invalid login credentials' };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          await result.current.login({
            email: 'wrong@example.com',
            password: 'wrongpassword',
            rememberMe: false,
          });
        });
      }

      // 6th attempt should be blocked
      await act(async () => {
        await result.current.login({
          email: 'wrong@example.com',
          password: 'wrongpassword',
          rememberMe: false,
        });
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Spróbuj ponownie za 15 minut'
        })
      );
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(5); // Only 5 actual API calls
    });
  });

  describe('register', () => {
    it('should successfully register user', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };

      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        });
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'Password123!',
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback',
        },
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });

    it('should handle email already exists error', async () => {
      const mockError = { message: 'User already registered' };

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.register({
          email: 'existing@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
        });
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Email już istnieje'
        })
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully send reset password email', async () => {
      mockResetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.resetPassword({
          email: 'test@example.com',
        });
      });

      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        {
          redirectTo: 'http://localhost:3000/auth/reset-password',
        }
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'success' })
      );
    });
  });

  describe('googleAuth', () => {
    it('should initiate Google OAuth flow', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: { url: 'https://google.com/oauth' },
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.googleAuth();
      });

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/auth/callback',
        },
      });
    });

    it('should handle Google OAuth error', async () => {
      const mockError = { message: 'OAuth error' };

      mockSignInWithOAuth.mockResolvedValue({
        data: null,
        error: mockError,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.googleAuth();
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Błąd autoryzacji Google'
        })
      );
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.clearError();
      });

      expect(result.current.authState.error).toBeNull();
    });
  });
});
