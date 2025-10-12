import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Toaster } from '../ui/sonner';
import AuthTabs from './AuthTabs';
import ResetPasswordForm from './ResetPasswordForm';
import { useAuth } from './useAuth';

export interface AuthViewProps {
  currentPath: string;
}

const AuthView: React.FC<AuthViewProps> = ({ currentPath }) => {
  const [currentView, setCurrentView] = useState<'auth' | 'reset'>('auth');
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const { authState, clearError } = useAuth();

  // Parse current path to determine view
  useEffect(() => {
    if (currentPath.includes('reset-password')) {
      setCurrentView('reset');
    } else {
      setCurrentView('auth');
      if (currentPath.includes('register')) {
        setActiveTab('register');
      } else {
        setActiveTab('login');
      }
    }
  }, [currentPath]);

  // Handle successful authentication
  const handleAuthSuccess = () => {
    window.location.href = '/dashboard';
  };

  // Handle forgot password click
  const handleForgotPassword = () => {
    setCurrentView('reset');
    window.history.pushState({}, '', '/auth/reset-password');
  };

  // Handle back to login from reset password
  const handleBackToLogin = () => {
    setCurrentView('auth');
    setActiveTab('login');
    window.history.pushState({}, '', '/auth/login');
  };

  // Handle tab change
  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    clearError();
    window.history.pushState({}, '', `/auth/${tab}`);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4"
      role="main"
      aria-label="Strona logowania CycleGear"
    >
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2" id="auth-title">
            CycleGear
          </h1>
          <p className="text-gray-600" id="auth-subtitle">
            Twój asystent rowerowy
          </p>
        </header>

        {/* Main Card */}
        <Card
          className="shadow-xl w-full max-w-md mx-auto"
          role="region"
          aria-labelledby="auth-title"
          aria-describedby="auth-subtitle"
        >
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              {currentView === 'reset' ? 'Resetuj hasło' : activeTab === 'login' ? 'Zaloguj się' : 'Zarejestruj się'}
            </CardTitle>
            <CardDescription className="text-center">
              {currentView === 'reset' 
                ? 'Wprowadź swój adres email, aby otrzymać link do resetowania hasła'
                : activeTab === 'login' 
                ? 'Wprowadź swoje dane, aby się zalogować'
                : 'Utwórz nowe konto, aby rozpocząć'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Error Display */}
            {authState.error && (
              <div
                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"
                role="alert"
                aria-live="polite"
              >
                <p className="text-sm text-red-600">{authState.error}</p>
              </div>
            )}

            {/* Success Message Display */}
            {authState.successMessage && (
              <div
                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm text-green-600">{authState.successMessage}</p>
              </div>
            )}

            {/* Content based on current view */}
            {currentView === 'reset' ? (
              <ResetPasswordForm 
                onSuccess={handleAuthSuccess}
                onBack={handleBackToLogin}
              />
            ) : (
              <AuthTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onAuthSuccess={handleAuthSuccess}
                onForgotPassword={handleForgotPassword}
              />
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Korzystając z CycleGear, akceptujesz nasze{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Warunki użytkowania
            </a>{' '}
            i{' '}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Politykę prywatności
            </a>
          </p>
        </div>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          richColors
          closeButton
        />
      </div>
    </div>
  );
};

export default AuthView;
