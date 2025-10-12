import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Mail, ArrowLeft } from 'lucide-react';
import { useAuth, type ResetPasswordFormData } from './useAuth';

export interface ResetPasswordFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ onSuccess, onBack }) => {
  const { authState, resetPassword } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ResetPasswordFormData>({
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPassword(data);
      // Success message is handled by useAuth hook
    } catch (error) {
      // Error is handled by useAuth hook
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="reset-email">Adres email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="reset-email"
            type="email"
            placeholder="wprowadź swój email"
            className="pl-10"
            {...register('email', {
              required: 'Email jest wymagany',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Wprowadź prawidłowy adres email',
              },
            })}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Reset Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={authState.isLoading}
      >
        {authState.isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Wysyłanie...</span>
          </div>
        ) : (
          'Wyślij link resetujący'
        )}
      </Button>

      {/* Back to Login Link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Powrót do logowania</span>
        </button>
      </div>
    </form>
  );
};

export default ResetPasswordForm;
