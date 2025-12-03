import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Eye, EyeOff, Mail, Lock, CheckCircle, XCircle } from "lucide-react";
import { useAuth, type RegisterFormData } from "./useAuth";

export interface RegisterFormProps {
  onSuccess: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { authState, register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    };

    const score = Object.values(requirements).filter(Boolean).length;
    return { requirements, score };
  };

  const passwordStrength = getPasswordStrength(password || "");

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data);
      onSuccess();
    } catch {
      // Error is handled by useAuth hook
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-4"
      noValidate
      aria-labelledby="register-form-title"
    >
      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="register-email">Adres email</Label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-3 h-4 w-4 text-gray-400"
            aria-hidden="true"
          />
          <Input
            id="register-email"
            type="email"
            placeholder="wprowadź swój email"
            className="pl-10"
            autoComplete="email"
            aria-describedby={errors.email ? "register-email-error" : undefined}
            aria-invalid={!!errors.email}
            {...register("email", {
              required: "Email jest wymagany",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Wprowadź prawidłowy adres email",
              },
            })}
          />
        </div>
        {errors.email && (
          <p
            id="register-email-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="register-password">Hasło</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="register-password"
            type={showPassword ? "text" : "password"}
            placeholder="utwórz silne hasło"
            className="pl-10 pr-10"
            aria-invalid={!!errors.password}
            {...register("password", {
              required: "Hasło jest wymagane",
              validate: (value) => {
                const { requirements } = getPasswordStrength(value);
                if (!requirements.length)
                  return "Hasło musi mieć co najmniej 8 znaków";
                if (!requirements.uppercase)
                  return "Hasło musi zawierać wielką literę";
                if (!requirements.lowercase)
                  return "Hasło musi zawierać małą literę";
                if (!requirements.number) return "Hasło musi zawierać cyfrę";
                return true;
              },
            })}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        )}

        {/* Password Strength Indicator */}
        {password && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    passwordStrength.score === 4
                      ? "bg-green-500 w-full"
                      : passwordStrength.score === 3
                        ? "bg-yellow-500 w-3/4"
                        : passwordStrength.score === 2
                          ? "bg-orange-500 w-1/2"
                          : "bg-red-500 w-1/4"
                  }`}
                />
              </div>
              <span className="text-xs text-gray-500">
                {passwordStrength.score === 4
                  ? "Silne"
                  : passwordStrength.score === 3
                    ? "Średnie"
                    : passwordStrength.score === 2
                      ? "Słabe"
                      : "Bardzo słabe"}
              </span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex items-center space-x-2">
                {passwordStrength.requirements.length ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    passwordStrength.requirements.length
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  Co najmniej 8 znaków
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {passwordStrength.requirements.uppercase ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    passwordStrength.requirements.uppercase
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  Wielka litera
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {passwordStrength.requirements.lowercase ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    passwordStrength.requirements.lowercase
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  Mała litera
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {passwordStrength.requirements.number ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={
                    passwordStrength.requirements.number
                      ? "text-green-600"
                      : "text-red-600"
                  }
                >
                  Cyfra
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Potwierdź hasło</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="powtórz hasło"
            className="pl-10 pr-10"
            {...register("confirmPassword", {
              required: "Potwierdzenie hasła jest wymagane",
              validate: (value) => {
                if (value !== password) {
                  return "Hasła muszą być identyczne";
                }
                return true;
              },
            })}
          />
          <button
            type="button"
            onClick={toggleConfirmPasswordVisibility}
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label={
              showConfirmPassword
                ? "Ukryj potwierdzenie hasła"
                : "Pokaż potwierdzenie hasła"
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <p className="text-sm text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
        {confirmPassword && password && confirmPassword !== password && (
          <p className="text-sm text-red-600">Hasła muszą być identyczne</p>
        )}
        {confirmPassword &&
          password &&
          confirmPassword === password &&
          confirmPassword.length > 0 && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-sm text-green-600">Hasła są identyczne</p>
            </div>
          )}
      </div>

      {/* Register Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={
          authState.isLoading ||
          passwordStrength.score < 4 ||
          password !== confirmPassword
        }
      >
        {authState.isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Rejestracja...</span>
          </div>
        ) : (
          "Zarejestruj się"
        )}
      </Button>
    </form>
  );
};

export default RegisterForm;
